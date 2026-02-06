import type { PlanId } from "@/types/billing";

const VALID_PLAN_IDS: PlanId[] = ["free", "team", "business", "enterprise", "governance"];

/** Map legacy DB plan_id to current PlanId (for backward compat if any old row remains) */
const LEGACY_MAP: Record<string, PlanId> = {
  pro: "team",
  ultra: "business",
};

/**
 * Se PLAN_OVERRIDE è impostata (free | team | business | enterprise | governance), restituisce quel piano
 * ignorando il valore nel DB. Utile in development.
 */
export function getEffectivePlanId(dbPlanId: string | null | undefined): PlanId {
  const override = process.env.PLAN_OVERRIDE?.trim().toLowerCase();
  if (override && VALID_PLAN_IDS.includes(override as PlanId)) return override as PlanId;
  const mapped = dbPlanId ? LEGACY_MAP[dbPlanId] ?? (VALID_PLAN_IDS.includes(dbPlanId as PlanId) ? (dbPlanId as PlanId) : null) : null;
  if (mapped) return mapped;
  return "free";
}
