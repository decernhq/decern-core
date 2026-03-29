"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateWorkspaceMemberRolesAction } from "@/app/(dashboard)/dashboard/settings/actions";
import type { WorkspaceAccessRole, WorkspaceDecisionRole } from "@/lib/workspace-roles";

export function WorkspaceMemberRoleSelect({
  workspaceId,
  userId,
  currentWorkspaceRole,
  currentDecisionRole,
  canAssignWorkspaceAdmin,
  canAssignDecisionApprover,
  canEdit,
}: {
  workspaceId: string;
  userId: string;
  currentWorkspaceRole: WorkspaceAccessRole;
  currentDecisionRole: WorkspaceDecisionRole;
  canAssignWorkspaceAdmin: boolean;
  canAssignDecisionApprover: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("workspace");
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceAccessRole>(currentWorkspaceRole);
  const [decisionRole, setDecisionRole] = useState<WorkspaceDecisionRole>(currentDecisionRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(nextWorkspaceRole: WorkspaceAccessRole, nextDecisionRole: WorkspaceDecisionRole) {
    setWorkspaceRole(nextWorkspaceRole);
    setDecisionRole(nextDecisionRole);
    setError(null);
    setLoading(true);
    const result = await updateWorkspaceMemberRolesAction(
      workspaceId,
      userId,
      nextWorkspaceRole,
      nextDecisionRole
    );
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      setWorkspaceRole(currentWorkspaceRole);
      setDecisionRole(currentDecisionRole);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={t("workspaceRole")}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
        value={workspaceRole}
        disabled={loading || !canEdit}
        onChange={(e) => onChange(e.target.value as WorkspaceAccessRole, decisionRole)}
      >
        {canAssignWorkspaceAdmin && <option value="admin">{t("workspaceRoleAdmin")}</option>}
        <option value="member">{t("workspaceRoleMember")}</option>
      </select>
      <select
        aria-label={t("decisionRole")}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
        value={decisionRole}
        disabled={loading || !canEdit}
        onChange={(e) => onChange(workspaceRole, e.target.value as WorkspaceDecisionRole)}
      >
        {canAssignDecisionApprover && <option value="approver">{t("decisionRoleApprover")}</option>}
        <option value="contributor">{t("decisionRoleContributor")}</option>
        <option value="viewer">{t("decisionRoleViewer")}</option>
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
