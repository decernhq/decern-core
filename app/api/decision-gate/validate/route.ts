import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCiToken } from "@/lib/ci-token";

const DECISION_ID_MAX_LENGTH = 128;
const DECISION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

type ValidateResponse =
  | { valid: true; decisionId: string; status: "approved" }
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
      .select("id")
      .eq("ci_token_hash", tokenHash)
      .maybeSingle();

    if (wsError) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (!workspace) {
      return json({ valid: false, reason: "unauthorized" }, 401);
    }

    const { data: decision, error: decError } = await supabase
      .from("decisions")
      .select("id, status, project:projects(workspace_id)")
      .eq("id", validated.id)
      .maybeSingle();

    if (decError) {
      return json({ valid: false, reason: "server_error" }, 500);
    }
    if (!decision) {
      return json({ valid: false, reason: "not_found" }, 404);
    }

    const project = decision.project as { workspace_id?: string } | { workspace_id?: string }[] | null;
    const workspaceIdFromDecision = Array.isArray(project)
      ? project[0]?.workspace_id
      : project?.workspace_id;
    if (!workspaceIdFromDecision || workspaceIdFromDecision !== workspace.id) {
      return json({ valid: false, reason: "not_found" }, 404);
    }

    const status = decision.status;
    if (status !== "approved") {
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
