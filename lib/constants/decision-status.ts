import type { DecisionStatus } from "@/types/decision";

export const DECISION_STATUS_VALUES: readonly DecisionStatus[] = [
  "proposed",
  "approved",
  "superseded",
  "rejected",
] as const;

/** Tailwind classes for status chips (bg + text). */
export const STATUS_COLORS: Record<DecisionStatus, string> = {
  proposed: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  superseded: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};
