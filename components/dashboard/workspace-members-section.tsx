import type { WorkspaceMemberWithProfile, WorkspaceInvitationPending } from "@/lib/queries/workspaces";
import type { Profile } from "@/types/database";
import { InviteWorkspaceForm } from "./invite-workspace-form";
import { RemoveWorkspaceMemberButton } from "./remove-workspace-member-button";
import { RevokeWorkspaceInvitationButton } from "./revoke-workspace-invitation-button";

function displayName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email || "—";
}

export function WorkspaceMembersSection({
  workspaceId,
  currentUserId,
  ownerProfile,
  members,
  invitations,
}: {
  workspaceId: string;
  currentUserId: string;
  ownerProfile: Profile | null;
  members: WorkspaceMemberWithProfile[];
  invitations: WorkspaceInvitationPending[];
}) {
  const isOwner = currentUserId === ownerProfile?.id;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Workspace – Membri e inviti</h2>
      <p className="mt-1 text-sm text-gray-500">
        Gli utenti invitati al workspace vedranno tutti i progetti. Gestisci inviti e membri qui.
      </p>
      <ul className="mt-4 space-y-2">
        <li className="flex items-center justify-between py-2">
          <span className="text-gray-900">{ownerProfile ? displayName(ownerProfile) : "—"}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Proprietario
          </span>
        </li>
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between border-t border-gray-100 py-2">
            <span className="text-gray-900">{displayName(m)}</span>
            {isOwner && (
              <RemoveWorkspaceMemberButton
                workspaceId={workspaceId}
                userId={m.user_id}
                label={displayName(m)}
                isSelf={m.user_id === currentUserId}
              />
            )}
            {!isOwner && m.user_id === currentUserId && (
              <RemoveWorkspaceMemberButton
                workspaceId={workspaceId}
                userId={m.user_id}
                label={displayName(m)}
                isSelf
              />
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <>
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700">Invita un utente al workspace</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter the email and share the link (valid 7 days). The invitee will see all workspace projects.
            </p>
            <div className="mt-3">
              <InviteWorkspaceForm workspaceId={workspaceId} />
            </div>
          </div>

          {invitations.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700">Inviti in sospeso</h3>
              <ul className="mt-2 space-y-2">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-700">{inv.email}</span>
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
