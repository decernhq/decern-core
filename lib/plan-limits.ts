"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlanLimits } from "@/types/billing";

const UNLIMITED = -1;

/**
 * Returns the effective limits for the user (from DB: plans + subscription).
 * If no active subscription, returns Free plan limits.
 */
export async function getPlanLimits(userId: string): Promise<PlanLimits | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_plan_limits", {
    p_user_id: userId,
  });
  if (error || !data?.length) return null;
  const row = data[0];
  return {
    workspaces_limit: row.workspaces_limit ?? 1,
    users_per_workspace_limit: row.users_per_workspace_limit ?? 3,
  };
}

function withinLimit(limit: number, current: number): boolean {
  if (limit === UNLIMITED) return true;
  return current < limit;
}

/**
 * Check if the user can create another workspace (based on workspaces they own).
 */
export async function checkCanCreateWorkspace(userId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const limits = await getPlanLimits(userId);
  if (!limits) return { allowed: false, error: "Unable to verify plan limits" };

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (error) return { allowed: false, error: "Verification error" };
  const current = count ?? 0;

  if (!withinLimit(limits.workspaces_limit, current)) {
    return {
      allowed: false,
      error: "The Free plan allows one workspace. Upgrade to Enterprise to create more.",
    };
  }
  return { allowed: true };
}

/**
 * Count workspace members (owner + workspace_members).
 */
async function countWorkspaceMembers(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const ws = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return 0;

  const { count, error } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) return 0;
  return (count ?? 0) + 1; // +1 for owner
}

/**
 * Check if we can invite another user to the workspace.
 */
export async function checkCanInviteToWorkspace(
  workspaceOwnerId: string,
  workspaceId: string
): Promise<{ allowed: boolean; error?: string }> {
  const limits = await getPlanLimits(workspaceOwnerId);
  if (!limits) return { allowed: false, error: "Unable to verify plan limits" };

  const current = await countWorkspaceMembers(workspaceId);
  if (!withinLimit(limits.users_per_workspace_limit, current)) {
    return {
      allowed: false,
      error: `Your plan allows up to ${limits.users_per_workspace_limit} users per workspace. Upgrade to Enterprise for unlimited.`,
    };
  }
  return { allowed: true };
}
