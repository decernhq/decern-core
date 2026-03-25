import type { PlanId } from "@/types/billing";

export const WORKSPACE_ACCESS_ROLES = ["admin", "member"] as const;
export type WorkspaceAccessRole = (typeof WORKSPACE_ACCESS_ROLES)[number];

export const WORKSPACE_DECISION_ROLES = ["approver", "contributor", "viewer"] as const;
export type WorkspaceDecisionRole = (typeof WORKSPACE_DECISION_ROLES)[number];

const DEFAULT_WORKSPACE_ACCESS_ROLE: WorkspaceAccessRole = "member";
const DEFAULT_WORKSPACE_DECISION_ROLE: WorkspaceDecisionRole = "contributor";
const ROLE_ENABLED_PLANS: PlanId[] = ["business", "enterprise", "governance"];

export function supportsWorkspaceRoles(planId: PlanId): boolean {
  return ROLE_ENABLED_PLANS.includes(planId);
}

export function normalizeWorkspaceAccessRole(value: string | null | undefined): WorkspaceAccessRole {
  if (!value) return DEFAULT_WORKSPACE_ACCESS_ROLE;
  const candidate = value.trim().toLowerCase();
  return WORKSPACE_ACCESS_ROLES.includes(candidate as WorkspaceAccessRole)
    ? (candidate as WorkspaceAccessRole)
    : DEFAULT_WORKSPACE_ACCESS_ROLE;
}

export function normalizeWorkspaceDecisionRole(value: string | null | undefined): WorkspaceDecisionRole {
  if (!value) return DEFAULT_WORKSPACE_DECISION_ROLE;
  const candidate = value.trim().toLowerCase();
  return WORKSPACE_DECISION_ROLES.includes(candidate as WorkspaceDecisionRole)
    ? (candidate as WorkspaceDecisionRole)
    : DEFAULT_WORKSPACE_DECISION_ROLE;
}
