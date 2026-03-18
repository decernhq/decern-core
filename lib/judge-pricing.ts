/**
 * Judge pricing – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/judge-pricing.ts.
 */

export function getInputCentsPer1M(): number {
  return 0;
}

export function getOutputCentsPer1M(): number {
  return 0;
}

export function estimateJudgeUsageCents(
  _inputTokens: number,
  _outputTokens: number
): number {
  return 0;
}
