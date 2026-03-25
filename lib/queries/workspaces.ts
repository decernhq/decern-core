import { createClient } from "@/lib/supabase/server";
import type { Profile, Workspace } from "@/types/database";
import type { WorkspaceAccessRole, WorkspaceDecisionRole } from "@/lib/workspace-roles";

export type WorkspaceMemberWithProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  workspace_role: WorkspaceAccessRole;
  decision_role: WorkspaceDecisionRole;
};

export type WorkspaceInvitationPending = {
  id: string;
  email: string;
  workspace_role: WorkspaceAccessRole;
  decision_role: WorkspaceDecisionRole;
  token: string;
  expires_at: string;
  created_at: string;
};

/**
 * Get default workspace for current user (the one they own). Creates one if missing.
 */
export async function getOrCreateDefaultWorkspace(): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!data) {
    const { data: inserted } = await supabase
      .from("workspaces")
      .insert({ owner_id: user.id, name: "Mio workspace" })
      .select()
      .single();
    data = inserted;
  }

  return data;
}

/**
 * Get workspace by id (must be accessible by current user)
 */
export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

/**
 * Lista completa di tutti i workspace che l'utente può vedere (owner o member), in ordine di creazione.
 * Usare per mostrare la lista in sidebar / pagina workspace.
 */
export async function getAllWorkspacesForCurrentUser(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: owned } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const memberIds = (memberRows ?? []).map((r) => r.workspace_id).filter(Boolean);
  let allWorkspaces: Workspace[] = owned ?? [];

  if (memberIds.length > 0) {
    const { data: memberWorkspaces } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", memberIds);
    const memberList = memberWorkspaces ?? [];
    const seen = new Set(allWorkspaces.map((w) => w.id));
    for (const w of memberList) {
      if (!seen.has(w.id)) {
        seen.add(w.id);
        allWorkspaces.push(w);
      }
    }
  }

  return allWorkspaces.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Workspaces the current user can access (owned + memberships).
 * Used for workspace cookie selection and switch validation.
 */
export async function getWorkspacesForCurrentUser(): Promise<Workspace[]> {
  return getAllWorkspacesForCurrentUser();
}

/**
 * Count workspaces owned by current user (for plan limit)
 */
export async function countWorkspacesOwnedByCurrentUser(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if (error) return 0;
  return count ?? 0;
}

/**
 * Get workspace members with profile info
 */
export async function getWorkspaceMembersWithProfiles(
  workspaceId: string
): Promise<WorkspaceMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, workspace_role, decision_role, profiles(email, full_name)")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Error fetching workspace members:", error);
    return [];
  }

  type Row = {
    user_id: string;
    workspace_role: WorkspaceAccessRole;
    decision_role: WorkspaceDecisionRole;
    profiles: Pick<Profile, "email" | "full_name"> | Pick<Profile, "email" | "full_name">[] | null;
  };
  return (data || []).map((row: Row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id,
      email: profile?.email ?? "",
      full_name: profile?.full_name ?? null,
      workspace_role: row.workspace_role,
      decision_role: row.decision_role,
    };
  });
}

/**
 * Get pending invitations for a workspace
 */
export async function getWorkspaceInvitationsPending(
  workspaceId: string
): Promise<WorkspaceInvitationPending[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("id, email, workspace_role, decision_role, token, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace invitations:", error);
    return [];
  }
  return data || [];
}

/**
 * Get workspace invitation by token (for accept page). Uses RPC.
 */
export async function getWorkspaceInvitationByToken(token: string): Promise<{
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  workspace_role: WorkspaceAccessRole;
  decision_role: WorkspaceDecisionRole;
  expires_at: string;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_workspace_invitation_by_token", {
    tok: token,
  });

  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    workspace_name: row.workspace_name,
    email: row.email,
    workspace_role: row.workspace_role,
    decision_role: row.decision_role,
    expires_at: row.expires_at,
  };
}
