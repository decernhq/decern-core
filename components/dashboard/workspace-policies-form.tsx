/**
 * Workspace policies form – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/components/dashboard/workspace-policies-form.tsx.
 */
"use client";

export type WorkspacePoliciesInitial = {
  evidence_retention_days: number;
};

export function WorkspacePoliciesForm({
  workspaceId: _workspaceId,
  initial: _initial,
}: {
  workspaceId: string;
  initial: WorkspacePoliciesInitial;
}) {
  return null;
}
