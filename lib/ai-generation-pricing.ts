/** Cents per 1M input tokens for integrated AI decision generation. */
const DEFAULT_AI_GENERATION_INPUT_CENTS_PER_1M = 84;
/** Cents per 1M output tokens for integrated AI decision generation. */
const DEFAULT_AI_GENERATION_OUTPUT_CENTS_PER_1M = 420;

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? fallback : n;
}

export function getAiGenerationInputCentsPer1M(): number {
  return parseNonNegativeInt(
    process.env.AI_GENERATION_BILLING_INPUT_CENTS_PER_1M,
    DEFAULT_AI_GENERATION_INPUT_CENTS_PER_1M
  );
}

export function getAiGenerationOutputCentsPer1M(): number {
  return parseNonNegativeInt(
    process.env.AI_GENERATION_BILLING_OUTPUT_CENTS_PER_1M,
    DEFAULT_AI_GENERATION_OUTPUT_CENTS_PER_1M
  );
}

export function estimateAiGenerationUsageCents(inputTokens: number, outputTokens: number): number {
  const inputCentsPer1M = getAiGenerationInputCentsPer1M();
  const outputCentsPer1M = getAiGenerationOutputCentsPer1M();
  return Math.round(
    (Math.max(0, inputTokens) / 1_000_000) * inputCentsPer1M +
      (Math.max(0, outputTokens) / 1_000_000) * outputCentsPer1M
  );
}
