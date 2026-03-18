"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkCanCreateDecision } from "@/lib/plan-limits";
import {
  createOrUpdateFile,
  deleteFile,
  getFileContent,
} from "@/lib/github/client";
import { formatAdrMarkdown, adrFilename } from "@/lib/github/adr-formatter";

function parseExternalLinks(raw: string | null | undefined): { url: string; label?: string }[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const sep = " | ";
      const idx = line.indexOf(sep);
      if (idx !== -1) {
        const label = line.slice(0, idx).trim();
        const url = line.slice(idx + sep.length).trim();
        return url ? { url, label: label || undefined } : null;
      }
      return line.startsWith("http") ? { url: line } : null;
    })
    .filter((l): l is { url: string; label?: string } => l !== null);
}

export type ActionState = {
  error?: string;
  success?: boolean;
};

async function getGitHubTokenForUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("github_connections")
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.access_token ?? null;
}

async function getProjectGitHub(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("github_repo_full_name, github_default_branch, workspace_id, owner_id:workspaces(owner_id)")
    .eq("id", projectId)
    .single();
  return data;
}

export async function createDecisionAction(
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

  const projectId = formData.get("project_id") as string;
  const title = formData.get("title") as string;
  const status = formData.get("status") as string;
  const context = formData.get("context") as string;
  const optionsRaw = formData.get("options") as string;
  const decision = formData.get("decision") as string;
  const consequences = formData.get("consequences") as string;
  const tagsRaw = formData.get("tags") as string;
  const externalLinksRaw = formData.get("external_links") as string;
  const pullRequestUrlsRaw = formData.get("pull_request_urls") as string | null;
  const linkedDecisionIdRaw = formData.get("linked_decision_id") as string | null;

  if (!projectId) {
    return { error: "Select a project" };
  }

  const project = await supabase.from("projects").select("workspace_id").eq("id", projectId).single();
  if (project.error || !project.data) return { error: "Project not found" };
  const workspaceId = project.data.workspace_id;

  const ws = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return { error: "Workspace not found" };
  const canCreate = await checkCanCreateDecision(ws.data.owner_id, workspaceId);
  if (!canCreate.allowed) return { error: canCreate.error };

  if (!title || title.trim().length === 0) {
    return { error: "Title is required" };
  }

  const options = optionsRaw
    ? optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)
    : [];

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    : [];

  const external_links = parseExternalLinks(externalLinksRaw);
  const pull_request_urls = pullRequestUrlsRaw
    ? pullRequestUrlsRaw.split("\n").map((u) => u.trim()).filter(Boolean)
    : [];
  const linked_decision_id = linkedDecisionIdRaw?.trim() || null;

  // 1. Insert into Supabase (trigger generates adr_ref + workspace_id)
  const { data: inserted, error } = await supabase.from("decisions").insert({
    project_id: projectId,
    title: title.trim(),
    status: status as "proposed" | "approved" | "superseded" | "rejected",
    context: context?.trim() || "",
    options,
    decision: decision?.trim() || "",
    consequences: consequences?.trim() || "",
    tags,
    external_links,
    pull_request_urls,
    linked_decision_id,
    created_by: user.id,
  }).select("id, adr_ref").single();

  if (error || !inserted) {
    console.error("Error creating decision:", error);
    return { error: "Error creating decision" };
  }

  // 2. Commit ADR file to GitHub
  const projectInfo = await supabase
    .from("projects")
    .select("github_repo_full_name, github_default_branch")
    .eq("id", projectId)
    .single();

  if (projectInfo.data?.github_repo_full_name) {
    const token = await getGitHubTokenForUser(user.id);
    if (token) {
      try {
        const markdown = formatAdrMarkdown({
          title: title.trim(),
          status: status || "proposed",
          tags,
          context: context?.trim() || "",
          options,
          decision: decision?.trim() || "",
          consequences: consequences?.trim() || "",
          pullRequestUrls: pull_request_urls,
          externalLinks: external_links,
          supersedes: linked_decision_id ? null : null,
        });

        const filePath = adrFilename(inserted.adr_ref, title.trim());
        await createOrUpdateFile(
          token,
          projectInfo.data.github_repo_full_name,
          filePath,
          markdown,
          `docs: add ${inserted.adr_ref} - ${title.trim()}`,
          undefined,
          projectInfo.data.github_default_branch || undefined
        );
      } catch (err) {
        console.error("Error committing ADR to GitHub:", err);
        // Decision is saved in Supabase cache; GitHub commit failed.
        // Don't fail the action—user can retry via webhook sync.
      }
    }
  }

  if (linked_decision_id) {
    await supabase
      .from("decisions")
      .update({ status: "superseded" })
      .eq("id", linked_decision_id);
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/projects/${projectId}`);
  if (linked_decision_id) revalidatePath(`/dashboard/decisions/${linked_decision_id}`);
  redirect("/dashboard/decisions");
}

export async function updateDecisionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const status = formData.get("status") as string;
  const context = formData.get("context") as string;
  const optionsRaw = formData.get("options") as string;
  const decision = formData.get("decision") as string;
  const consequences = formData.get("consequences") as string;
  const tagsRaw = formData.get("tags") as string;
  const externalLinksRaw = formData.get("external_links") as string;
  const pullRequestUrlsRaw = formData.get("pull_request_urls") as string | null;
  const linkedDecisionIdRaw = formData.get("linked_decision_id") as string | null;

  if (!id) {
    return { error: "Missing decision ID" };
  }

  if (!title || title.trim().length === 0) {
    return { error: "Title is required" };
  }

  const options = optionsRaw
    ? optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)
    : [];

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    : [];

  const external_links = parseExternalLinks(externalLinksRaw);
  const pull_request_urls = pullRequestUrlsRaw
    ? pullRequestUrlsRaw.split("\n").map((u) => u.trim()).filter(Boolean)
    : [];
  const linked_decision_id = linkedDecisionIdRaw?.trim() || null;

  // Get existing decision for adr_ref and project info
  const { data: existing } = await supabase
    .from("decisions")
    .select("adr_ref, title, project_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Decision not found" };

  // 1. Update Supabase cache
  const { error } = await supabase
    .from("decisions")
    .update({
      title: title.trim(),
      status: status as "proposed" | "approved" | "superseded" | "rejected",
      context: context?.trim() || "",
      options,
      decision: decision?.trim() || "",
      consequences: consequences?.trim() || "",
      tags,
      external_links,
      pull_request_urls,
      linked_decision_id,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating decision:", error);
    return { error: "Error updating decision" };
  }

  // 2. Update file on GitHub
  const projectInfo = await supabase
    .from("projects")
    .select("github_repo_full_name, github_default_branch")
    .eq("id", existing.project_id)
    .single();

  if (projectInfo.data?.github_repo_full_name) {
    const token = await getGitHubTokenForUser(user.id);
    if (token) {
      try {
        const oldPath = adrFilename(existing.adr_ref, existing.title);
        const newPath = adrFilename(existing.adr_ref, title.trim());
        const branch = projectInfo.data.github_default_branch || undefined;
        const repo = projectInfo.data.github_repo_full_name;

        const markdown = formatAdrMarkdown({
          title: title.trim(),
          status: status || "proposed",
          tags,
          context: context?.trim() || "",
          options,
          decision: decision?.trim() || "",
          consequences: consequences?.trim() || "",
          pullRequestUrls: pull_request_urls,
          externalLinks: external_links,
          supersedes: null,
        });

        // If title changed, delete old file and create new one
        if (oldPath !== newPath) {
          try {
            const old = await getFileContent(token, repo, oldPath, branch);
            await deleteFile(token, repo, oldPath, old.sha, `docs: rename ${existing.adr_ref}`, branch);
          } catch {
            // Old file may not exist
          }
          await createOrUpdateFile(token, repo, newPath, markdown, `docs: update ${existing.adr_ref} - ${title.trim()}`, undefined, branch);
        } else {
          try {
            const current = await getFileContent(token, repo, newPath, branch);
            await createOrUpdateFile(token, repo, newPath, markdown, `docs: update ${existing.adr_ref} - ${title.trim()}`, current.sha, branch);
          } catch {
            await createOrUpdateFile(token, repo, newPath, markdown, `docs: update ${existing.adr_ref} - ${title.trim()}`, undefined, branch);
          }
        }
      } catch (err) {
        console.error("Error updating ADR on GitHub:", err);
      }
    }
  }

  if (linked_decision_id) {
    await supabase
      .from("decisions")
      .update({ status: "superseded" })
      .eq("id", linked_decision_id);
    revalidatePath(`/dashboard/decisions/${linked_decision_id}`);
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/decisions/${id}`);
  return { success: true };
}

