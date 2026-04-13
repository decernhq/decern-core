/**
 * Billing types for v2.
 * Two plans: Free and Enterprise.
 *
 * Limits enforced:
 * - workspaces_limit: how many workspaces the user can own
 * - users_per_workspace_limit: max members per workspace
 *
 * Feature gates (not counter-based):
 * - Draft ADR generation from signals: Enterprise only (isPaidWorkspace check)
 * - CI blocking mode: available to all (enforcement is per-ADR in the repo)
 */

export type PlanId = "free" | "enterprise";

export interface PlanLimits {
  workspaces_limit: number;
  users_per_workspace_limit: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  priceId: string | null;
  features: string[];
  limits: PlanLimits;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Get started",
    price: 0,
    priceId: null,
    features: [
      "1 workspace, up to 3 developers",
      "Unlimited ADRs, unlimited gate runs",
      "CI gate with BYO LLM (blocking + warning)",
      "Signal detection (Case C)",
      "Dashboard: ADRs, signals, gate runs",
      "Evidence chain + export",
    ],
    limits: {
      workspaces_limit: 1,
      users_per_workspace_limit: 3,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Full control",
    price: 0,
    priceId: null,
    features: [
      "Unlimited workspaces and developers",
      "Everything in Free",
      "Draft ADR generation from signals (cloud LLM)",
      "Create PR from dashboard (GitHub)",
      "Self-hosted deployment (VPC, air-gapped)",
      "SSO (SAML, OIDC)",
      "Dedicated support with SLA",
      "Security review assistance (SOC 2, ISO 42001)",
    ],
    limits: {
      workspaces_limit: -1,
      users_per_workspace_limit: -1,
    },
  },
};
