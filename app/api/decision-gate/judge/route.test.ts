import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const VALID_TOKEN = "ci-token-secret";
const WORKSPACE_ID = "ws-1";

function createJudgeRequest(
  body: {
    diff: string;
    truncated?: boolean;
    baseSha?: string;
    headSha?: string;
    adrRef?: string;
    decisionId?: string;
  },
  auth?: string
): NextRequest {
  const url = "http://localhost/api/decision-gate/judge";
  const headers = new Headers({ "Content-Type": "application/json" });
  if (auth !== undefined) headers.set("Authorization", auth);
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const mockWorkspaceMaybeSingle = vi.fn();
const mockDecisionMaybeSingle = vi.fn();
const mockProjectMaybeSingle = vi.fn();
const mockFetch = vi.fn();

const chainEqMaybe = (maybeSingle: typeof mockDecisionMaybeSingle) => {
  const chain = { maybeSingle, eq: () => chain };
  return chain;
};

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_key: string, _val?: string) =>
          table === "decisions"
            ? chainEqMaybe(mockDecisionMaybeSingle)
            : {
                maybeSingle:
                  table === "workspaces" ? mockWorkspaceMaybeSingle : mockProjectMaybeSingle,
              },
      }),
    }),
  }),
}));

vi.mock("@/lib/ci-token", () => ({
  hashCiToken: vi.fn((t: string) => (t === VALID_TOKEN ? "valid-hash" : "other-hash")),
}));

describe("POST /api/decision-gate/judge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockWorkspaceMaybeSingle.mockResolvedValue({
      data: { id: WORKSPACE_ID, owner_id: "user-1" },
      error: null,
    });
    mockDecisionMaybeSingle.mockResolvedValue({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        project_id: "proj-1",
        title: "Use PostgreSQL",
        context: "We need a DB.",
        options: ["PostgreSQL", "MongoDB"],
        decision: "We choose PostgreSQL.",
        consequences: "We get ACID.",
      },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValue({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ type: "text", text: '{"allowed": true, "reason": "Change aligns with ADR."}' }],
        }),
    });
    global.fetch = mockFetch;
  });

  it("no auth => 200 allowed: false, reason Unauthorized", async () => {
    const req = createJudgeRequest(
      { diff: "diff --git a/x b/x", decisionId: "550e8400-e29b-41d4-a716-446655440000" }
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Unauthorized." });
    expect(mockWorkspaceMaybeSingle).not.toHaveBeenCalled();
  });

  it("invalid body (not JSON) => 200 allowed: false", async () => {
    const req = new NextRequest("http://localhost/api/decision-gate/judge", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}`, "Content-Type": "application/json" },
      body: "not json",
    });
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.allowed).toBe(false);
    expect(data.reason).toContain("Invalid");
  });

  it("missing diff => 200 allowed: false", async () => {
    const req = createJudgeRequest(
      { diff: "", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Missing or empty diff." });
  });

  it("both adrRef and decisionId => 200 allowed: false", async () => {
    const req = createJudgeRequest(
      { diff: "d", adrRef: "ADR-001", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.allowed).toBe(false);
    expect(data.reason).toContain("exactly one");
  });

  it("neither adrRef nor decisionId => 200 allowed: false", async () => {
    const req = createJudgeRequest({ diff: "d" }, `Bearer ${VALID_TOKEN}`);
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.allowed).toBe(false);
    expect(data.reason).toContain("exactly one");
  });

  it("invalid decisionId => 200 allowed: false", async () => {
    const req = createJudgeRequest(
      { diff: "d", decisionId: "../../../etc/passwd" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Invalid adrRef or decisionId." });
  });

  it("wrong token => 200 allowed: false, Unauthorized", async () => {
    mockWorkspaceMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      "Bearer wrong-token"
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Unauthorized." });
    expect(mockDecisionMaybeSingle).not.toHaveBeenCalled();
  });

  it("decision not found => 200 allowed: false", async () => {
    mockDecisionMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Decision not found." });
  });

  it("decision in other workspace => 200 allowed: false", async () => {
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: "other-ws" },
      error: null,
    });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Decision not found." });
  });

  it("ANTHROPIC_API_KEY missing => 200 allowed: false, Judge unavailable", async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    process.env.ANTHROPIC_API_KEY = orig;
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Judge unavailable." });
  });

  it("LLM returns allowed: true => 200 allowed: true", async () => {
    const req = createJudgeRequest(
      { diff: "diff --git a/db b/db\n--- a/db\n+++ b/db\n@@ -0,0 +1 @@\n+postgres", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: true, reason: "Change aligns with ADR." });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "sk-ant-test-key" }),
      })
    );
  });

  it("LLM returns allowed: false => 200 allowed: false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [
            {
              type: "text",
              text: '{"allowed": false, "reason": "Diff introduces a new DB column not mentioned in the decision."}',
            },
          ],
        }),
    });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({
      allowed: false,
      reason: "Diff introduces a new DB column not mentioned in the decision.",
    });
  });

  it("LLM API error => 200 allowed: false, Judge unavailable", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502, text: () => Promise.resolve("Bad Gateway") });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Judge unavailable." });
  });

  it("LLM returns invalid JSON => 200 allowed: false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ type: "text", text: "This is not JSON at all" }],
        }),
    });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.allowed).toBe(false);
    expect(data.reason).toBe("Judge response invalid.");
  });

  it("adrRef lookup => resolves by workspace + adr_ref, then calls LLM", async () => {
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "uuid-adr",
        project_id: "proj-1",
        title: "ADR-002",
        context: "Context",
        options: [],
        decision: "Decision",
        consequences: "",
      },
      error: null,
    });
    const req = createJudgeRequest(
      { diff: "d", adrRef: "ADR-002" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.allowed).toBe(true);
    expect(mockProjectMaybeSingle).not.toHaveBeenCalled();
  });
});
