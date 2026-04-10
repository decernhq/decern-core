"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getEffectivePlanId } from "@/lib/billing";
import { getWorkspaceInvitationByToken } from "@/lib/queries/workspaces";
import { checkCanInviteToWorkspace } from "@/lib/plan-limits";
import {
  normalizeWorkspaceAccessRole,
  normalizeWorkspaceDecisionRole,
  supportsWorkspaceRoles,
  type WorkspaceAccessRole,
  type WorkspaceDecisionRole,
} from "@/lib/workspace-roles";

const LOCALE_COOKIE = "NEXT_LOCALE";
const VALID_LOCALES = ["en", "it"] as const;

type WorkspaceAccessContext = {
  ownerId: string;
  actorIsOwner: boolean;
  actorWorkspaceRole: WorkspaceAccessRole | null;
  actorDecisionRole: WorkspaceDecisionRole | null;
  rolesEnabled: boolean;
};

async function getWorkspaceAccessContext(
  workspaceId: string,
  actorUserId: string
): Promise<WorkspaceAccessContext | null> {
  const supabase = await createClient();
  const ws = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (ws.error || !ws.data) return null;

  const actorIsOwner = ws.data.owner_id === actorUserId;
  const [{ data: actorMember }, { data: subscription }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_role, decision_role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", actorUserId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", ws.data.owner_id)
      .maybeSingle(),
  ]);

  const ownerPlanId = getEffectivePlanId(subscription?.plan_id);
  return {
    ownerId: ws.data.owner_id,
    actorIsOwner,
    actorWorkspaceRole: actorMember?.workspace_role
      ? normalizeWorkspaceAccessRole(actorMember.workspace_role)
      : null,
    actorDecisionRole: actorMember?.decision_role
      ? normalizeWorkspaceDecisionRole(actorMember.decision_role)
      : null,
    rolesEnabled: supportsWorkspaceRoles(ownerPlanId),
  };
}

export type UpdateProfileNameState = {
  error?: string;
  success?: boolean;
};

export type WorkspaceActionState = {
  error?: string;
  success?: boolean;
  inviteLink?: string;
};

