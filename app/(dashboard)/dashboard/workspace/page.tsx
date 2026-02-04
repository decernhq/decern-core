import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateDefaultWorkspace,
  getWorkspaceById,
  getAllWorkspacesForCurrentUser,
  getWorkspaceMembersWithProfiles,
  getWorkspaceInvitationsPending,
} from "@/lib/queries/workspaces";
import { getProfileById } from "@/lib/queries/profiles";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { getEffectivePlanId } from "@/lib/billing";
import { PLANS } from "@/types/billing";
import { WorkspaceMembersSection } from "@/components/dashboard/workspace-members-section";
import { WorkspaceList } from "@/components/dashboard/workspace-list";
import { CreateWorkspaceForm } from "@/components/dashboard/create-workspace-form";
import { WorkspaceCiTokenSection } from "@/components/dashboard/workspace-ci-token-section";
import Link from "next/link";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const selectedId = await getSelectedWorkspaceId();
  const [workspaces, workspace] = await Promise.all([
    getAllWorkspacesForCurrentUser(),
    selectedId ? getWorkspaceById(selectedId) : getOrCreateDefaultWorkspace(),
  ]);

  if (!workspace) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
        <p className="mt-4 text-gray-600">Impossibile caricare il workspace.</p>
      </div>
    );
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", user.id)
    .single();
  const planId = getEffectivePlanId(subscription?.plan_id);
  const canCreateWorkspaces = PLANS[planId].limits.workspaces_limit === -1;

  const [members, invitations, ownerProfile] = await Promise.all([
    getWorkspaceMembersWithProfiles(workspace.id),
    getWorkspaceInvitationsPending(workspace.id),
    getProfileById(workspace.owner_id),
  ]);

  const isOwner = user.id === workspace.owner_id;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
      <p className="mt-1 text-sm text-gray-600">
        Gestisci membri e inviti. Gli utenti invitati vedranno tutti i progetti del workspace.
      </p>

      <div className="mt-6">
        <WorkspaceList
          workspaces={workspaces}
          selectedWorkspaceId={selectedId}
          currentUserId={user.id}
        />
      </div>

      {canCreateWorkspaces && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Crea nuovo workspace</h2>
          <p className="mt-1 text-sm text-gray-500">
            Con il piano Ultra puoi creare più workspace per organizzare team e progetti.
          </p>
          <div className="mt-4">
            <CreateWorkspaceForm />
          </div>
        </div>
      )}

      {!canCreateWorkspaces && (
        <p className="mt-4 text-sm text-gray-500">
          Per creare più workspace passa al{" "}
          <Link href="/dashboard/settings" className="font-medium text-brand-600 hover:text-brand-700">
            piano Ultra
          </Link>.
        </p>
      )}

      {isOwner && (
        <div className="mt-6">
          <WorkspaceCiTokenSection
            workspaceId={workspace.id}
            ciTokenCreatedAt={workspace.ci_token_created_at}
          />
        </div>
      )}

      <div className="mt-6">
        <WorkspaceMembersSection
          workspaceId={workspace.id}
          currentUserId={user.id}
          ownerProfile={ownerProfile}
          members={members}
          invitations={invitations}
        />
      </div>
    </div>
  );
}
