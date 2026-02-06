import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCiToken } from "@/lib/ci-token";

const DECISION_ID_MAX_LENGTH = 128;
const DECISION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/** Free plan = CI observation only: gate never fails, but may return observationOnly + actual status */
const OBSERVATION_ONLY_PLANS = ["free"] as const;

type ValidateResponse =
  | { valid: true; decisionId: string; status: "approved" }
  | { valid: true; observationOnly: true; decisionId: string; status: string }
  | { valid: false; reason: "unauthorized" | "invalid_input" | "not_found" | "not_approved" | "server_error"; status?: string };

function json(body: ValidateResponse, status: number) {
  return NextResponse.json(body, { status });
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

  const decisionId = request.nextUrl.searchParams.get("decisionId");
  const validated = validateDecisionId(decisionId);
  if (!validated.ok) {
    return json({ valid: false, reason: "invalid_input" }, 422);
  }

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

    // Resolve plan for workspace owner (free = observation only: CI never fails)
    let observationOnly = false;
    if (workspace.owner_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", workspace.owner_id)
        .eq("status", "active")
        .maybeSingle();
      const planId = (sub as { plan_id?: string } | null)?.plan_id ?? "free";
      observationOnly = OBSERVATION_ONLY_PLANS.includes(planId as (typeof OBSERVATION_ONLY_PLANS)[number]);
    }

    // Two explicit queries (decision → project) so workspace ownership is 100% reliable
    // without depending on Supabase nested select / FK naming (project:projects(...)).
    const { data: decision, error: decError } = await supabase
      .from("decisions")
      .select("id, status, project_id")
      .eq("id", validated.id)
      .maybeSingle();

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

    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", decision.project_id)
      .maybeSingle();

    if (projError) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (Array.isArray(project)) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (!project?.workspace_id || project.workspace_id !== workspace.id) {
      return json({ valid: false, reason: "not_found" }, 404);
    }

    const status = decision.status as string;
    if (status !== "approved") {
      if (observationOnly) {
        return json(
          { valid: true, observationOnly: true, decisionId: decision.id, status },
          200
        );
      }
      return json({ valid: false, reason: "not_approved", status }, 422);
    }

    return json(
      { valid: true, decisionId: decision.id, status: "approved" },
      200
    );
  } catch {
    return json({ valid: false, reason: "server_error" }, 500);
  }
}
