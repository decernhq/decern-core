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
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const planId = body.planId ?? "pro";

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json({ error: "Piano non valido" }, { status: 400 });
    }

    if (!plan.priceId) {
      return NextResponse.json({ error: "Piano non valido" }, { status: 400 });
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
      { error: "Errore nella creazione del checkout" },
      { status: 500 }
    );
  }
}
