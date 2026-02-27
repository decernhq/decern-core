/**
 * Decision Gate policies: applied in a fixed order by validate and judge.
 *
 * Order of evaluation:
 * 1. Enforcement (are we in blocking mode? if not → observation, 200)
 * 2. Linked PR (Business only, when requireLinkedPR)
 * 3. Status (Team when highImpact; Business when requireApproved)
 * 4. LLM as judge (Judge endpoint: Free/Team advisory, Business can block)
 */

export type PlanId = "free" | "team" | "business" | "enterprise" | "governance";

/** Query params for validate (from client). */
export interface ValidatePolicyParams {
  /** Team: when true, CI blocking applies (require approved). Business: when true, high-impact blocking enabled. */
  highImpact: boolean;
  /** Business+: when false, enforcement disabled (observation). Default true. */
  enforce: boolean;
  /** Business only: when true, decision must have at least one linked PR. */
  requireLinkedPR: boolean;
  /** Business only: when true, decision must be approved. Default true. */
  requireApproved: boolean;
}

const BUSINESS_PLANS: PlanId[] = ["business", "enterprise", "governance"];

/**
 * 1. Enforcement
 * Free: always observation.
 * Team: blocking only for High Impact Changes (highImpact=true).
 * Business+: blocking by default; enforce=false → observation.
 */
export function isBlockingMode(planId: PlanId, params: ValidatePolicyParams): boolean {
  if (planId === "free") return false;
  if (planId === "team") return params.highImpact;
  if (BUSINESS_PLANS.includes(planId)) return params.enforce;
  return false;
}

/**
 * 2. Linked PR (only when in blocking mode)
 * Free, Team: never require.
 * Business: require when requireLinkedPR=true.
 */
export function shouldRequireLinkedPR(planId: PlanId, params: ValidatePolicyParams): boolean {
  if (planId === "free" || planId === "team") return false;
  if (BUSINESS_PLANS.includes(planId)) return params.requireLinkedPR;
  return false;
}

/**
 * 3. Status (approved) (only when in blocking mode)
 * Free: never require.
 * Team: require when highImpact=true (blocking mode).
 * Business: require when requireApproved=true.
 */
export function shouldRequireApproved(planId: PlanId, params: ValidatePolicyParams): boolean {
  if (planId === "free") return false;
  if (planId === "team") return params.highImpact; // when blocking, require approved
  if (BUSINESS_PLANS.includes(planId)) return params.requireApproved;
  return false;
}

/** Default params when no DB row and no query param. */
export function defaultValidatePolicyParams(): ValidatePolicyParams {
  return { highImpact: false, enforce: true, requireLinkedPR: false, requireApproved: true };
}

/** Map workspace_policies row to ValidatePolicyParams (only Business fields; highImpact stays from request). */
export function dbRowToValidateParams(row: {
  require_linked_pr: boolean;
  require_approved: boolean;
  enforce: boolean;
}): Partial<ValidatePolicyParams> {
  return {
    requireLinkedPR: row.require_linked_pr,
    requireApproved: row.require_approved,
    enforce: row.enforce,
  };
}

/** Query param overrides: only keys that are present in the URL. */
function queryOverrides(searchParams: URLSearchParams): Partial<ValidatePolicyParams> {
  const truthy = (v: string | null) => /^(true|1)$/i.test(v ?? "");
  const out: Partial<ValidatePolicyParams> = {};
  if (searchParams.has("highImpact")) out.highImpact = truthy(searchParams.get("highImpact"));
  if (searchParams.has("enforce")) {
    const v = searchParams.get("enforce");
    out.enforce = v === undefined || v === null || v === "" ? true : truthy(v);
  }
  if (searchParams.has("requireLinkedPR")) out.requireLinkedPR = truthy(searchParams.get("requireLinkedPR"));
  if (searchParams.has("requireApproved")) {
    const v = searchParams.get("requireApproved");
    out.requireApproved = v === undefined || v === null || v === "" ? true : truthy(v);
  }
  return out;
}

/**
 * Build ValidatePolicyParams: defaults + optional DB row (workspace policies) + query param overrides.
 * Query params override DB; DB overrides defaults.
 */
export function mergeValidateParams(
  dbRow: { require_linked_pr: boolean; require_approved: boolean; enforce: boolean } | null,
  searchParams: URLSearchParams
): ValidatePolicyParams {
  const base = defaultValidatePolicyParams();
  const fromDb = dbRow ? dbRowToValidateParams(dbRow) : {};
  const fromQuery = queryOverrides(searchParams);
  return { ...base, ...fromDb, ...fromQuery };
}

/**
 * 4. LLM as judge
 * Free: always advisory (client must not block CI on allowed: false).
 * Team and Business+: can block when workspace policy "Judge blocking" is on; otherwise advisory.
 */
export function isJudgeAdvisory(planId: PlanId): boolean {
  return planId === "free";
}

export const JUDGE_ALLOWED_PLANS = new Set<PlanId>(["free", "team", "business", "enterprise", "governance"]);
