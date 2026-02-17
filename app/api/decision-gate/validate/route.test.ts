import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const VALID_TOKEN = "ci-token-secret";
const WORKSPACE_ID = "ws-1";

function createRequest(options: {
  decisionId?: string;
  adrRef?: string;
  auth?: string;
  highImpact?: boolean;
  enforce?: boolean;
  requireLinkedPR?: boolean;
  requireApproved?: boolean;
}): NextRequest {
  const search = new URLSearchParams();
  if (options.decisionId != null) search.set("decisionId", options.decisionId);
  if (options.adrRef != null) search.set("adrRef", options.adrRef);
  if (options.highImpact === true) search.set("highImpact", "true");
  if (options.enforce === false) search.set("enforce", "false");
  if (options.requireLinkedPR === true) search.set("requireLinkedPR", "true");
  if (options.requireApproved === false) search.set("requireApproved", "false");
  const params = search.toString() ? `?${search.toString()}` : "";
  const url = `http://localhost/api/decision-gate/validate${params}`;
  const headers = new Headers();
  if (options.auth !== undefined) headers.set("Authorization", options.auth);
  return new NextRequest(url, { headers });
}

const mockWorkspaceMaybeSingle = vi.fn();
const mockDecisionMaybeSingle = vi.fn();
const mockProjectMaybeSingle = vi.fn();
const mockSubMaybeSingle = vi.fn();
const mockWorkspacePoliciesMaybeSingle = vi.fn();

/** Builder that supports any number of .eq() then .maybeSingle(); maybeSingle is always a function. */
function makeChain(maybeSingleFn: () => Promise<unknown>) {
  return {
    eq: () => makeChain(maybeSingleFn),
    maybeSingle: maybeSingleFn,
  };
}

function getMaybeSingleForTable(table: string) {
  switch (table) {
    case "workspaces":
      return mockWorkspaceMaybeSingle;
    case "subscriptions":
      return () => Promise.resolve(mockSubMaybeSingle());
    case "workspace_policies":
      return mockWorkspacePoliciesMaybeSingle;
    case "decisions":
      return mockDecisionMaybeSingle;
    default:
      return mockProjectMaybeSingle;
  }
}

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: () => makeChain(getMaybeSingleForTable(table)),
    }),
  }),
}));

vi.mock("@/lib/ci-token", () => ({
  hashCiToken: vi.fn((t: string) => (t === VALID_TOKEN ? "valid-hash" : "other-hash")),
}));

