"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacesForCurrentUser, getOrCreateDefaultWorkspace } from "@/lib/queries/workspaces";
import { WORKSPACE_COOKIE_NAME, WORKSPACE_COOKIE_OPTIONS } from "@/lib/workspace-cookie";
import { checkCanCreateWorkspace } from "@/lib/plan-limits";
import { generateCiToken, hashCiToken } from "@/lib/ci-token";
import { getEffectivePlanId } from "@/lib/billing";

const BUSINESS_PLANS = ["business", "enterprise", "governance"] as const;

/**
 * Create the default workspace (if missing), set the cookie and revalidate.
 * Used by the "Preparing your workspace" view on first access.
 */
export async function prepareWorkspaceAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const defaultWs = await getOrCreateDefaultWorkspace();
  if (!defaultWs) return { error: "Unable to create workspace" };

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, defaultWs.id, WORKSPACE_COOKIE_OPTIONS);
  revalidatePath("/dashboard", "layout");
  return {};
}

/**
 * Set the selected workspace (cookie) and revalidate.
 * Allowed only if the workspace is among those accessible (owner or member).
 */
export async function setWorkspaceCookieAction(workspaceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const workspaces = await getWorkspacesForCurrentUser();
  const canAccess = workspaces.some((w) => w.id === workspaceId);
  if (!canAccess) {
    return { error: "You don't have access to this workspace." };
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, workspaceId, WORKSPACE_COOKIE_OPTIONS);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/decisions");
  revalidatePath("/dashboard/workspace");
  return {};
}

export async function createWorkspaceAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const canCreate = await checkCanCreateWorkspace(user.id);
  if (!canCreate.allowed) return { error: canCreate.error };

  const name = (formData.get("name") as string)?.trim() || "New workspace";
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating workspace:", error);
    return { error: "Error creating workspace" };
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, data.id, WORKSPACE_COOKIE_OPTIONS);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspace");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/decisions");
  return { success: true };
}

/**
 * Rename a workspace. Only the owner can do this.
 */
export async function renameWorkspaceAction(
  workspaceId: string,
  name: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = name?.trim();
  if (!trimmed) return { error: "Name cannot be empty" };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws || ws.owner_id !== user.id) {
    return { error: "Only the owner can rename the workspace" };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ name: trimmed })
    .eq("id", workspaceId);

  if (error) {
    console.error("Error renaming workspace:", error);
    return { error: "Error renaming workspace" };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspace");
  return { success: true };
}

export type WorkspaceCiTokenResult =
  | { error: string }
  | { success: true; token: string }
  | { success: true; revoked: true };

/**
 * Generate a new CI token for the workspace (Decision Gate). Owner only.
 * The plain token is returned once; only the hash is stored in DB.
 */
export async function generateWorkspaceCiTokenAction(
  workspaceId: string
): Promise<WorkspaceCiTokenResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws || ws.owner_id !== user.id) {
    return { error: "Only the owner can generate the CI token" };
  }

  const token = generateCiToken();
  const hash = hashCiToken(token);
  const { error } = await supabase
    .from("workspaces")
    .update({
      ci_token_hash: hash,
      ci_token_created_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) {
    return { error: "Error generating CI token" };
  }

  revalidatePath("/dashboard/workspace");
  return { success: true, token };
}

/**
 * Revoke the workspace CI token. Owner only.
 */
export async function revokeWorkspaceCiTokenAction(
  workspaceId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws || ws.owner_id !== user.id) {
    return { error: "Only the owner can revoke the CI token" };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ ci_token_hash: null, ci_token_created_at: null })
    .eq("id", workspaceId);

  if (error) {
    return { error: "Error revoking CI token" };
  }

  revalidatePath("/dashboard/workspace");
  return { success: true };
}

export type UpdateWorkspacePoliciesResult = { error?: string; success?: boolean };

/** Upsert workspace_policies for the given workspace. Only the owner can update. */
export async function updateWorkspacePoliciesAction(
  workspaceId: string,
  data: {
    high_impact: boolean;
    require_linked_pr: boolean;
    require_approved: boolean;
    judge_blocking: boolean;
    judge_tolerance_percent: number | null;
  }
): Promise<UpdateWorkspacePoliciesResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws || ws.owner_id !== user.id) {
    return { error: "Only the owner can update policies" };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", user.id)
    .single();
  const planId = getEffectivePlanId(subscription?.plan_id);
  const canConfigureRequirePolicies = BUSINESS_PLANS.includes(planId);

  const tolerance =
    data.judge_tolerance_percent != null && data.judge_tolerance_percent >= 0 && data.judge_tolerance_percent <= 100
      ? data.judge_tolerance_percent
      : null;

  const { error } = await supabase.from("workspace_policies").upsert(
    {
      workspace_id: workspaceId,
      high_impact: data.high_impact,
      // Business+ only: Team/Free cannot persist require policy toggles.
      require_linked_pr: canConfigureRequirePolicies ? data.require_linked_pr : false,
      require_approved: canConfigureRequirePolicies ? data.require_approved : true,
      judge_blocking: data.judge_blocking,
      judge_tolerance_percent: tolerance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );

  if (error) {
    console.error("Error updating workspace policies:", error);
    return { error: "Error saving policies" };
  }

  revalidatePath("/dashboard/workspace");
  return { success: true };
}
