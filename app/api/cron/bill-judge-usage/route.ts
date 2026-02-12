import { NextRequest, NextResponse } from "next/server";
import { billJudgeUsageForPeriod } from "@/lib/judge-billing";

/**
 * End-of-month billing for Judge usage.
 * Call with Authorization: Bearer <CRON_SECRET> (or set CRON_SECRET in env).
 * Query: ?period=YYYY-MM (default: previous month).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  let period: string;
  if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
    period = periodParam;
  } else {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  try {
    const result = await billJudgeUsageForPeriod(period);
    return NextResponse.json({
      ok: true,
      period: result.period,
      billedOwners: result.billedOwners,
      totalAmountCents: result.totalAmountCents,
      errors: result.errors.length ? result.errors : undefined,
    });
  } catch (e) {
    console.error("Bill judge usage failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Billing failed" },
      { status: 500 }
    );
  }
}
