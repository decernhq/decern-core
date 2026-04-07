import { describe, it, expect, vi, beforeEach } from "vitest";

const WORKSPACE_ID = "ws-1";
const mockSelectedWorkspaceId = vi.fn<() => Promise<string | null>>();
const mockStatsRows = vi.fn<() => { data: unknown; error: unknown }>();
const mockRecentRows = vi.fn<() => { data: unknown; error: unknown }>();

vi.mock("@/lib/workspace-cookie", () => ({
  getSelectedWorkspaceId: () => mockSelectedWorkspaceId(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "judge_gate_runs") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select: (_cols: string) => ({
          eq: (_key: string, _val: string) => ({
            // Stats query path: .gte(...)
            gte: (_k: string, _v: string) => Promise.resolve(mockStatsRows()),
            // Recent query path: .order(...).limit(...)
            order: (_k: string, _opts: unknown) => ({
              limit: (_n: number) => Promise.resolve(mockRecentRows()),
            }),
          }),
        }),
      };
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectedWorkspaceId.mockResolvedValue(WORKSPACE_ID);
  mockStatsRows.mockReturnValue({ data: [], error: null });
  mockRecentRows.mockReturnValue({ data: [], error: null });
});

describe("getGateRunStatsThisMonth", () => {
  it("returns empty stats when no workspace is selected", async () => {
    mockSelectedWorkspaceId.mockResolvedValueOnce(null);
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats).toEqual({
      total: 0,
      flagged: 0,
      alignedPercent: 0,
      avgConfidencePercent: null,
      periodLabel: "",
    });
  });

  it("returns empty stats on db error", async () => {
    mockStatsRows.mockReturnValueOnce({ data: null, error: { message: "boom" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.total).toBe(0);
    expect(stats.alignedPercent).toBe(0);
    expect(stats.avgConfidencePercent).toBeNull();
    consoleSpy.mockRestore();
  });

  it("computes aligned percent, flagged count, and avg confidence", async () => {
    mockStatsRows.mockReturnValueOnce({
      data: [
        { allowed: true, confidence_percent: 90 },
        { allowed: true, confidence_percent: 80 },
        { allowed: true, confidence_percent: 100 },
        { allowed: false, confidence_percent: 30 },
      ],
      error: null,
    });
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.total).toBe(4);
    expect(stats.flagged).toBe(1);
    expect(stats.alignedPercent).toBe(75);
    expect(stats.avgConfidencePercent).toBe(75); // (90+80+100+30)/4
    expect(stats.periodLabel).toMatch(/\d{4}/);
  });

  it("rounds aligned percent to nearest integer", async () => {
    // 2 of 3 aligned => 66.66... => 67
    mockStatsRows.mockReturnValueOnce({
      data: [
        { allowed: true, confidence_percent: null },
        { allowed: true, confidence_percent: null },
        { allowed: false, confidence_percent: null },
      ],
      error: null,
    });
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.alignedPercent).toBe(67);
  });

  it("returns null avg confidence when all rows have null confidence", async () => {
    mockStatsRows.mockReturnValueOnce({
      data: [
        { allowed: true, confidence_percent: null },
        { allowed: false, confidence_percent: null },
      ],
      error: null,
    });
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.avgConfidencePercent).toBeNull();
    expect(stats.total).toBe(2);
    expect(stats.flagged).toBe(1);
  });

  it("ignores null confidence rows when computing the average", async () => {
    mockStatsRows.mockReturnValueOnce({
      data: [
        { allowed: true, confidence_percent: 80 },
        { allowed: true, confidence_percent: null },
        { allowed: true, confidence_percent: 60 },
      ],
      error: null,
    });
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.avgConfidencePercent).toBe(70); // (80+60)/2
  });
});

describe("getRecentGateRuns", () => {
  it("returns empty array when no workspace is selected", async () => {
    mockSelectedWorkspaceId.mockResolvedValueOnce(null);
    const { getRecentGateRuns } = await import("./gate-runs");
    const runs = await getRecentGateRuns();
    expect(runs).toEqual([]);
  });

  it("returns rows from the database", async () => {
    const fakeRows = [
      { id: "1", workspace_id: WORKSPACE_ID, allowed: true, advisory: false },
      { id: "2", workspace_id: WORKSPACE_ID, allowed: false, advisory: false },
    ];
    mockRecentRows.mockReturnValueOnce({ data: fakeRows, error: null });
    const { getRecentGateRuns } = await import("./gate-runs");
    const runs = await getRecentGateRuns();
    expect(runs).toEqual(fakeRows);
  });

  it("returns empty array on db error", async () => {
    mockRecentRows.mockReturnValueOnce({ data: null, error: { message: "boom" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getRecentGateRuns } = await import("./gate-runs");
    const runs = await getRecentGateRuns();
    expect(runs).toEqual([]);
    consoleSpy.mockRestore();
  });
});
