import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCiToken } from "@/lib/ci-token";

const DECISION_ID_MAX_LENGTH = 128;
const DECISION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
/** Short ref format: ADR-1, ADR-01, ADR-001, etc. (lookup by workspace + adr_ref) */
const ADR_REF_REGEX = /^ADR-\d+$/i;

/** Free = always observation. Team = enforcement only when highImpact=true. Business+ = enforcement by default, overridable with enforce=false. */
function isObservationMode(planId: string, highImpact: boolean, enforce: boolean): boolean {
  if (planId === "free") return true;
  if (planId === "team") return !highImpact; // Team: blocking only when highImpact=true
  if (["business", "enterprise", "governance"].includes(planId)) return !enforce; // Business+: enforcement by default
  return true; // unknown plan: safe default
}

type ValidateResponse =
  | { valid: true; decisionId: string; adrRef: string | null; hasLinkedPR?: boolean; status?: "approved" }
  | { valid: false; reason: "unauthorized" | "invalid_input" | "not_found" | "not_approved" | "server_error"; status?: string };

function json(body: ValidateResponse, status: number) {
  return NextResponse.json(body, { status });
}

/** Normalize pull_request_urls from DB: can be array or Postgres text representation */
function normalizePullRequestUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((u): u is string => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return normalizePullRequestUrls(parsed);
      return [];
    } catch {
      if (value.startsWith("{") && value.endsWith("}")) {
        return value
          .slice(1, -1)
          .split(",")
          .map((s) => s.replace(/^"|"$/g, "").trim())
          .filter(Boolean);
      }
      return [];
    }
  }
  return [];
}

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function validateDecisionId(decisionId: string | null): { ok: true; id: string } | { ok: false } {
  if (decisionId == null || typeof decisionId !== "string") return { ok: false };
  const trimmed = decisionId.trim();
  if (trimmed.length === 0 || trimmed.length > DECISION_ID_MAX_LENGTH) return { ok: false };
  if (!DECISION_ID_REGEX.test(trimmed)) return { ok: false };
  return { ok: true, id: trimmed };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return json({ valid: false, reason: "unauthorized" }, 401);
  }

  const decisionIdParam = request.nextUrl.searchParams.get("decisionId");
  const adrRefTrimmed = request.nextUrl.searchParams.get("adrRef")?.trim() ?? "";
  const useAdrRef = adrRefTrimmed.length > 0;
  const highImpact = /^(true|1)$/i.test(request.nextUrl.searchParams.get("highImpact") ?? "");
  const enforceParam = request.nextUrl.searchParams.get("enforce");
  const enforce =
    enforceParam === undefined || enforceParam === null || enforceParam === ""
      ? true
      : /^(true|1)$/i.test(enforceParam);
  const validated = useAdrRef
    ? ADR_REF_REGEX.test(adrRefTrimmed) && adrRefTrimmed.length <= DECISION_ID_MAX_LENGTH
      ? { ok: true as const, id: adrRefTrimmed }
      : { ok: false as const }
    : validateDecisionId(decisionIdParam);
  if (!validated.ok) {
    return json({ valid: false, reason: "invalid_input" }, 422);
  }
  const isAdrRefLookup = useAdrRef;

  try {
    const supabase = createServiceRoleClient();
    const tokenHash = hashCiToken(token);

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, owner_id")
      .eq("ci_token_hash", tokenHash)
      .maybeSingle();

    if (wsError) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (Array.isArray(workspace)) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (!workspace?.id) {
      return json({ valid: false, reason: "unauthorized" }, 401);
    }

    // Free: always observation. Team: enforcement only when highImpact=true. Business+: enforcement by default, enforce=false → observation
    let isObservationOnlyPlan = true;
    if (workspace.owner_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", workspace.owner_id)
        .eq("status", "active")
        .maybeSingle();
      const planId = (sub as { plan_id?: string } | null)?.plan_id ?? "free";
      isObservationOnlyPlan = isObservationMode(planId, highImpact, enforce);
    }

    // Resolve decision: by id (UUID) or by adrRef (ADR-001) within this workspace
    let query = supabase
      .from("decisions")
      .select("id, status, project_id, adr_ref, pull_request_urls")
      .eq(isAdrRefLookup ? "workspace_id" : "id", isAdrRefLookup ? workspace.id : validated.id);
    if (isAdrRefLookup) {
      query = query.eq("adr_ref", validated.id);
    }
    const { data: decision, error: decError } = await query.maybeSingle();

    if (decError) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (Array.isArray(decision)) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (!decision) {
      return json({ valid: false, reason: "not_found" }, 404);
    }
    // Domain invariant: every decision belongs to a project; null = data inconsistency
    if (decision.project_id == null || decision.project_id === undefined) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    // When lookup was by adr_ref, decision is already in this workspace; when by id, verify
    if (!isAdrRefLookup) {
      const { data: project, error: projError } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", decision.project_id)
        .maybeSingle();

      if (projError) {
        return json({ valid: false, reason: "server_error" }, 500);
      }
      if (Array.isArray(project) || !project?.workspace_id || project.workspace_id !== workspace.id) {
        return json({ valid: false, reason: "not_found" }, 404);
      }
    }

    const adrRef = (decision as { adr_ref?: string }).adr_ref ?? null;
    const pullRequestUrlsRaw = (decision as { pull_request_urls?: unknown }).pull_request_urls;
    const pullRequestUrls = normalizePullRequestUrls(pullRequestUrlsRaw);
    const hasLinkedPR = pullRequestUrls.length > 0;

    const status = decision.status as string;
    if (status !== "approved" && !isObservationOnlyPlan) {
      return json({ valid: false, reason: "not_approved", status }, 422);
    }
    // Free: valid, decisionId, adrRef only. Paid: also hasLinkedPR and status "approved"
    return json(
      {
        valid: true,
        decisionId: decision.id,
        adrRef,
        ...(!isObservationOnlyPlan && { hasLinkedPR, status: "approved" as const }),
      },
      200
    );
  } catch {
    return json({ valid: false, reason: "server_error" }, 500);
  }
}
