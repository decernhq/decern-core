/**
 * Billing types for Stripe integration and plan limits
 */

export type PlanId = "free" | "pro" | "ultra" | "enterprise";

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
  priceId: string | null; // Stripe Price ID (null for free/enterprise)
  features: string[];
  limits: PlanLimits;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Per provare il flusso",
    price: 0,
    priceId: null,
    features: [
      "1 workspace",
      "1 progetto",
      "1 utente",
      "30 decisioni totali",
      "5 generazioni AI/mese",
    ],
    limits: {
      workspaces_limit: 1,
      projects_limit: 1,
      users_per_workspace_limit: 1,
      decisions_limit: 30,
      ai_generations_per_month: 5,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Freelance e piccoli team",
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    features: [
      "1 workspace",
      "Progetti illimitati",
      "Fino a 5 utenti",
      "Decisioni illimitate",
      "300 generazioni AI/mese",
    ],
    limits: {
      workspaces_limit: 1,
      projects_limit: -1,
      users_per_workspace_limit: 5,
      decisions_limit: -1,
      ai_generations_per_month: 300,
    },
  },
  ultra: {
    id: "ultra",
    name: "Ultra",
    description: "Team di prodotto/engineering",
    price: 49,
    priceId: process.env.STRIPE_ULTRA_PRICE_ID || "",
    features: [
      "Workspace illimitati",
      "Progetti illimitati",
      "Fino a 20 utenti per workspace",
      "Decisioni illimitate",
      "1.500 generazioni AI/mese",
    ],
    limits: {
      workspaces_limit: -1,
      projects_limit: -1,
      users_per_workspace_limit: 20,
      decisions_limit: -1,
      ai_generations_per_month: 1500,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Let's talk",
    price: 0,
    priceId: null,
    features: ["Limiti personalizzati", "Supporto dedicato"],
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
