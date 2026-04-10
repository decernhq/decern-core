import type { PlanId } from "@/types/billing";

const VALID_PLAN_IDS: PlanId[] = ["free", "enterprise"];

/** Map legacy/removed plan IDs to current PlanId */
const LEGACY_MAP: Record<string, PlanId> = {
  pro: "enterprise",
  ultra: "enterprise",
  team: "enterprise",
  business: "enterprise",
};

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
