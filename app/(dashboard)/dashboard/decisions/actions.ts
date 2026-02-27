"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkCanCreateDecision } from "@/lib/plan-limits";

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

  // Parse options (one per line)
  const options = optionsRaw
    ? optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)
    : [];

  // Parse tags (comma-separated)
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    : [];

  // Parse external links (one per line: "label | url" or just "url")
  const external_links = parseExternalLinks(externalLinksRaw);
  const pull_request_urls = pullRequestUrlsRaw
    ? pullRequestUrlsRaw.split("\n").map((u) => u.trim()).filter(Boolean)
    : [];
  const linked_decision_id = linkedDecisionIdRaw?.trim() || null;

  const { error } = await supabase.from("decisions").insert({
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
  });

  if (error) {
    console.error("Error creating decision:", error);
    return { error: "Error creating decision" };
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

  if (!decisionId) {
    return { error: "Missing decision ID" };
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Invalid status" };
  }

  const { error } = await supabase
    .from("decisions")
    .update({ status })
    .eq("id", decisionId);

  if (error) {
    console.error("Error updating decision status:", error);
    return { error: "Error updating status" };
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/decisions/${decisionId}`);
  return { success: true };
}

export async function deleteDecisionAction(id: string): Promise<ActionState> {
  const supabase = await createClient();

  // Get decision to know project_id for revalidation
  const { data: decision } = await supabase
    .from("decisions")
    .select("project_id")
    .eq("id", id)
    .single();

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

