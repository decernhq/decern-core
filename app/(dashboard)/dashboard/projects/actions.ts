"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/queries/workspaces";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { checkCanCreateProject } from "@/lib/plan-limits";
import { ensureAdrFolder } from "@/lib/github/client";
import { syncAdrFromRepo } from "@/lib/github/sync";

export type ActionState = {
  error?: string;
  success?: boolean;
};

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

  const ws = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return { error: "Workspace not found" };
  const canCreate = await checkCanCreateProject(ws.data.owner_id, workspaceId);
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

  const { data: inserted, error } = await supabase.from("projects").insert({
    name: name.trim(),
    description: description?.trim() || null,
    owner_id: user.id,
    workspace_id: workspaceId,
    github_repo_full_name: githubRepoFullName,
    github_default_branch: githubRepoFullName ? githubDefaultBranch : null,
  }).select("id").single();

  if (error || !inserted) {
    console.error("Error creating project:", error);
    return { error: "Error creating project" };
  }

  // Import any existing ADR files from the repo
  if (githubRepoFullName) {
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

