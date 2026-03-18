/**
 * Decision Gate policies – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/decision-gate-policies.ts.
 */

export type PlanId = "free" | "team" | "business" | "enterprise" | "governance";

export interface ValidatePolicyParams {
  highImpact: boolean;
  requireLinkedPR: boolean;
  requireApproved: boolean;
}

export function isBlockingMode(_planId: PlanId, _params: ValidatePolicyParams): boolean {
  return false;
}

export function shouldRequireLinkedPR(_planId: PlanId, _params: ValidatePolicyParams): boolean {
  return false;
}

export function shouldRequireApproved(_planId: PlanId, _params: ValidatePolicyParams): boolean {
  return false;
}

export function defaultValidatePolicyParams(): ValidatePolicyParams {
  return { highImpact: true, requireLinkedPR: false, requireApproved: true };
}

export function dbRowToValidateParams(_row: {
  high_impact: boolean;
  require_linked_pr: boolean;
  require_approved: boolean;
}): Partial<ValidatePolicyParams> {
  return {};
}

export function mergeValidateParams(
  _dbRow: { high_impact: boolean; require_linked_pr: boolean; require_approved: boolean } | null,
  _searchParams: URLSearchParams
): ValidatePolicyParams {
  return defaultValidatePolicyParams();
}

export function isJudgeAdvisory(_planId: PlanId): boolean {
  return true;
}

export const JUDGE_ALLOWED_PLANS = new Set<PlanId>(["free", "team", "business", "enterprise", "governance"]);
