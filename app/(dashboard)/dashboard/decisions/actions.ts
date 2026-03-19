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
import {
  formatAdrMarkdown,
  adrFilename,
  adrCommitMessageCreate,
  adrCommitMessageUpdate,
  adrCommitMessageRename,
  adrCommitMessageStatus,
  adrCommitMessageDelete,
} from "@/lib/github/adr-formatter";
import {
  prepareDecisionData,
  isValidDecisionStatus,
  type ExternalLink,
} from "../../../../protocol/src/models/decision";

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

function resolveAdrAuthor(user: { email?: string | null; user_metadata?: { full_name?: string | null } | null }): string {
  const fullName = user.user_metadata?.full_name?.trim();
  if (fullName) return fullName;
  const email = user.email?.trim();
  return email || "Unknown";
}

function resolveAdrDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
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
  const adrAuthor = resolveAdrAuthor(user);

  const projectId = formData.get("project_id") as string;
  if (!projectId) {
    return { error: "Select a project" };
  }

  const prepared = prepareDecisionData({
    title: formData.get("title") as string,
    status: formData.get("status") as string,
    context: formData.get("context") as string,
    options: formData.get("options") as string,
    decision: formData.get("decision") as string,
    consequences: formData.get("consequences") as string,
    tags: formData.get("tags") as string,
    externalLinks: formData.get("external_links") as string,
    pullRequestUrls: formData.get("pull_request_urls") as string | null,
    linkedDecisionId: formData.get("linked_decision_id") as string | null,
  });
  if (!prepared.ok) return { error: prepared.error };
  const d = prepared.data;

  const project = await supabase.from("projects").select("workspace_id").eq("id", projectId).single();
  if (project.error || !project.data) return { error: "Project not found" };
  const workspaceId = project.data.workspace_id;

  const ws = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return { error: "Workspace not found" };
  const canCreate = await checkCanCreateDecision(ws.data.owner_id, workspaceId);
  if (!canCreate.allowed) return { error: canCreate.error };

  const { data: inserted, error } = await supabase.from("decisions").insert({
    project_id: projectId,
    title: d.title,
    status: d.status,
    context: d.context,
    options: d.options,
    decision: d.decision,
    consequences: d.consequences,
    tags: d.tags,
    external_links: d.externalLinks,
    pull_request_urls: d.pullRequestUrls,
    linked_decision_id: d.linkedDecisionId,
    created_by: user.id,
  }).select("id, adr_ref, created_at").single();

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
          title: d.title,
          status: d.status,
          author: adrAuthor,
          date: resolveAdrDate(inserted.created_at),
          tags: d.tags,
          context: d.context,
          options: d.options,
          decision: d.decision,
          consequences: d.consequences,
          pullRequestUrls: d.pullRequestUrls,
          externalLinks: d.externalLinks,
          supersedes: null,
        });

        const filePath = adrFilename(inserted.adr_ref, d.title);
        await createOrUpdateFile(
          token,
          projectInfo.data.github_repo_full_name,
          filePath,
          markdown,
          adrCommitMessageCreate(inserted.adr_ref, d.title),
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

  if (d.linkedDecisionId) {
    await supabase
      .from("decisions")
      .update({ status: "superseded" })
      .eq("id", d.linkedDecisionId);
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/projects/${projectId}`);
  if (d.linkedDecisionId) revalidatePath(`/dashboard/decisions/${d.linkedDecisionId}`);
  redirect("/dashboard/decisions");
}

export async function updateDecisionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const adrAuthor = resolveAdrAuthor(user);

  const id = formData.get("id") as string;
  if (!id) {
    return { error: "Missing decision ID" };
  }

  const prepared = prepareDecisionData({
    title: formData.get("title") as string,
    status: formData.get("status") as string,
    context: formData.get("context") as string,
    options: formData.get("options") as string,
    decision: formData.get("decision") as string,
    consequences: formData.get("consequences") as string,
    tags: formData.get("tags") as string,
    externalLinks: formData.get("external_links") as string,
    pullRequestUrls: formData.get("pull_request_urls") as string | null,
    linkedDecisionId: formData.get("linked_decision_id") as string | null,
  });
  if (!prepared.ok) return { error: prepared.error };
  const d = prepared.data;

  // Get existing decision for adr_ref and project info
  const { data: existing } = await supabase
    .from("decisions")
    .select("adr_ref, title, project_id, created_at")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Decision not found" };

  const { error } = await supabase
    .from("decisions")
    .update({
      title: d.title,
      status: d.status,
      context: d.context,
      options: d.options,
      decision: d.decision,
      consequences: d.consequences,
      tags: d.tags,
      external_links: d.externalLinks,
      pull_request_urls: d.pullRequestUrls,
      linked_decision_id: d.linkedDecisionId,
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
        const newPath = adrFilename(existing.adr_ref, d.title);
        const branch = projectInfo.data.github_default_branch || undefined;
        const repo = projectInfo.data.github_repo_full_name;

        const markdown = formatAdrMarkdown({
          title: d.title,
          status: d.status,
          author: adrAuthor,
          date: resolveAdrDate(existing.created_at),
          tags: d.tags,
          context: d.context,
          options: d.options,
          decision: d.decision,
          consequences: d.consequences,
          pullRequestUrls: d.pullRequestUrls,
          externalLinks: d.externalLinks,
          supersedes: null,
        });

        if (oldPath !== newPath) {
          try {
            const old = await getFileContent(token, repo, oldPath, branch);
            await deleteFile(token, repo, oldPath, old.sha, adrCommitMessageRename(existing.adr_ref), branch);
          } catch {
            // Old file may not exist
          }
          await createOrUpdateFile(token, repo, newPath, markdown, adrCommitMessageUpdate(existing.adr_ref, d.title), undefined, branch);
        } else {
          try {
            const current = await getFileContent(token, repo, newPath, branch);
            await createOrUpdateFile(token, repo, newPath, markdown, adrCommitMessageUpdate(existing.adr_ref, d.title), current.sha, branch);
          } catch {
            await createOrUpdateFile(token, repo, newPath, markdown, adrCommitMessageUpdate(existing.adr_ref, d.title), undefined, branch);
          }
        }
      } catch (err) {
        console.error("Error updating ADR on GitHub:", err);
      }
    }
  }

  if (d.linkedDecisionId) {
    await supabase
      .from("decisions")
      .update({ status: "superseded" })
      .eq("id", d.linkedDecisionId);
    revalidatePath(`/dashboard/decisions/${d.linkedDecisionId}`);
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/decisions/${id}`);
  return { success: true };
}

