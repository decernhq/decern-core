/**
 * Sync plan from Stripe to local DB (subscriptions table).
 * Use when the webhook didn't run (e.g. checkout in locale without stripe listen).
 *
 * Usage:
 *   npx tsx scripts/sync-plan-from-stripe.ts <stripe_customer_id>
 *   npx tsx scripts/sync-plan-from-stripe.ts <user_id>
 *
 * Examples:
 *   npx tsx scripts/sync-plan-from-stripe.ts cus_xxx
 *   npx tsx scripts/sync-plan-from-stripe.ts 550e8400-e29b-41d4-a716-446655440000
 *
 * Requires: .env or .env.local with STRIPE_SECRET_KEY, STRIPE_*_PRICE_ID,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const root = resolve(process.cwd());
  for (const f of [".env.local", ".env"]) {
    const p = resolve(root, f);
    if (existsSync(p)) {
      const content = readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  }
}

function planIdFromStripePriceId(priceId: string): "team" | "business" {
  const teamId = process.env.STRIPE_TEAM_PRICE_ID?.trim();
  const businessId = process.env.STRIPE_BUSINESS_PRICE_ID?.trim();
  if (businessId && priceId === businessId) return "business";
  if (teamId && priceId === teamId) return "team";
  return "team";
}

async function main() {
  loadEnv();

  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: npx tsx scripts/sync-plan-from-stripe.ts <stripe_customer_id | user_id>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey || !stripeKey) {
    console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or STRIPE_SECRET_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeKey, { typescript: true });

  const isCustomerId = arg.startsWith("cus_");
  let stripeCustomerId: string;
  let userId: string;

  if (isCustomerId) {
    stripeCustomerId = arg;
    const { data: row, error } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();
    if (error || !row) {
      console.error("Subscription not found for stripe_customer_id:", stripeCustomerId, error?.message ?? "");
      process.exit(1);
    }
    userId = row.user_id;
  } else {
    userId = arg;
    const { data: row, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row?.stripe_customer_id) {
      console.error("Subscription not found for user_id or missing stripe_customer_id:", userId, error?.message ?? "");
      process.exit(1);
    }
    stripeCustomerId = row.stripe_customer_id;
  }

  const subs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
  });

  const active = subs.data.filter((s) => s.status === "active" || s.status === "trialing");
  if (active.length === 0) {
    console.error("No active/trialing subscription found in Stripe for customer:", stripeCustomerId);
    process.exit(1);
  }

  // Prefer the subscription that has the highest plan (business > team)
  const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID?.trim();
  const businessPriceId = process.env.STRIPE_BUSINESS_PRICE_ID?.trim();
  const byPlanRank = (s: Stripe.Subscription) => {
    const priceId = s.items.data[0]?.price?.id ?? "";
    if (businessPriceId && priceId === businessPriceId) return 2;
    if (teamPriceId && priceId === teamPriceId) return 1;
    return 0;
  };
  active.sort((a, b) => byPlanRank(b) - byPlanRank(a));
  const sub = active[0];
  const priceId = sub.items.data[0]?.price?.id ?? "";
  const planId = planIdFromStripePriceId(priceId);
  const statusMap: Record<string, string> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
  };
  const status = statusMap[sub.status] ?? "active";
  const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: planId,
      status,
      current_period_end: currentPeriodEnd,
      stripe_subscription_id: sub.id,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }

  console.log("OK: synced plan from Stripe");
  console.log("  user_id:", userId);
  console.log("  stripe_customer_id:", stripeCustomerId);
  console.log("  stripe_subscription_id:", sub.id);
  console.log("  plan_id:", planId);
  console.log("  status:", status);
  console.log("  current_period_end:", currentPeriodEnd);
}

main();
