/**
 * Sync subscription with Stripe – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/sync-subscription.ts.
 */
export async function syncSubscriptionIfStale(
  _userId: string,
  _stripeCustomerId: string | null,
  _currentPeriodEnd: string | null,
  _status: string | null
): Promise<void> {
  // No-op in self-hosted mode (no Stripe).
}
