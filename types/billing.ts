/**
 * Billing types for Stripe integration
 */

export type PlanId = "free" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number; // monthly price in EUR
  priceId: string | null; // Stripe Price ID (null for free plan)
  features: string[];
  limits: {
    projects: number;
    decisionsPerProject: number;
    workspaces: number; // -1 = illimitati
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Per iniziare",
    price: 0,
    priceId: null,
    features: [
      "1 progetto",
      "10 decisioni per progetto",
      "Esportazione Markdown",
    ],
    limits: {
      projects: 1,
      decisionsPerProject: 10,
      workspaces: 1,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Per team in crescita",
    price: 9,
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    features: [
      "Progetti illimitati",
      "Decisioni illimitate",
      "Esportazione Markdown & PDF",
      "Supporto prioritario",
    ],
    limits: {
      projects: -1, // unlimited
      decisionsPerProject: -1, // unlimited
      workspaces: -1, // unlimited
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
