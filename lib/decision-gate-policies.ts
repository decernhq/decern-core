/**
 * Decision Gate policies: applied in a fixed order by validate and judge.
 *
 * Order of evaluation:
 * 1. Blocking mode (highImpact: true → blocking; false → observation)
 * 2. Linked PR (Business only, when requireLinkedPR)
 * 3. Status (Team/Business when highImpact; Business when requireApproved)
 * 4. LLM as judge (Judge endpoint: Free advisory, Team/Business can block)
 *
 * highImpact is a server-side workspace policy (stored as `enforce` column in DB).
 * Default: true (blocking). The CLI (v0.1.10+) does not send highImpact; the server decides.
 */

export type PlanId = "free" | "team" | "business" | "enterprise" | "governance";

/** Policy params for validate (from DB + optional query overrides). */
export interface ValidatePolicyParams {
  /** Server-side policy: when true, CI blocking applies for paid plans. Default true. Stored as `enforce` in DB. */
  highImpact: boolean;
  /** Business only: when true, decision must have at least one linked PR. */
  requireLinkedPR: boolean;
  /** Business only: when true, decision must be approved. Default true. */
  requireApproved: boolean;
}

const BUSINESS_PLANS: PlanId[] = ["business", "enterprise", "governance"];

/**
 * 1. Blocking mode
 * Free: always observation.
 * Team/Business+: blocking when highImpact=true (default).
 */
export function isBlockingMode(planId: PlanId, params: ValidatePolicyParams): boolean {
  if (planId === "free") return false;
  if (planId === "team") return params.highImpact;
  if (BUSINESS_PLANS.includes(planId)) return params.highImpact;
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
  if (planId === "team") return params.highImpact;
  if (BUSINESS_PLANS.includes(planId)) return params.requireApproved;
  return false;
}

/** Default params when no DB row and no query param. */
export function defaultValidatePolicyParams(): ValidatePolicyParams {
  return { highImpact: true, requireLinkedPR: false, requireApproved: true };
}

/** Map workspace_policies row to ValidatePolicyParams. DB column `enforce` → `highImpact`. */
export function dbRowToValidateParams(row: {
  enforce: boolean;
  require_linked_pr: boolean;
  require_approved: boolean;
}): Partial<ValidatePolicyParams> {
  return {
    highImpact: row.enforce,
    requireLinkedPR: row.require_linked_pr,
    requireApproved: row.require_approved,
  };
}

/** Query param overrides: only keys that are present in the URL. */
function queryOverrides(searchParams: URLSearchParams): Partial<ValidatePolicyParams> {
  const truthy = (v: string | null) => /^(true|1)$/i.test(v ?? "");
  const out: Partial<ValidatePolicyParams> = {};
  if (searchParams.has("highImpact")) out.highImpact = truthy(searchParams.get("highImpact"));
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
  dbRow: { enforce: boolean; require_linked_pr: boolean; require_approved: boolean } | null,
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
