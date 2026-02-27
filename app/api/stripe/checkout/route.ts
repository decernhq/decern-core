import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateStripeCustomer, createCheckoutSession } from "@/lib/stripe";
import { PLANS } from "@/types/billing";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const planId = body.planId ?? "team";

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!plan.priceId?.trim()) {
      return NextResponse.json(
        {
          error:
            "Stripe not configured for this plan. Set STRIPE_TEAM_PRICE_ID or STRIPE_BUSINESS_PRICE_ID in .env.",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email!,
      subscription?.stripe_customer_id
    );

    if (!subscription?.stripe_customer_id) {
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const session = await createCheckoutSession({
      customerId,
      priceId: plan.priceId,
      userId: user.id,
      successUrl: `${appUrl}/dashboard?checkout=success`,
      cancelUrl: `${appUrl}/pricing?checkout=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    );
  }
}
