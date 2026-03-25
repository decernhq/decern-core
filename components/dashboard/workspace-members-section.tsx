import { getTranslations } from "next-intl/server";
import type { WorkspaceMemberWithProfile, WorkspaceInvitationPending } from "@/lib/queries/workspaces";
import type { Profile } from "@/types/database";
import type { PlanId } from "@/types/billing";
import {
  supportsWorkspaceRoles,
  type WorkspaceAccessRole,
  type WorkspaceDecisionRole,
} from "@/lib/workspace-roles";
import { InviteWorkspaceForm } from "./invite-workspace-form";
import { RemoveWorkspaceMemberButton } from "./remove-workspace-member-button";
import { RevokeWorkspaceInvitationButton } from "./revoke-workspace-invitation-button";
import { WorkspaceMemberRoleSelect } from "./workspace-member-role-select";

function displayName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email || "—";
}

export async function WorkspaceMembersSection({
  workspaceId,
  currentUserId,
  ownerProfile,
  members,
  invitations,
  planId,
}: {
  workspaceId: string;
  currentUserId: string;
  ownerProfile: Profile | null;
  members: WorkspaceMemberWithProfile[];
  invitations: WorkspaceInvitationPending[];
  planId: PlanId;
}) {
  const t = await getTranslations("workspace");
  const isOwner = currentUserId === ownerProfile?.id;
  const rolesEnabled = supportsWorkspaceRoles(planId);
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isAdmin = rolesEnabled && currentMember?.workspace_role === "admin";
  const canManageMembers = isOwner || isAdmin;

  function workspaceRoleLabel(role: WorkspaceAccessRole): string {
    return role === "admin" ? t("workspaceRoleAdmin") : t("workspaceRoleMember");
  }

  function decisionRoleLabel(role: WorkspaceDecisionRole): string {
    if (role === "approver") return t("decisionRoleApprover");
    if (role === "viewer") return t("decisionRoleViewer");
    return t("decisionRoleContributor");
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">{t("membersAndInvites")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {t("membersHint")}
      </p>
      <ul className="mt-4 space-y-2">
        <li className="flex items-center justify-between py-2">
          <span className="text-gray-900">{ownerProfile ? displayName(ownerProfile) : "—"}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {t("owner")}
          </span>
        </li>
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between border-t border-gray-100 py-2">
            <span className="text-gray-900">{displayName(m)}</span>
            <div className="flex items-center gap-2">
              {rolesEnabled ? (
                <WorkspaceMemberRoleSelect
                  workspaceId={workspaceId}
                  userId={m.user_id}
                  currentWorkspaceRole={m.workspace_role}
                  currentDecisionRole={m.decision_role}
                  canAssignWorkspaceAdmin={isOwner}
                  canAssignDecisionApprover={isOwner}
                  canEdit={canManageMembers && (isOwner || m.workspace_role !== "admin")}
                />
              ) : (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {t("memberRole")}
                </span>
              )}
              {((canManageMembers && (isOwner || m.workspace_role !== "admin")) || m.user_id === currentUserId) && (
                <RemoveWorkspaceMemberButton
                  workspaceId={workspaceId}
                  userId={m.user_id}
                  label={displayName(m)}
                  isSelf={m.user_id === currentUserId}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManageMembers && (
        <>
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700">{t("inviteUser")}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t("inviteHint")}
            </p>
            <div className="mt-3">
              <InviteWorkspaceForm
                workspaceId={workspaceId}
                rolesEnabled={rolesEnabled}
                canInviteWorkspaceAdmin={isOwner}
                canInviteDecisionApprover={isOwner}
              />
            </div>
          </div>

          {invitations.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700">{t("pendingInvites")}</h3>
              <ul className="mt-2 space-y-2">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-700">
                      {inv.email}
                      {rolesEnabled && (
                        <>
                          <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {workspaceRoleLabel(inv.workspace_role)}
                          </span>
                          <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {decisionRoleLabel(inv.decision_role)}
                          </span>
                        </>
                      )}
                    </span>
                    <RevokeWorkspaceInvitationButton invitationId={inv.id} email={inv.email} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
