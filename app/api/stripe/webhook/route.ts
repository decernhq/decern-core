/**
 * Stripe webhook: aggiorna subscriptions via RPC Supabase (anon key + SUPABASE_WEBHOOK_SECRET).
 * Non usa la service role: il segreto si ottiene una volta da Supabase con
 *   select secret from app_webhook_secret;
 * e si imposta in .env come SUPABASE_WEBHOOK_SECRET.
 *
 * Test in locale: stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const secret = process.env.SUPABASE_WEBHOOK_SECRET?.trim();
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!secret) missing.push("SUPABASE_WEBHOOK_SECRET (esegui: select secret from app_webhook_secret in Supabase)");
  if (missing.length)
    throw new Error(`Webhook: variabili mancanti in .env: ${missing.join(", ")}`);
  return createClient(url!, key!);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      default: {
        const eventType = event.type as string;
        if (eventType === "invoice_payment.paid") {
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
        } else {
          console.log(`Unhandled event type: ${eventType}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

function planIdFromStripePriceId(priceId: string): "team" | "business" {
  const teamId = process.env.STRIPE_TEAM_PRICE_ID?.trim();
  const businessId = process.env.STRIPE_BUSINESS_PRICE_ID?.trim();
  if (businessId && priceId === businessId) return "business";
  if (teamId && priceId === teamId) return "team";
  return "team";
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("Webhook checkout.session.completed: missing userId or subscriptionId in session", {
      metadata: session.metadata,
      subscription: session.subscription,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const planId = planIdFromStripePriceId(priceId);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const secret = process.env.SUPABASE_WEBHOOK_SECRET!;
  const customerId = session.customer as string;

  const { error } = await getSupabaseAnon().rpc("stripe_webhook_checkout_completed", {
    p_secret: secret,
    p_user_id: userId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_plan_id: planId,
    p_current_period_end: currentPeriodEnd,
  });
  if (error) {
    console.error("Webhook: stripe_webhook_checkout_completed failed", { userId, error });
    throw error;
  }
  console.log(`Subscription activated for user: ${userId}, plan: ${planId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const statusMap: Record<string, string> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
  };
  const status = statusMap[subscription.status] || "active";
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const planId = planIdFromStripePriceId(priceId);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  const { error } = await getSupabaseAnon().rpc("stripe_webhook_subscription_updated", {
    p_secret: process.env.SUPABASE_WEBHOOK_SECRET!,
    p_stripe_customer_id: customerId,
    p_plan_id: planId,
    p_status: status,
    p_current_period_end: currentPeriodEnd,
  });
  if (error) throw error;
  console.log(`Subscription updated for customer: ${customerId}, plan: ${planId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const { error } = await getSupabaseAnon().rpc("stripe_webhook_subscription_deleted", {
    p_secret: process.env.SUPABASE_WEBHOOK_SECRET!,
    p_stripe_customer_id: customerId,
  });
  if (error) throw error;
  console.log(`Subscription canceled for customer: ${customerId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const { error } = await getSupabaseAnon().rpc("stripe_webhook_payment_failed", {
    p_secret: process.env.SUPABASE_WEBHOOK_SECRET!,
    p_stripe_customer_id: customerId,
  });
  if (error) throw error;
  console.log(`Payment failed for customer: ${customerId}`);

  const description = invoice.description ?? "";
  const isJudgeInvoice =
    !invoice.subscription &&
    /^Judge usage (\d{4}-\d{2})$/.test(description.trim());
  if (isJudgeInvoice) {
    const period = description.trim().replace(/^Judge usage /, "");
    const { error: judgeError } = await getSupabaseAnon().rpc("stripe_webhook_judge_invoice_failed", {
      p_secret: process.env.SUPABASE_WEBHOOK_SECRET!,
      p_stripe_customer_id: customerId,
      p_period: period,
    });
    if (judgeError) console.error("Judge invoice failed: reset billed_at error", judgeError);
    else console.log(`Judge usage ${period} marked for retry (customer: ${customerId})`);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const planId = planIdFromStripePriceId(priceId);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  const { error } = await getSupabaseAnon().rpc("stripe_webhook_invoice_paid", {
    p_secret: process.env.SUPABASE_WEBHOOK_SECRET!,
    p_stripe_customer_id: customerId,
    p_plan_id: planId,
    p_current_period_end: currentPeriodEnd,
  });
  if (error) throw error;
  console.log(`Invoice paid for customer: ${customerId}, plan: ${planId}`);
}
