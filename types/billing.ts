/**
 * Billing types for Stripe integration and plan limits
 */

export type PlanId = "free" | "team" | "business" | "enterprise" | "governance";

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
  price: number; // monthly price in EUR
  priceId: string | null; // Stripe Price ID (null for free/enterprise/governance)
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
      "1 project",
      "Unlimited decisions",
      "AI decision generation (fair use)",
      "LLM as a judge (advisory)*",
      "CI Observation (no blocking)",
    ],
    limits: {
      workspaces_limit: 1,
      projects_limit: 1,
      users_per_workspace_limit: 1,
      decisions_limit: -1,
      ai_generations_per_month: 10,
    },
  },
  team: {
    id: "team",
    name: "Team",
    description: "For growing teams",
    price: 49,
    priceId: process.env.STRIPE_TEAM_PRICE_ID || "",
    features: [
      "1 workspace",
      "Unlimited projects",
      "Unlimited decisions",
      "AI decision generation (fair use)",
      "LLM as a Judge (blocking)*",
      "CI Blocking for High Impact changes",
      "Judge tolerance",
    ],
    limits: {
      workspaces_limit: 1,
      projects_limit: -1,
      users_per_workspace_limit: 10,
      decisions_limit: -1,
      ai_generations_per_month: 700,
    },
  },
  business: {
    id: "business",
    name: "Business",
    description: "For organizations",
    price: 99,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || "",
    features: [
      "Unlimited workspaces",
      "Unlimited projects",
      "Unlimited decisions",
      "AI decision generation (fair use)",
      "LLM as a Judge (blocking)*",
      "CI Blocking for High Impact changes",
      "Judge tolerance",
      "Advanced Policies",
      "Roles",
    ],
    limits: {
      workspaces_limit: -1,
      projects_limit: -1,
      users_per_workspace_limit: 20,
      decisions_limit: -1,
      ai_generations_per_month: 1400,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Let's Talk",
    price: 0,
    priceId: null,
    features: ["Custom limits", "Dedicated Support", "Dedicated Hosting"],
    limits: {
      workspaces_limit: -1,
      projects_limit: -1,
      users_per_workspace_limit: -1,
      decisions_limit: -1,
      ai_generations_per_month: -1,
    },
  },
  governance: {
    id: "governance",
    name: "Governance / On Prem",
    description: "Let's Talk",
    price: 0,
    priceId: null,
    features: ["Custom limits", "Dedicated Support", "On Prem"],
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
