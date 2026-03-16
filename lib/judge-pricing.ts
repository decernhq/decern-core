/** Cents per 1M input tokens. Default = 3x Anthropic cost (~EUR 8.40 / 1M). */
const DEFAULT_INPUT_CENTS_PER_1M = 840;
/** Cents per 1M output tokens. Default = 3x Anthropic cost (~EUR 42.00 / 1M). */
const DEFAULT_OUTPUT_CENTS_PER_1M = 4200;

export function getInputCentsPer1M(): number {
  const v = process.env.JUDGE_BILLING_INPUT_CENTS_PER_1M;
  if (v != null && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_INPUT_CENTS_PER_1M;
}

export function getOutputCentsPer1M(): number {
  const v = process.env.JUDGE_BILLING_OUTPUT_CENTS_PER_1M;
  if (v != null && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_OUTPUT_CENTS_PER_1M;
}

export function estimateJudgeUsageCents(inputTokens: number, outputTokens: number): number {
  const inputCentsPer1M = getInputCentsPer1M();
  const outputCentsPer1M = getOutputCentsPer1M();
  return Math.round(
    (Math.max(0, inputTokens) / 1_000_000) * inputCentsPer1M +
      (Math.max(0, outputTokens) / 1_000_000) * outputCentsPer1M
  );
}