export async function updateDecisionStatusAction(
  decisionId: string,
  status: string
): Promise<ActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const adrAuthor = resolveAdrAuthor(user);

  if (!decisionId) {
    return { error: "Missing decision ID" };
  }
  if (!isValidDecisionStatus(status)) {
    return { error: "Invalid status" };
  }

  // Get existing decision for GitHub update
  const { data: existing } = await supabase
    .from("decisions")
    .select("adr_ref, title, project_id, context, options, decision, consequences, tags, external_links, pull_request_urls, created_at")
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
            author: adrAuthor,
            date: resolveAdrDate(existing.created_at),
            tags: existing.tags || [],
            context: existing.context || "",
            options: existing.options || [],
            decision: existing.decision || "",
            consequences: existing.consequences || "",
            pullRequestUrls: existing.pull_request_urls || [],
            externalLinks: (existing.external_links || []) as ExternalLink[],
            supersedes: null,
          });

          const commitMsg = adrCommitMessageStatus(existing.adr_ref, status);
          try {
            const current = await getFileContent(token, repo, filePath, branch);
            await createOrUpdateFile(token, repo, filePath, markdown, commitMsg, current.sha, branch);
          } catch {
            await createOrUpdateFile(token, repo, filePath, markdown, commitMsg, undefined, branch);
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
          await deleteFile(token, repo, filePath, current.sha, adrCommitMessageDelete(decision.adr_ref, decision.title), branch);
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

