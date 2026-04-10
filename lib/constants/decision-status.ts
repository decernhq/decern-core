import type { DecisionStatus } from "@/types/decision";

export const DECISION_STATUS_VALUES: readonly DecisionStatus[] = [
  "proposed",
  "approved",
  "superseded",
  "rejected",
] as const;

/** Tailwind classes for status chips (bg + text). */
export const STATUS_COLORS: Record<DecisionStatus, string> = {
  proposed: "bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-300/70",
  approved: "bg-green-100 text-green-800 ring-1 ring-inset ring-green-300/70",
  superseded: "bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-300/70",
  rejected: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-300/70",
};
