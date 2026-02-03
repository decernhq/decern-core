import type { PlanId } from "@/types/billing";

/**
 * Se PLAN_OVERRIDE è impostata a "free" o "pro", restituisce quel piano
 * ignorando il valore nel DB. Utile in development.
 */
export function getEffectivePlanId(dbPlanId: string | null | undefined): PlanId {
  const override = process.env.PLAN_OVERRIDE?.trim().toLowerCase();
  if (override === "pro" || override === "free") return override;
  return (dbPlanId === "pro" ? "pro" : "free") as PlanId;
}
