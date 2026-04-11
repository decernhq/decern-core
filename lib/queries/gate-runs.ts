import { createClient } from "@/lib/supabase/server";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";

export type GateRun = {
  evidence_id: string;
  timestamp_utc: string;
  verdict: "pass" | "warn" | "block";
  reason_code: string;
  reason_detail: string;
  pull_request_id: string;
  commit_sha: string;
  repository_identifier: string;
  ci_provider: string;
  diff_files_touched: string[];
  deterministic_checks: unknown[];
  author_identity: {
    provider?: string;
    id?: string;
    email?: string;
    display_name?: string;
  } | null;
};

export type GateRunStats = {
  total: number;
  passed: number;
  warned: number;
  blocked: number;
  passedPercent: number;
  periodLabel: string;
};

const EMPTY_STATS: GateRunStats = {
  total: 0,
  passed: 0,
  warned: 0,
  blocked: 0,
  passedPercent: 0,
  periodLabel: "",
};

/** First day of current calendar month at 00:00 UTC. */
function getCurrentMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

/**
 * Stats for the selected workspace, current calendar month.
 * Reads from evidence_records (v2 source of truth).
 */
export async function getGateRunStatsThisMonth(): Promise<GateRunStats> {
  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) return EMPTY_STATS;

  const supabase = await createClient();
  const since = getCurrentMonthStartIso();
  const { data, error } = await supabase
    .from("evidence_records")
    .select("verdict")
    .eq("workspace_id", workspaceId)
    .gte("timestamp_utc", since);

  if (error) {
    console.error("Error fetching gate run stats:", error);
    return EMPTY_STATS;
  }

  const rows = data ?? [];
  const total = rows.length;
  const passed = rows.filter((r) => r.verdict === "pass").length;
  const warned = rows.filter((r) => r.verdict === "warn").length;
  const blocked = rows.filter((r) => r.verdict === "block").length;
  const passedPercent = total === 0 ? 0 : Math.round((passed / total) * 100);

  const monthName = new Date(since).toLocaleString("en-US", { month: "long", year: "numeric" });

  return { total, passed, warned, blocked, passedPercent, periodLabel: monthName };
}

/**
 * Most recent gate runs for the selected workspace.
 * Reads from evidence_records (v2 source of truth).
 */
export async function getRecentGateRuns(limit = 20): Promise<GateRun[]> {
  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_records")
    .select("evidence_id, timestamp_utc, verdict, reason_code, reason_detail, pull_request_id, commit_sha, repository_identifier, ci_provider, diff_files_touched, deterministic_checks, author_identity")
    .eq("workspace_id", workspaceId)
    .order("timestamp_utc", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent gate runs:", error);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    evidence_id: r.evidence_id as string,
    timestamp_utc: r.timestamp_utc as string,
    verdict: r.verdict as "pass" | "warn" | "block",
    reason_code: r.reason_code as string,
    reason_detail: (r.reason_detail as string) ?? "",
    pull_request_id: (r.pull_request_id as string) ?? "",
    commit_sha: (r.commit_sha as string) ?? "",
    repository_identifier: (r.repository_identifier as string) ?? "",
    ci_provider: (r.ci_provider as string) ?? "",
    diff_files_touched: (r.diff_files_touched as string[]) ?? [],
    deterministic_checks: (r.deterministic_checks as unknown[]) ?? [],
    author_identity: r.author_identity as GateRun["author_identity"],
  }));
}
