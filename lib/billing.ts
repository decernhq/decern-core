import type { PlanId } from "@/types/billing";

const VALID_PLAN_IDS: PlanId[] = ["free", "team", "business", "enterprise"];

/** Map legacy DB plan_id to current PlanId (for backward compat if any old row remains) */
const LEGACY_MAP: Record<string, PlanId> = {
  pro: "team",
  ultra: "business",
};

/**
 * Restituisce il piano effettivo, in ordine di priorità:
 * 1. PLAN_OVERRIDE env var (dev / self-hosted)
 * 2. Self-hosted → enterprise (il gate è l'accesso al container registry)
 * 3. Valore dal DB (con mapping legacy)
 * 4. Fallback: free
 */
export function getEffectivePlanId(dbPlanId: string | null | undefined): PlanId {
  const override = process.env.PLAN_OVERRIDE?.trim().toLowerCase();
  if (override && VALID_PLAN_IDS.includes(override as PlanId)) return override as PlanId;

  if (process.env.NEXT_PUBLIC_SELF_HOSTED === "true") {
    return "enterprise";
  }

  const mapped = dbPlanId ? LEGACY_MAP[dbPlanId] ?? (VALID_PLAN_IDS.includes(dbPlanId as PlanId) ? (dbPlanId as PlanId) : null) : null;
  if (mapped) return mapped;
  return "free";
}
