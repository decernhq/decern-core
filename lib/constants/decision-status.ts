import type { DecisionStatus } from "@/types/decision";

/**
 * Decision status: valori ufficiali in inglese (DB e API).
 * Le etichette per l'UI sono tradotte in italiano tramite STATUS_LABEL_IT / getDecisionStatusLabel.
 */
export const DECISION_STATUS_VALUES: readonly DecisionStatus[] = [
  "proposed",
  "approved",
  "superseded",
  "rejected",
] as const;

/** Traduzione italiana delle etichette stato (solo per visualizzazione). */
export const STATUS_LABEL_IT: Record<DecisionStatus, string> = {
  proposed: "Proposta",
  approved: "Approvata",
  superseded: "Superata",
  rejected: "Rifiutata",
};

/** Restituisce l'etichetta in italiano per lo stato (valore in inglese). */
export function getDecisionStatusLabel(status: DecisionStatus | string): string {
  return STATUS_LABEL_IT[status as DecisionStatus] ?? status;
}

/** Opzioni per select (value in inglese, label in italiano). */
export const DECISION_STATUS_OPTIONS: { value: DecisionStatus | ""; label: string }[] = [
  { value: "", label: "Tutti gli stati" },
  ...DECISION_STATUS_VALUES.map((value) => ({
    value,
    label: STATUS_LABEL_IT[value],
  })),
];

/** Opzioni per form creazione/modifica (solo stati, senza "Tutti"). */
export const DECISION_STATUS_FORM_OPTIONS: { value: DecisionStatus; label: string }[] =
  DECISION_STATUS_VALUES.map((value) => ({
    value,
    label: STATUS_LABEL_IT[value],
  }));

/** Classi Tailwind per i chip stato (bg + text). */
export const STATUS_COLORS: Record<DecisionStatus, string> = {
  proposed: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  superseded: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};
