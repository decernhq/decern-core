import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const VALID_TOKEN = "ci-token-secret";
const WORKSPACE_ID = "ws-1";

/** Default LLM config sent by decern-gate (user's choice). We never store keys. */
const DEFAULT_LLM = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "sk-test-key",
  model: "gpt-4o-mini",
};

function createJudgeRequest(
  body: {
    diff: string;
    truncated?: boolean;
    baseSha?: string;
    headSha?: string;
    adrRef?: string;
    decisionId?: string;
    llm?: { baseUrl: string; apiKey: string; model: string };
  },
  auth?: string
): NextRequest {
  const url = "http://localhost/api/decision-gate/judge";
  const headers = new Headers({ "Content-Type": "application/json" });
  if (auth !== undefined) headers.set("Authorization", auth);
  const fullBody = { ...body, llm: body.llm ?? DEFAULT_LLM };
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify(fullBody),
  });
}

const mockWorkspaceMaybeSingle = vi.fn();
const mockSubscriptionMaybeSingle = vi.fn();
const mockDecisionMaybeSingle = vi.fn();
const mockProjectMaybeSingle = vi.fn();
const mockFetch = vi.fn();

const chainEqMaybe = (maybeSingle: typeof mockDecisionMaybeSingle) => {
  const chain = { maybeSingle, eq: () => chain };
  return chain;
};

const mockRpc = vi.fn();
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_key: string, _val?: string) =>
          table === "decisions"
            ? chainEqMaybe(mockDecisionMaybeSingle)
            : table === "subscriptions"
              ? { eq: () => ({ maybeSingle: mockSubscriptionMaybeSingle }) }
              : {
                  maybeSingle:
                    table === "workspaces" ? mockWorkspaceMaybeSingle : mockProjectMaybeSingle,
                },
      }),
    }),
    rpc: (_name: string, _args: unknown) => mockRpc(),
  }),
}));

vi.mock("@/lib/ci-token", () => ({
  hashCiToken: vi.fn((t: string) => (t === VALID_TOKEN ? "valid-hash" : "other-hash")),
}));

describe("POST /api/decision-gate/judge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: true });
    mockSubscriptionMaybeSingle.mockResolvedValue({
      data: { stripe_customer_id: "cus_test123", plan_id: "team" },
      error: null,
    });
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
          choices: [{ message: { content: '{"allowed": true, "reason": "Change aligns with ADR."}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 20 },
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

  it("owner has no subscription (treated as free) => Judge allowed, no billing check, LLM called", async () => {
    mockSubscriptionMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: true, reason: "Change aligns with ADR.", advisory: true });
    expect(mockFetch).toHaveBeenCalled();
  });

  it("owner on Team plan but no Stripe customer => 200 allowed: false, Billing not set up", async () => {
    mockSubscriptionMaybeSingle.mockResolvedValueOnce({
      data: { stripe_customer_id: null, plan_id: "team" },
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
    expect(data).toEqual({
      allowed: false,
      reason: "Billing not set up. Add a payment method to use the Judge.",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("owner on free plan => Judge allowed without billing, LLM called", async () => {
    mockSubscriptionMaybeSingle.mockResolvedValueOnce({
      data: { stripe_customer_id: null, plan_id: "free" },
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
    expect(data).toEqual({ allowed: true, reason: "Change aligns with ADR.", advisory: true });
    expect(mockFetch).toHaveBeenCalled();
  });

  it("unsupported plan => 200 allowed: false, Judge not available for this plan", async () => {
    mockSubscriptionMaybeSingle.mockResolvedValueOnce({
      data: { stripe_customer_id: "cus_xxx", plan_id: "starter" },
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
    expect(data).toEqual({ allowed: false, reason: "Judge is not available for this plan." });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("workspace rate limit exceeded => 200 allowed: false", async () => {
    mockRpc.mockResolvedValueOnce({ data: false });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Rate limit exceeded. Try again later." });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("owner rate limit exceeded => 200 allowed: false", async () => {
    mockRpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: false });
    const req = createJudgeRequest(
      { diff: "d", decisionId: "550e8400-e29b-41d4-a716-446655440000" },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: false, reason: "Rate limit exceeded. Try again later." });
    expect(mockFetch).not.toHaveBeenCalled();
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

  it("missing llm config => 200 allowed: false", async () => {
    const req = new NextRequest("http://localhost/api/decision-gate/judge", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        diff: "d",
        decisionId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.allowed).toBe(false);
    expect(data.reason).toContain("LLM configuration");
    expect(mockFetch).not.toHaveBeenCalled();
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
    expect(data).toEqual({ allowed: true, reason: "Change aligns with ADR.", advisory: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer sk-test-key" }),
      })
    );
  });

  it("LLM returns allowed: false => 200 allowed: false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content:
                  '{"allowed": false, "reason": "Diff introduces a new DB column not mentioned in the decision."}',
              },
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
      advisory: true,
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
          choices: [{ message: { content: "This is not JSON at all" } }],
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

  it("Anthropic baseUrl => calls native Messages API and returns allowed: true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ type: "text", text: '{"allowed": true, "reason": "Change aligns with the decision."}' }],
          usage: { input_tokens: 100, output_tokens: 20 },
        }),
    });
    const req = createJudgeRequest(
      {
        diff: "d",
        decisionId: "550e8400-e29b-41d4-a716-446655440000",
        llm: {
          baseUrl: "https://api.anthropic.com",
          apiKey: "sk-ant-secret",
          model: "claude-3-5-sonnet-20241022",
        },
      },
      `Bearer ${VALID_TOKEN}`
    );
    const { POST } = await import("./route");
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ allowed: true, reason: "Change aligns with the decision.", advisory: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "sk-ant-secret",
          "anthropic-version": "2023-06-01",
        }),
      })
    );
  });
});
