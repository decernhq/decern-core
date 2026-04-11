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
      if (table !== "evidence_records") {
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
      passed: 0,
      warned: 0,
      blocked: 0,
      passedPercent: 0,
      periodLabel: "",
    });
  });

  it("returns empty stats on db error", async () => {
    mockStatsRows.mockReturnValueOnce({ data: null, error: { message: "boom" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.total).toBe(0);
    expect(stats.passedPercent).toBe(0);
    consoleSpy.mockRestore();
  });

  it("counts verdicts and computes passedPercent", async () => {
    mockStatsRows.mockReturnValueOnce({
      data: [
        { verdict: "pass" },
        { verdict: "pass" },
        { verdict: "pass" },
        { verdict: "warn" },
        { verdict: "block" },
      ],
      error: null,
    });
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.total).toBe(5);
    expect(stats.passed).toBe(3);
    expect(stats.warned).toBe(1);
    expect(stats.blocked).toBe(1);
    expect(stats.passedPercent).toBe(60);
    expect(stats.periodLabel).toMatch(/\d{4}/);
  });

  it("rounds passed percent to nearest integer", async () => {
    // 2 of 3 passed => 66.66... => 67
    mockStatsRows.mockReturnValueOnce({
      data: [
        { verdict: "pass" },
        { verdict: "pass" },
        { verdict: "block" },
      ],
      error: null,
    });
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.passedPercent).toBe(67);
  });

  it("returns zero percent when no rows", async () => {
    mockStatsRows.mockReturnValueOnce({ data: [], error: null });
    const { getGateRunStatsThisMonth } = await import("./gate-runs");
    const stats = await getGateRunStatsThisMonth();
    expect(stats.total).toBe(0);
    expect(stats.passedPercent).toBe(0);
  });
});

describe("getRecentGateRuns", () => {
  it("returns empty array when no workspace is selected", async () => {
    mockSelectedWorkspaceId.mockResolvedValueOnce(null);
    const { getRecentGateRuns } = await import("./gate-runs");
    const runs = await getRecentGateRuns();
    expect(runs).toEqual([]);
  });

  it("maps evidence rows into GateRun shape", async () => {
    const fakeRows = [
      {
        evidence_id: "ev-1",
        timestamp_utc: "2026-01-01T00:00:00Z",
        verdict: "pass",
        reason_code: "OK",
        reason_detail: "",
        pull_request_id: "42",
        commit_sha: "abc123",
        repository_identifier: "acme/app",
        ci_provider: "github",
        diff_files_touched: ["src/a.ts"],
        deterministic_checks: [{ adr_id: "ADR-001", verdict: "pass" }],
        author_identity: { provider: "github", id: "u1", email: "a@b.c", display_name: "Alice" },
      },
    ];
    mockRecentRows.mockReturnValueOnce({ data: fakeRows, error: null });
    const { getRecentGateRuns } = await import("./gate-runs");
    const runs = await getRecentGateRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].evidence_id).toBe("ev-1");
    expect(runs[0].verdict).toBe("pass");
    expect(runs[0].repository_identifier).toBe("acme/app");
    expect(runs[0].diff_files_touched).toEqual(["src/a.ts"]);
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
