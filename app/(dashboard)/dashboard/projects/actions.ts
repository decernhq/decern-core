"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/queries/workspaces";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { checkCanCreateProject } from "@/lib/plan-limits";
import { getEffectivePlanId } from "@/lib/billing";
import {
  normalizeWorkspaceDecisionRole,
  supportsWorkspaceRoles,
} from "@/lib/workspace-roles";
import { ensureAdrFolder } from "@/lib/github/client";
import { syncAdrFromRepo } from "@/lib/github/sync";

export type ActionState = {
  error?: string;
  success?: boolean;
};

type ProjectCreationAccess = {
  allowed: boolean;
  workspaceOwnerId: string | null;
};

async function getProjectCreationAccess(
  workspaceId: string,
  userId: string
): Promise<ProjectCreationAccess> {
  const supabase = await createClient();
  const ws = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (ws.error || !ws.data) return { allowed: false, workspaceOwnerId: null };

  if (ws.data.owner_id === userId) {
    return { allowed: true, workspaceOwnerId: ws.data.owner_id };
  }

  const [{ data: subscription }, { data: member }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", ws.data.owner_id)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("decision_role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!member) return { allowed: false, workspaceOwnerId: ws.data.owner_id };

  const rolesEnabled = supportsWorkspaceRoles(getEffectivePlanId(subscription?.plan_id));
  if (!rolesEnabled) return { allowed: true, workspaceOwnerId: ws.data.owner_id };

  return {
    allowed: normalizeWorkspaceDecisionRole(member.decision_role) !== "viewer",
    workspaceOwnerId: ws.data.owner_id,
  };
}

async function getGitHubToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("github_connections")
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.access_token ?? null;
}

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const githubRepoFullName = (formData.get("github_repo_full_name") as string)?.trim() || null;
  const githubDefaultBranch = (formData.get("github_default_branch") as string)?.trim() || "main";

  if (!name || name.trim().length === 0) {
    return { error: "Project name is required" };
  }

  let workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) {
    const w = await getOrCreateDefaultWorkspace();
    workspaceId = w?.id ?? null;
  }
  if (!workspaceId) return { error: "Workspace not available" };

  const projectAccess = await getProjectCreationAccess(workspaceId, user.id);
  if (!projectAccess.workspaceOwnerId) return { error: "Workspace not found" };
  if (!projectAccess.allowed) {
    return { error: "You don't have permission to create projects in this workspace." };
  }

  const canCreate = await checkCanCreateProject(projectAccess.workspaceOwnerId, workspaceId);
  if (!canCreate.allowed) return { error: canCreate.error };

  // If a GitHub repo was selected, ensure the /adr/ folder exists
  if (githubRepoFullName) {
    const token = await getGitHubToken(user.id);
    if (!token) return { error: "GitHub not connected. Go to Settings to connect." };

    try {
      await ensureAdrFolder(token, githubRepoFullName, githubDefaultBranch);
    } catch (err) {
      console.error("Error ensuring /adr folder:", err);
      return { error: "Failed to initialize /adr folder in GitHub repo" };
    }
  }

  const insertPayload = {
    name: name.trim(),
    description: description?.trim() || null,
    owner_id: user.id,
    workspace_id: workspaceId,
    github_repo_full_name: githubRepoFullName,
    github_default_branch: githubRepoFullName ? githubDefaultBranch : null,
  };

  // Without GitHub repo we don't need RETURNING — avoids RSC/PostgREST edge cases where
  // .single() fails even though the row was inserted.
  console.log("[createProject] payload:", JSON.stringify(insertPayload));
  console.log("[createProject] githubRepoFullName:", JSON.stringify(githubRepoFullName));

  if (!githubRepoFullName) {
    const { error, status, statusText } = await supabase.from("projects").insert(insertPayload);
    console.log("[createProject] insert result:", { error, status, statusText });
    if (error) {
      console.error("[createProject] INSERT ERROR:", JSON.stringify(error, null, 2));
      if (error.code === "42501") {
        return { error: "Non hai permesso di creare progetti in questo workspace." };
      }
      if (error.code === "23503") {
        return { error: "Profilo utente non trovato. Prova a uscire e accedere di nuovo." };
      }
      return { error: `Error creating project: ${error.message} (code: ${error.code})` };
    }
  } else {
    const { data: rows, error } = await supabase
      .from("projects")
      .insert(insertPayload)
      .select("id");

    const inserted = rows?.[0];
    if (error || !inserted) {
      console.error("Error creating project:", error);
      return { error: "Error creating project" };
    }

    const token = await getGitHubToken(user.id);
    if (token) {
      try {
        await syncAdrFromRepo(
          token,
          githubRepoFullName,
          githubDefaultBranch,
          inserted.id,
          workspaceId
        );
      } catch (err) {
        console.error("Error during initial ADR sync:", err);
      }
    }
  }

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

export async function updateProjectAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const githubRepoFullName = (formData.get("github_repo_full_name") as string)?.trim() || null;
  const githubDefaultBranch = (formData.get("github_default_branch") as string)?.trim() || "main";

  if (!id) {
    return { error: "Missing project ID" };
  }

  if (!name || name.trim().length === 0) {
    return { error: "Project name is required" };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      github_repo_full_name: githubRepoFullName,
      github_default_branch: githubDefaultBranch,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating project:", error);
    return { error: "Error updating project" };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  return { success: true };
}

export async function deleteProjectAction(id: string): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("Error deleting project:", error);
    return { error: "Error deleting project" };
  }

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

