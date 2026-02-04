import type { PlanId } from "@/types/billing";

const VALID_PLAN_IDS: PlanId[] = ["free", "pro", "ultra", "enterprise"];

/**
 * Se PLAN_OVERRIDE è impostata (free | pro | ultra | enterprise), restituisce quel piano
 * ignorando il valore nel DB. Utile in development.
 */
export function getEffectivePlanId(dbPlanId: string | null | undefined): PlanId {
  const override = process.env.PLAN_OVERRIDE?.trim().toLowerCase();
  if (override && VALID_PLAN_IDS.includes(override as PlanId)) return override as PlanId;
  if (dbPlanId && VALID_PLAN_IDS.includes(dbPlanId as PlanId)) return dbPlanId as PlanId;
  return "free";
}
