import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
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
import { checkCanCreateWorkspace } from "@/lib/plan-limits";
import { WorkspaceMembersSection } from "@/components/dashboard/workspace-members-section";
import { WorkspaceList } from "@/components/dashboard/workspace-list";
import { CreateWorkspaceForm } from "@/components/dashboard/create-workspace-form";
import { WorkspaceCiTokenSection } from "@/components/dashboard/workspace-ci-token-section";
import { WorkspacePoliciesForm } from "@/components/dashboard/workspace-policies-form";
import { IS_CLOUD } from "@/lib/cloud";
import Link from "next/link";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const t = await getTranslations("workspace");
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
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-4 text-gray-600">{t("loadError")}</p>
      </div>
    );
  }

  const [members, invitations, ownerProfile, policiesRow, ownerSubscription, canCreateOwnWorkspaceResult] = await Promise.all([
    getWorkspaceMembersWithProfiles(workspace.id),
    getWorkspaceInvitationsPending(workspace.id),
    getProfileById(workspace.owner_id),
    supabase
      .from("workspace_policies")
      .select("evidence_retention_days")
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", workspace.owner_id)
      .maybeSingle(),
    checkCanCreateWorkspace(user.id),
  ]);

  const isOwner = user.id === workspace.owner_id;
  const ownerPlanId = getEffectivePlanId(ownerSubscription.data?.plan_id);
  const canCreateOwnWorkspace = canCreateOwnWorkspaceResult.allowed;
  const showPolicies = isOwner;
  const policiesInitial = {
    evidence_retention_days: policiesRow?.data?.evidence_retention_days ?? 730,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>

      <div className="mt-6">
        <WorkspaceList
          workspaces={workspaces}
          selectedWorkspaceId={selectedId}
          currentUserId={user.id}
        />
      </div>

      {canCreateOwnWorkspace && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">{t("createNew")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("createHint")}</p>
          <div className="mt-4">
            <CreateWorkspaceForm />
          </div>
        </div>
      )}

      {isOwner && !canCreateOwnWorkspace && (
        <p className="mt-4 text-sm text-gray-500">
          {t("upgradeForWorkspaces")}{" "}
          <Link href="/dashboard/settings" className="font-medium text-brand-600 hover:text-brand-700">
            {t("enterprisePlan")}
          </Link>.
        </p>
      )}

      {!process.env.VERCEL && isOwner && !process.env.DECERN_EVIDENCE_SIGNING_KEY && !process.env.DECERN_EVIDENCE_SIGNING_KEY_PATH && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("signingKeyMissing")}</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t("signingKeyMissingHint")}</p>
            </div>
          </div>
        </div>
      )}

      {IS_CLOUD && isOwner && (
        <div className="mt-6">
          <WorkspaceCiTokenSection
            workspaceId={workspace.id}
            ciTokenCreatedAt={workspace.ci_token_created_at}
          />
        </div>
      )}

      {IS_CLOUD && showPolicies && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">{t("policiesSectionTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("policiesSectionSubtitle")}</p>
          <div className="mt-4">
            <WorkspacePoliciesForm workspaceId={workspace.id} initial={policiesInitial} />
          </div>
        </div>
      )}

      <div className="mt-6">
        <WorkspaceMembersSection
          workspaceId={workspace.id}
          currentUserId={user.id}
          ownerProfile={ownerProfile}
          members={members}
          invitations={invitations}
          planId={ownerPlanId}
        />
      </div>
    </div>
  );
}
