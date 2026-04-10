/**
 * Billing types for plan limits.
 * Only two plans: Free and Enterprise (Self-Hosted).
 */

export type PlanId = "free" | "enterprise";

export interface PlanLimits {
  workspaces_limit: number;
  projects_limit: number;
  users_per_workspace_limit: number;
  decisions_limit: number;
  ai_generations_per_month: number;
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
    description: "To get started",
    price: 0,
    priceId: null,
    features: [
      "1 workspace",
      "Unlimited projects",
      "Unlimited decisions",
      "AI decision generation (fair use)",
      "LLM as a Judge (advisory, BYO only)",
      "CI Observation (no blocking)",
    ],
    limits: {
      workspaces_limit: 1,
      projects_limit: -1,
      users_per_workspace_limit: 5,
      decisions_limit: -1,
      ai_generations_per_month: 10,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise / Self-Hosted",
    description: "Full control",
    price: 0,
    priceId: null,
    features: [
      "Unlimited workspaces, projects, decisions",
      "Blocking mode + advanced policies",
      "Roles & permissions",
      "SSO (SAML, OIDC)",
      "Self-hosted deployment (VPC, air-gapped)",
      "BYO LLM enforced",
      "Dedicated support with SLA",
    ],
    limits: {
      workspaces_limit: -1,
      projects_limit: -1,
      users_per_workspace_limit: -1,
      decisions_limit: -1,
      ai_generations_per_month: -1,
    },
  },
};

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  planId: PlanId;
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}
