import { createClient } from "@/lib/supabase/server";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import type { JudgeGateRun } from "@/types/database";

export type GateRunStats = {
  total: number;
  flagged: number;
  alignedPercent: number;
  avgConfidencePercent: number | null;
  periodLabel: string;
};

const EMPTY_STATS: GateRunStats = {
  total: 0,
  flagged: 0,
  alignedPercent: 0,
  avgConfidencePercent: null,
  periodLabel: "",
};

/** Returns first day of current calendar month at 00:00 UTC. */
function getCurrentMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

/**
 * Stats for the selected workspace, current calendar month.
 * Aligned = allowed runs (effectively passed). Flagged = !allowed runs.
 */
export async function getGateRunStatsThisMonth(): Promise<GateRunStats> {
  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) return EMPTY_STATS;

  const supabase = await createClient();
  const since = getCurrentMonthStartIso();
  const { data, error } = await supabase
    .from("judge_gate_runs")
    .select("allowed, confidence_percent")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);

  if (error) {
    console.error("Error fetching gate run stats:", error);
    return EMPTY_STATS;
  }

  const rows = data ?? [];
  const total = rows.length;
  const aligned = rows.filter((r) => r.allowed === true).length;
  const flagged = total - aligned;
  const alignedPercent = total === 0 ? 0 : Math.round((aligned / total) * 100);

  const confidences = rows
    .map((r) => r.confidence_percent)
    .filter((v): v is number => typeof v === "number");
  const avgConfidencePercent =
    confidences.length === 0
      ? null
      : Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);

  const monthName = new Date(since).toLocaleString("en-US", { month: "long", year: "numeric" });

  return { total, flagged, alignedPercent, avgConfidencePercent, periodLabel: monthName };
}

/**
 * Most recent gate runs for the selected workspace (across all decisions).
 * Capped at `limit` rows, newest first.
 */
export async function getRecentGateRuns(limit = 20): Promise<JudgeGateRun[]> {
  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("judge_gate_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent gate runs:", error);
    return [];
  }

  return (data ?? []) as JudgeGateRun[];
}
