/**
 * Workspace policies form – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/components/dashboard/workspace-policies-form.tsx.
 */
"use client";

export type WorkspacePoliciesInitial = {
  high_impact: boolean;
  require_linked_pr: boolean;
  require_approved: boolean;
  judge_tolerance_percent: number | null;
  judge_mode: "blocking" | "advisory" | "deterministic_only";
  evidence_retention_days: number;
};

export function WorkspacePoliciesForm({
  workspaceId: _workspaceId,
  initial: _initial,
  planId: _planId,
}: {
  workspaceId: string;
  initial: WorkspacePoliciesInitial;
  planId: string;
}) {
  return null;
}
