/**
 * Judge billing – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/judge-billing.ts.
 */

export type BillJudgeUsageResult = {
  period: string;
  billedOwners: number;
  totalAmountCents: number;
  errors: string[];
};

export async function billJudgeUsageForPeriod(
  period: string
): Promise<BillJudgeUsageResult> {
  return { period, billedOwners: 0, totalAmountCents: 0, errors: [] };
}
