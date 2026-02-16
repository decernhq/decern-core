"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { stripe } from "@/lib/stripe";

/** Cents per 1M input tokens. Default = 3× Anthropic cost (~€2.80/1M → ~€8.40/1M = 840 cents). */
const DEFAULT_INPUT_CENTS_PER_1M = 840;
/** Cents per 1M output tokens. Default = 3× Anthropic cost (~€14/1M → ~€42/1M = 4200 cents). */
const DEFAULT_OUTPUT_CENTS_PER_1M = 4200;

function getInputCentsPer1M(): number {
  const v = process.env.JUDGE_BILLING_INPUT_CENTS_PER_1M;
  if (v != null && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_INPUT_CENTS_PER_1M;
}

function getOutputCentsPer1M(): number {
  const v = process.env.JUDGE_BILLING_OUTPUT_CENTS_PER_1M;
  if (v != null && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_OUTPUT_CENTS_PER_1M;
}

export type BillJudgeUsageResult = {
  period: string;
  billedOwners: number;
  totalAmountCents: number;
  errors: string[];
};

/**
 * Bill all unbilled judge usage for a given period (YYYY-MM).
 * Groups usage by workspace owner, creates one Stripe invoice per owner with usage,
 * then marks all rows for that period as billed.
 */
export async function billJudgeUsageForPeriod(period: string): Promise<BillJudgeUsageResult> {
  const errors: string[] = [];
  let billedOwners = 0;
  let totalAmountCents = 0;

  const supabase = createServiceRoleClient();

  const { data: rows, error: fetchError } = await supabase
    .from("judge_usage")
    .select("workspace_id, input_tokens, output_tokens")
    .eq("period", period)
    .is("billed_at", null);

  if (fetchError) {
    return { period, billedOwners: 0, totalAmountCents: 0, errors: [fetchError.message] };
  }
  if (!rows?.length) {
    return { period, billedOwners: 0, totalAmountCents: 0, errors: [] };
  }

  const workspaceIds = Array.from(new Set(rows.map((r) => r.workspace_id)));
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, owner_id")
    .in("id", workspaceIds);
  const workspaceByOwner = new Map<string, { input_tokens: number; output_tokens: number }>();

  for (const r of rows) {
    const w = workspaces?.find((x) => x.id === r.workspace_id);
    if (!w?.owner_id) continue;
    const key = w.owner_id;
    const cur = workspaceByOwner.get(key) ?? { input_tokens: 0, output_tokens: 0 };
    cur.input_tokens += Number(r.input_tokens ?? 0);
    cur.output_tokens += Number(r.output_tokens ?? 0);
    workspaceByOwner.set(key, cur);
  }

  const ownerIds = Array.from(workspaceByOwner.keys());
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, stripe_customer_id")
    .in("user_id", ownerIds)
    .not("stripe_customer_id", "is", null);

  const customerByOwner = new Map<string, string>();
  for (const s of subs ?? []) {
    if (s.stripe_customer_id) customerByOwner.set(s.user_id, s.stripe_customer_id);
  }

  const inputCentsPer1M = getInputCentsPer1M();
  const outputCentsPer1M = getOutputCentsPer1M();
  const billedOwnerIds: string[] = [];

  for (const [ownerId, tokens] of Array.from(workspaceByOwner.entries())) {
    const customerId = customerByOwner.get(ownerId);
    if (!customerId) {
      errors.push(`Owner ${ownerId} has no Stripe customer; skip billing`);
      continue;
    }
    const amountCents = Math.round(
      (tokens.input_tokens / 1_000_000) * inputCentsPer1M +
        (tokens.output_tokens / 1_000_000) * outputCentsPer1M
    );
    if (amountCents <= 0) continue;

    try {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: amountCents,
        currency: "eur",
        description: `Judge usage ${period} (Decision Gate)`,
      });
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: "charge_automatically",
        auto_advance: true,
        description: `Judge usage ${period}`,
      });
      await stripe.invoices.finalizeInvoice(invoice.id);
      billedOwners += 1;
      totalAmountCents += amountCents;
      billedOwnerIds.push(ownerId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Owner ${ownerId} (${customerId}): ${msg}`);
    }
  }

  if (billedOwnerIds.length > 0) {
    const { data: workspaceIdsToMark } = await supabase
      .from("workspaces")
      .select("id")
      .in("owner_id", billedOwnerIds);
    const ids = (workspaceIdsToMark ?? []).map((w) => w.id);
    if (ids.length > 0) {
      const { error: updateError } = await supabase
        .from("judge_usage")
        .update({ billed_at: new Date().toISOString() })
        .eq("period", period)
        .in("workspace_id", ids);
      if (updateError) errors.push(`Failed to set billed_at: ${updateError.message}`);
    }
  }

  return { period, billedOwners, totalAmountCents, errors };
}