const VALID_STATUSES = ["proposed", "approved", "superseded", "rejected"] as const;

export async function updateDecisionStatusAction(
  decisionId: string,
  status: string
): Promise<ActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!decisionId) {
    return { error: "Missing decision ID" };
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Invalid status" };
  }

  // Get existing decision for GitHub update
  const { data: existing } = await supabase
    .from("decisions")
    .select("adr_ref, title, project_id, context, options, decision, consequences, tags, external_links, pull_request_urls")
    .eq("id", decisionId)
    .single();

  // 1. Update Supabase cache
  const { error } = await supabase
    .from("decisions")
    .update({ status })
    .eq("id", decisionId);

  if (error) {
    console.error("Error updating decision status:", error);
    return { error: "Error updating status" };
  }

  // 2. Update status line in GitHub file
  if (existing) {
    const projectInfo = await supabase
      .from("projects")
      .select("github_repo_full_name, github_default_branch")
      .eq("id", existing.project_id)
      .single();

    if (projectInfo.data?.github_repo_full_name) {
      const token = await getGitHubTokenForUser(user.id);
      if (token) {
        try {
          const filePath = adrFilename(existing.adr_ref, existing.title);
          const repo = projectInfo.data.github_repo_full_name;
          const branch = projectInfo.data.github_default_branch || undefined;

          const markdown = formatAdrMarkdown({
            title: existing.title,
            status,
            tags: existing.tags || [],
            context: existing.context || "",
            options: existing.options || [],
            decision: existing.decision || "",
            consequences: existing.consequences || "",
            pullRequestUrls: existing.pull_request_urls || [],
            externalLinks: (existing.external_links || []) as { url: string; label?: string }[],
            supersedes: null,
          });

          try {
            const current = await getFileContent(token, repo, filePath, branch);
            await createOrUpdateFile(token, repo, filePath, markdown, `docs: ${status} ${existing.adr_ref}`, current.sha, branch);
          } catch {
            await createOrUpdateFile(token, repo, filePath, markdown, `docs: ${status} ${existing.adr_ref}`, undefined, branch);
          }
        } catch (err) {
          console.error("Error updating ADR status on GitHub:", err);
        }
      }
    }
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/decisions/${decisionId}`);
  return { success: true };
}

export async function deleteDecisionAction(id: string): Promise<ActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: decision } = await supabase
    .from("decisions")
    .select("project_id, adr_ref, title")
    .eq("id", id)
    .single();

  // 1. Delete file from GitHub
  if (decision) {
    const projectInfo = await supabase
      .from("projects")
      .select("github_repo_full_name, github_default_branch")
      .eq("id", decision.project_id)
      .single();

    if (projectInfo.data?.github_repo_full_name) {
      const token = await getGitHubTokenForUser(user.id);
      if (token) {
        try {
          const filePath = adrFilename(decision.adr_ref, decision.title);
          const repo = projectInfo.data.github_repo_full_name;
          const branch = projectInfo.data.github_default_branch || undefined;
          const current = await getFileContent(token, repo, filePath, branch);
          await deleteFile(token, repo, filePath, current.sha, `docs: remove ${decision.adr_ref} - ${decision.title}`, branch);
        } catch (err) {
          console.error("Error deleting ADR from GitHub:", err);
        }
      }
    }
  }

  // 2. Delete from Supabase cache
  const { error } = await supabase.from("decisions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting decision:", error);
    return { error: "Error deleting decision" };
  }

  revalidatePath("/dashboard/decisions");
  if (decision?.project_id) {
    revalidatePath(`/dashboard/projects/${decision.project_id}`);
  }
  redirect("/dashboard/decisions");
}

