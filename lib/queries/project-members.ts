import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export type ProjectMemberWithProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
};

export type ProjectInvitationPending = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  created_at: string;
};

/**
 * Get project members (excluding owner) with their profile info
 */
export async function getProjectMembersWithProfiles(
  projectId: string
): Promise<ProjectMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("user_id, profiles(email, full_name)")
    .eq("project_id", projectId);

  if (error) {
    console.error("Error fetching project members:", error);
    return [];
  }

  type Row = {
    user_id: string;
    profiles: Pick<Profile, "email" | "full_name"> | Pick<Profile, "email" | "full_name">[] | null;
  };
  return (data || []).map((row: Row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id,
      email: profile?.email ?? "",
      full_name: profile?.full_name ?? null,
    };
  });
}

/**
 * Get pending invitations for a project
 */
export async function getProjectInvitationsPending(
  projectId: string
): Promise<ProjectInvitationPending[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_invitations")
    .select("id, email, token, expires_at, created_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching project invitations:", error);
    return [];
  }

  return data || [];
}

/**
 * Get invitation details by token (for accept page). Uses RPC so it works before login.
 */
export async function getInvitationByToken(token: string): Promise<{
  id: string;
  project_id: string;
  project_name: string;
  email: string;
  expires_at: string;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation_by_token", {
    tok: token,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    id: row.id,
    project_id: row.project_id,
    project_name: row.project_name,
    email: row.email,
    expires_at: row.expires_at,
  };
}