export async function updateProfileNameAction(
  _prevState: UpdateProfileNameState,
  formData: FormData
): Promise<UpdateProfileNameState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated" };
  }

  const full_name = (formData.get("full_name") as string)?.trim() ?? "";

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: full_name || null })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile name:", error);
    return { error: "name_update_failed" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export type UpdateProfileRoleState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileRoleAction(
  _prevState: UpdateProfileRoleState,
  formData: FormData
): Promise<UpdateProfileRoleState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated" };
  }

  const role = (formData.get("role") as string)?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile role:", error);
    return { error: "role_update_failed" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Invite a user to the workspace by email. Returns the invite link. */
export async function inviteUserToWorkspaceAction(
  workspaceId: string,
  email: string,
  requestedWorkspaceRole?: string,
  requestedDecisionRole?: string
): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const emailTrimmed = email?.trim().toLowerCase();
  if (!emailTrimmed) return { error: "Enter an email address" };

  const access = await getWorkspaceAccessContext(workspaceId, user.id);
  if (!access) return { error: "Workspace not found" };
  const canInviteAsAdmin = access.rolesEnabled && access.actorWorkspaceRole === "admin";
  if (!access.actorIsOwner && !canInviteAsAdmin) {
    return { error: "Only the workspace owner or an admin can invite members" };
  }

  const canInvite = await checkCanInviteToWorkspace(access.ownerId, workspaceId);
  if (!canInvite.allowed) return { error: canInvite.error };

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const workspaceRole = access.rolesEnabled
    ? normalizeWorkspaceAccessRole(requestedWorkspaceRole)
    : ("member" as WorkspaceAccessRole);
  const decisionRole = access.rolesEnabled
    ? normalizeWorkspaceDecisionRole(requestedDecisionRole)
    : ("contributor" as WorkspaceDecisionRole);
  if (canInviteAsAdmin && workspaceRole === "admin") {
    return { error: "Admins can only invite members" };
  }
  if (canInviteAsAdmin && decisionRole === "approver") {
    return { error: "Admins can only invite Contributor or Viewer decision roles" };
  }

  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: workspaceId,
    email: emailTrimmed,
    workspace_role: workspaceRole,
    decision_role: decisionRole,
    invited_by: user.id,
    token,
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "A pending invitation already exists for this email" };
    console.error("Error creating workspace invitation:", error);
    return { error: "Error sending invitation" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${token}`;
  revalidatePath("/dashboard/settings");
  return { success: true, inviteLink };
}

/** Accept a workspace invitation. */
export async function acceptWorkspaceInvitationAction(token: string): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to accept the invitation" };

  const invite = await getWorkspaceInvitationByToken(token);
  if (!invite) return { error: "Invalid or expired invitation" };

  const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
  const userEmail = profile.data?.email?.toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return { error: "This invitation was sent to a different email address. Sign in with the correct account." };
  }

  const { error: insertError } = await supabase.from("workspace_members").insert({
    workspace_id: invite.workspace_id,
    user_id: user.id,
    workspace_role: normalizeWorkspaceAccessRole(invite.workspace_role),
    decision_role: normalizeWorkspaceDecisionRole(invite.decision_role),
  });
  if (insertError) {
    if (insertError.code === "23505") return { error: "You are already a member of this workspace" };
    console.error("Error joining workspace:", insertError);
    return { error: "Error accepting invitation" };
  }

  await supabase.from("workspace_invitations").update({ status: "accepted" }).eq("id", invite.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard");
}

/** Remove a member from the workspace (owner only) or leave (self). */
export async function removeWorkspaceMemberAction(
  workspaceId: string,
  userId: string
): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const access = await getWorkspaceAccessContext(workspaceId, user.id);
  if (!access) return { error: "Workspace not found" };
  const isOwner = access.actorIsOwner;
  const isSelf = userId === user.id;

  if (!isOwner && !isSelf) {
    const canManageAsAdmin = access.rolesEnabled && access.actorWorkspaceRole === "admin";
    if (!canManageAsAdmin) return { error: "You cannot remove this member" };

    const { data: targetMember } = await supabase
      .from("workspace_members")
      .select("workspace_role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    const targetWorkspaceRole = normalizeWorkspaceAccessRole(targetMember?.workspace_role);
    if (targetWorkspaceRole === "admin") {
      return { error: "Admins cannot remove another admin" };
    }
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing workspace member:", error);
    return { error: "Error removing member" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  if (userId === user.id) redirect("/dashboard");
  return { success: true };
}

/** Revoke a pending workspace invitation. */
export async function revokeWorkspaceInvitationAction(invitationId: string): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const inv = await supabase
    .from("workspace_invitations")
    .select("workspace_id, workspace_role")
    .eq("id", invitationId)
    .single();
  if (inv.error || !inv.data) return { error: "Invitation not found" };

  const access = await getWorkspaceAccessContext(inv.data.workspace_id, user.id);
  if (!access) return { error: "Workspace not found" };
  const canRevokeAsAdmin = access.rolesEnabled && access.actorWorkspaceRole === "admin";
  if (!access.actorIsOwner && !canRevokeAsAdmin) {
    return { error: "Only the owner or an admin can revoke an invitation" };
  }
  if (canRevokeAsAdmin && normalizeWorkspaceAccessRole(inv.data.workspace_role) === "admin") {
    return { error: "Admins cannot revoke admin invitations" };
  }

  const { error } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (error) {
    console.error("Error revoking invitation:", error);
    return { error: "Error revoking invitation" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/** Update workspace and decision roles for a workspace member (Business+). */
export async function updateWorkspaceMemberRolesAction(
  workspaceId: string,
  memberUserId: string,
  nextWorkspaceRoleRaw: string,
  nextDecisionRoleRaw: string
): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const access = await getWorkspaceAccessContext(workspaceId, user.id);
  if (!access) return { error: "Workspace not found" };
  if (!access.rolesEnabled) {
    return { error: "Workspace roles are available on the Enterprise plan" };
  }

  const nextWorkspaceRole = normalizeWorkspaceAccessRole(nextWorkspaceRoleRaw);
  const nextDecisionRole = normalizeWorkspaceDecisionRole(nextDecisionRoleRaw);
  const { data: targetMember } = await supabase
    .from("workspace_members")
    .select("workspace_role, decision_role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberUserId)
    .maybeSingle();
  if (!targetMember) return { error: "Member not found" };

  const targetWorkspaceRole = normalizeWorkspaceAccessRole(targetMember.workspace_role);
  const targetDecisionRole = normalizeWorkspaceDecisionRole(targetMember.decision_role);
  if (access.actorIsOwner) {
    // Owner can assign all member roles.
  } else if (access.actorWorkspaceRole === "admin") {
    // Admin cannot edit admin members and cannot assign admin/approver privileges.
    if (targetWorkspaceRole === "admin" || nextWorkspaceRole === "admin") {
      return { error: "Admins cannot manage admin workspace role" };
    }
    if (targetDecisionRole === "approver" || nextDecisionRole === "approver") {
      return { error: "Admins cannot manage approver decision role" };
    }
  } else {
    return { error: "Only the owner or an admin can change member roles" };
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({
      workspace_role: nextWorkspaceRole,
      decision_role: nextDecisionRole,
    })
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberUserId);
  if (error) {
    console.error("Error updating workspace member roles:", error);
    return { error: "Error updating member role" };
  }

  revalidatePath("/dashboard/workspace");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export type UpdateProfileLocaleState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileLocaleAction(
  _prevState: UpdateProfileLocaleState,
  formData: FormData
): Promise<UpdateProfileLocaleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const locale = (formData.get("locale") as string)?.trim();
  if (!locale || !VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])) {
    return { error: "Invalid locale" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ locale })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile locale:", error);
    return { error: "Failed to update language" };
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/dashboard/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function disconnectGitHubAction(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("github_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error disconnecting GitHub:", error);
    return { error: "Failed to disconnect GitHub" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