describe("GET /api/decision-gate/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    mockWorkspaceMaybeSingle.mockResolvedValue({
      data: { id: WORKSPACE_ID, owner_id: "user-1" },
      error: null,
    });
    mockSubMaybeSingle.mockResolvedValue({ data: { plan_id: "team" }, error: null });
    mockWorkspacePoliciesMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("1) no auth => 401", async () => {
    const req = createRequest({ decisionId: "550e8400-e29b-41d4-a716-446655440000" });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ valid: false, reason: "unauthorized" });
    expect(mockWorkspaceMaybeSingle).not.toHaveBeenCalled();
  });

  it("2) token errato => 401", async () => {
    mockWorkspaceMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const req = createRequest({
      decisionId: "550e8400-e29b-41d4-a716-446655440000",
      auth: "Bearer wrong-token",
    });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ valid: false, reason: "unauthorized" });
    expect(mockDecisionMaybeSingle).not.toHaveBeenCalled();
  });

  it("3) decisionId invalido => 422", async () => {
    const req = createRequest({
      decisionId: "../../../etc/passwd",
      auth: `Bearer ${VALID_TOKEN}`,
    });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toEqual({ valid: false, reason: "invalid_input" });
    expect(mockWorkspaceMaybeSingle).not.toHaveBeenCalled();
  });

  it("3b) decisionId vuoto => 422", async () => {
    const req = createRequest({ decisionId: "", auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toEqual({ valid: false, reason: "invalid_input" });
  });

  it("3c) decisionId mancante => 422", async () => {
    const req = createRequest({ auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toEqual({ valid: false, reason: "invalid_input" });
  });

  it("4) decision non found => 404", async () => {
    mockDecisionMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ valid: false, reason: "not_found" });
    expect(mockWorkspaceMaybeSingle).toHaveBeenCalled();
    expect(mockDecisionMaybeSingle).toHaveBeenCalled();
  });

  it("5) Team + highImpact=true + decision not approved => 422", async () => {
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "proposed", project_id: "proj-1" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}`, highImpact: true });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toEqual({ valid: false, reason: "not_approved", status: "proposed" });
  });

  it("6) Team + highImpact=true + decision approved => 200 with status", async () => {
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "approved", project_id: "proj-1", adr_ref: "ADR-042" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}`, highImpact: true });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId, adrRef: "ADR-042", hasLinkedPR: false, status: "approved" });
  });

  it("6b) Team + highImpact + adrRef=ADR-001 => lookup by workspace + adr_ref, 200 con status", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: {
        id: uuid,
        status: "approved",
        project_id: "proj-1",
        adr_ref: "ADR-001",
      },
      error: null,
    });
    const req = createRequest({ adrRef: "ADR-001", auth: `Bearer ${VALID_TOKEN}`, highImpact: true });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId: uuid, adrRef: "ADR-001", hasLinkedPR: false, status: "approved" });
    expect(mockProjectMaybeSingle).not.toHaveBeenCalled();
  });

  it("decision in altro workspace => 404", async () => {
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "approved", project_id: "proj-1" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: "other-workspace" },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ valid: false, reason: "not_found" });
  });

  it("server_error when DB returns error => 500", async () => {
    mockWorkspaceMaybeSingle.mockResolvedValueOnce({ data: null, error: new Error("DB error") });
    const req = createRequest({
      decisionId: "550e8400-e29b-41d4-a716-446655440000",
      auth: `Bearer ${VALID_TOKEN}`,
    });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ valid: false, reason: "server_error" });
  });

  it("7) free plan + decision not approved => 200 solo valid, decisionId, adrRef (no hasLinkedPR, no status)", async () => {
    mockSubMaybeSingle.mockResolvedValueOnce({ data: { plan_id: "free" }, error: null });
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "proposed", project_id: "proj-1", adr_ref: "ADR-042" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId, adrRef: "ADR-042" });
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("hasLinkedPR");
  });

  it("8) free plan + decision approved => 200 solo valid, decisionId, adrRef (no hasLinkedPR, no status)", async () => {
    mockSubMaybeSingle.mockResolvedValueOnce({ data: { plan_id: "free" }, error: null });
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "approved", project_id: "proj-1", adr_ref: "ADR-001" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId, adrRef: "ADR-001" });
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("hasLinkedPR");
  });

  it("Team without highImpact + decision not approved => 200 observation (no 422)", async () => {
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "proposed", project_id: "proj-1", adr_ref: "ADR-042" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId, adrRef: "ADR-042" });
    expect(body).not.toHaveProperty("status");
  });

  it("Team without highImpact + decision approved => 200 observation body", async () => {
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "approved", project_id: "proj-1", adr_ref: "ADR-042" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId, adrRef: "ADR-042" });
    expect(body).not.toHaveProperty("hasLinkedPR");
    expect(body).not.toHaveProperty("status");
  });

  it("Business + enforce=false + decision not approved => 200 observation", async () => {
    mockSubMaybeSingle.mockResolvedValueOnce({ data: { plan_id: "business" }, error: null });
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "proposed", project_id: "proj-1", adr_ref: "ADR-042" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}`, enforce: false });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId, adrRef: "ADR-042" });
    expect(body).not.toHaveProperty("status");
  });

  it("Business default (enforce) + decision not approved => 422", async () => {
    mockSubMaybeSingle.mockResolvedValueOnce({ data: { plan_id: "business" }, error: null });
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "rejected", project_id: "proj-1", adr_ref: "ADR-042" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}` });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toEqual({ valid: false, reason: "not_approved", status: "rejected" });
  });

  it("Business + requireLinkedPR=true + no linked PR => 422 linked_pr_required", async () => {
    mockSubMaybeSingle.mockResolvedValueOnce({ data: { plan_id: "business" }, error: null });
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: {
        id: decisionId,
        status: "approved",
        project_id: "proj-1",
        adr_ref: "ADR-042",
        pull_request_urls: [],
      },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}`, requireLinkedPR: true });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toEqual({ valid: false, reason: "linked_pr_required" });
  });

  it("Business + requireApproved=false + decision not approved => 200", async () => {
    mockSubMaybeSingle.mockResolvedValueOnce({ data: { plan_id: "business" }, error: null });
    const decisionId = "550e8400-e29b-41d4-a716-446655440000";
    mockDecisionMaybeSingle.mockResolvedValueOnce({
      data: { id: decisionId, status: "proposed", project_id: "proj-1", adr_ref: "ADR-042" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { workspace_id: WORKSPACE_ID },
      error: null,
    });
    const req = createRequest({ decisionId, auth: `Bearer ${VALID_TOKEN}`, requireApproved: false });
    const { GET } = await import("./route");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ valid: true, decisionId, adrRef: "ADR-042", hasLinkedPR: false, status: "approved" });
  });
});
