import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanId } from "@/types/billing";
import { estimateAiGenerationUsageCents } from "@/lib/ai-generation-pricing";

/** Current month in YYYY-MM format for ai_generations_usage.period. */
export function getAiGenerationUsagePeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseCap(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? fallback : n;
}

/**
 * Integrated AI generation monthly fair-use cap in cents by plan.
 * Returns null for plans that should not be capped by integrated fair-use.
 */
export function getAiGenerationFairUseMonthlyCapCents(planId: PlanId): number | null {
  if (planId === "free") {
    return parseCap(process.env.AI_GENERATION_FAIR_USE_FREE_CAP_CENTS, 100);
  }
  // Enterprise: no fair-use cap (BYO or custom agreement)
  return null;
}

export async function getUserPlanIdForFairUse(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanId> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (subscription?.plan_id ?? "free") as PlanId;
}

export async function getCurrentAiGenerationSpendCents(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const period = getAiGenerationUsagePeriod();
  const { data, error } = await supabase
    .from("ai_generations_usage")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();
  if (error || !data) return 0;
  return estimateAiGenerationUsageCents(
    Number(data.input_tokens ?? 0),
    Number(data.output_tokens ?? 0)
  );
}

export async function recordAiGenerationUsage(
  supabase: SupabaseClient,
  userId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  if (inputTokens < 0 || outputTokens < 0) return;
  const period = getAiGenerationUsagePeriod();
  await supabase.rpc("increment_ai_generation_usage_tokens", {
    p_user_id: userId,
    p_period: period,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
  });
}
