/**
 * Decision status representing the lifecycle of a technical decision.
 */
export type DecisionStatus = "proposed" | "approved" | "superseded" | "rejected";

/**
 * A technical decision record (ADR-like structure).
 * Used to document important architectural and technical decisions.
 */
export interface Decision {
  id: string;
  projectId: string;
  title: string;
  status: DecisionStatus;
  /** The context and problem statement that led to this decision */
  context: string;
  /** The options that were considered */
  options: string[];
  /** The final decision that was made */
  decision: string;
  /** The consequences of this decision (positive and negative) */
  consequences: string;
  /** Tags for categorization and filtering */
  tags: string[];
  /** External references (RFCs, docs, etc.) */
  externalLinks: { url: string; label?: string }[];
  /** Optional URLs to pull requests for this decision */
  pullRequestUrls?: string[];
  /** Optional link to a previous/related decision */
  linkedDecisionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new decision (without auto-generated fields).
 */
export type CreateDecisionInput = Omit<Decision, "id" | "createdAt" | "updatedAt">;

/**
 * Input for updating an existing decision.
 */
export type UpdateDecisionInput = Partial<Omit<Decision, "id" | "createdAt" | "updatedAt">>;
