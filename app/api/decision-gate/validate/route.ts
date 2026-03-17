import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCiToken } from "@/lib/ci-token";
import {
  mergeValidateParams,
  isBlockingMode,
  shouldRequireLinkedPR,
  shouldRequireApproved,
  type PlanId,
} from "@/lib/decision-gate-policies";

const DECISION_ID_MAX_LENGTH = 128;
const DECISION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
/** Short ref format: ADR-1, ADR-01, ADR-001, etc. (lookup by workspace + adr_ref) */
const ADR_REF_REGEX = /^ADR-\d+$/i;

type ValidateResponse =
  | {
      valid: true;
      decisionId: string;
      adrRef: string | null;
      observation?: boolean;
      status?: string;
      message?: string;
    }
  | {
      valid: false;
      reason: "unauthorized" | "invalid_input" | "not_found" | "not_approved" | "linked_pr_required" | "server_error";
      status?: string;
    };

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

    const [{ data: sub }, { data: workspacePolicies }] = await Promise.all([
      supabase.from("subscriptions").select("plan_id").eq("user_id", workspace.owner_id).eq("status", "active").maybeSingle(),
      supabase.from("workspace_policies").select("enforce, require_linked_pr, require_approved").eq("workspace_id", workspace.id).maybeSingle(),
    ]);
    const planId = ((sub as { plan_id?: string } | null)?.plan_id ?? "free") as PlanId;
    const policyParams = mergeValidateParams(workspacePolicies ?? null, request.nextUrl.searchParams);
    const blocking = isBlockingMode(planId, policyParams);

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

    // Policies applied in order when in blocking mode:
    // 1. Linked PR (Business + requireLinkedPR)
    if (blocking && shouldRequireLinkedPR(planId, policyParams) && !hasLinkedPR) {
      return json({ valid: false, reason: "linked_pr_required" }, 422);
    }
    // 2. Status (Team when highImpact, Business when requireApproved)
    if (blocking && shouldRequireApproved(planId, policyParams) && status !== "approved") {
      return json({ valid: false, reason: "not_approved", status }, 422);
    }

    // Success: build response (all plans in observation mode include status)
    const observation = !blocking;
    const includeStatus = true;
    return json(
      {
        valid: true,
        decisionId: decision.id,
        adrRef,
        observation,
        ...(includeStatus && { status: blocking ? ("approved" as const) : status }),
      },
      200
    );
  } catch {
    return json({ valid: false, reason: "server_error" }, 500);
  }
}
