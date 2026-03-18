/**
 * Stripe integration – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/stripe.ts.
 */

export const stripe = null as any;

export async function getOrCreateStripeCustomer(
  _userId: string,
  _email: string,
  _existingCustomerId?: string | null
): Promise<string> {
  throw new Error("Stripe is not available in self-hosted mode");
}

export async function createCheckoutSession(_opts: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<any> {
  throw new Error("Stripe is not available in self-hosted mode");
}

export async function createPortalSession(
  _customerId: string,
  _returnUrl: string
): Promise<any> {
  throw new Error("Stripe is not available in self-hosted mode");
}
