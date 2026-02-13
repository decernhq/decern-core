import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCiToken } from "@/lib/ci-token";
import { recordJudgeUsage } from "@/lib/judge-usage";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const ANTHROPIC_VERSION = "2023-06-01";
const DECISION_ID_MAX_LENGTH = 128;
const DECISION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ADR_REF_REGEX = /^ADR-\d+$/i;
/** Max diff length to send to LLM (~25k tokens if 4 chars/token). Backend truncation if client sent more. */
const MAX_DIFF_CHARS = 120_000;

/** Judge is only available on paid plans (Team and above). */
const JUDGE_ALLOWED_PLANS = new Set(["team", "business", "enterprise", "governance"]);

export type JudgeRequestBody = {
  diff: string;
  truncated?: boolean;
  baseSha?: string;
  headSha?: string;
  adrRef?: string;
  decisionId?: string;
};

export type JudgeResponse = {
  allowed: boolean;
  reason?: string;
};

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function validateDecisionId(id: string | null): { ok: true; id: string } | { ok: false } {
  if (id == null || typeof id !== "string") return { ok: false };
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > DECISION_ID_MAX_LENGTH) return { ok: false };
  if (!DECISION_ID_REGEX.test(trimmed)) return { ok: false };
  return { ok: true, id: trimmed };
}

function judgeJson(allowed: boolean, reason: string): NextResponse {
  return NextResponse.json({ allowed, reason } satisfies JudgeResponse, { status: 200 });
}

/** Build decision text for the LLM (title + context + options + decision + consequences). */
function buildDecisionText(d: {
  title: string;
  context: string;
  options: string[];
  decision: string;
  consequences: string;
}): string {
  const parts = [
    `# ${d.title}`,
    d.context?.trim() || "",
    d.options?.length ? `Options considered:\n${d.options.map((o) => `- ${o}`).join("\n")}` : "",
    `## Decision\n${d.decision?.trim() || ""}`,
    d.consequences?.trim() ? `## Consequences\n${d.consequences.trim()}` : "",
  ];
  return parts.filter(Boolean).join("\n\n");
}

/** Parse LLM response to { allowed, reason }. Defaults to allowed: false on invalid response. */
function parseJudgeResponse(raw: string): JudgeResponse {
  const trimmed = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const allowed = parsed.allowed === true;
    const reason = typeof parsed.reason === "string" ? parsed.reason : allowed ? "Change aligns with the decision." : "Change does not align with the decision.";
    return { allowed, reason };
  } catch {
    return { allowed: false, reason: "Judge response invalid." };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return judgeJson(false, "Unauthorized.");
  }

  let body: JudgeRequestBody;
  try {
    body = await request.json();
  } catch {
    return judgeJson(false, "Invalid request body.");
  }

  const diff = typeof body.diff === "string" ? body.diff : "";
  if (!diff.trim()) {
    return judgeJson(false, "Missing or empty diff.");
  }

  const adrRefTrimmed = typeof body.adrRef === "string" ? body.adrRef.trim() : "";
  const decisionIdParam = typeof body.decisionId === "string" ? body.decisionId : null;
  const useAdrRef = adrRefTrimmed.length > 0;

  if (useAdrRef && decisionIdParam !== null && decisionIdParam.trim().length > 0) {
    return judgeJson(false, "Provide exactly one of adrRef or decisionId.");
  }
  if (!useAdrRef && (decisionIdParam == null || decisionIdParam.trim().length === 0)) {
    return judgeJson(false, "Provide exactly one of adrRef or decisionId.");
  }

  const validated = useAdrRef
    ? ADR_REF_REGEX.test(adrRefTrimmed) && adrRefTrimmed.length <= DECISION_ID_MAX_LENGTH
      ? { ok: true as const, id: adrRefTrimmed }
      : { ok: false as const }
    : validateDecisionId(decisionIdParam);

  if (!validated.ok) {
    return judgeJson(false, "Invalid adrRef or decisionId.");
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
      return judgeJson(false, "Judge unavailable.");
    }
    if (!workspace?.id) {
      return judgeJson(false, "Unauthorized.");
    }

    const rateLimitPerMinute = Math.min(
      1000,
      Math.max(1, parseInt(process.env.JUDGE_RATE_LIMIT_PER_MINUTE ?? "60", 10) || 60)
    );
    const { data: underLimit } = await supabase.rpc("check_and_increment_judge_rate_limit", {
      p_workspace_id: workspace.id,
      p_limit_per_minute: rateLimitPerMinute,
    });
    if (!underLimit) {
      return judgeJson(false, "Rate limit exceeded. Try again later.");
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, plan_id")
      .eq("user_id", workspace.owner_id)
      .maybeSingle();
    const planId = (subscription?.plan_id ?? "free") as string;
    if (!JUDGE_ALLOWED_PLANS.has(planId)) {
      return judgeJson(false, "Judge is available on Team plan and above.");
    }
    if (!subscription?.stripe_customer_id) {
      return judgeJson(false, "Billing not set up. Add a payment method to use the Judge.");
    }

    let query = supabase
      .from("decisions")
      .select("id, project_id, title, context, options, decision, consequences")
      .eq(isAdrRefLookup ? "workspace_id" : "id", isAdrRefLookup ? workspace.id : validated.id);
    if (isAdrRefLookup) {
      query = query.eq("adr_ref", validated.id);
    }
    const { data: decision, error: decError } = await query.maybeSingle();

    if (decError) {
      return judgeJson(false, "Judge unavailable.");
    }
    if (!decision) {
      return judgeJson(false, "Decision not found.");
    }
    if (decision.project_id == null) {
      return judgeJson(false, "Judge unavailable.");
    }

    if (!isAdrRefLookup) {
      const { data: project, error: projError } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", decision.project_id)
        .maybeSingle();
      if (projError || !project?.workspace_id || project.workspace_id !== workspace.id) {
        return judgeJson(false, "Decision not found.");
      }
    }

    const decisionText = buildDecisionText({
      title: decision.title ?? "",
      context: decision.context ?? "",
      options: Array.isArray(decision.options) ? decision.options : [],
      decision: decision.decision ?? "",
      consequences: decision.consequences ?? "",
    });

    const truncated = Boolean(body.truncated);
    let diffForPrompt = diff;
    if (diff.length > MAX_DIFF_CHARS) {
      diffForPrompt = diff.slice(0, MAX_DIFF_CHARS) + "\n\n[... diff truncated by server ...]";
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return judgeJson(false, "Judge unavailable.");
    }

    const systemPrompt = `You are a technical gate judge. You receive:
1) A decision record (ADR): title, context, options considered, the decision taken, and consequences.
2) A git diff (unified diff) of code changes.

Your task: determine if the diff is consistent with and justified by the decision. The code change should implement or respect what the decision describes; it should not introduce unrelated or conflicting changes.

Respond only with a valid JSON object: {"allowed": true|false, "reason": "brief explanation"}.
- allowed: true only if the diff aligns with the decision.
- reason: one short sentence.`;

    const userPrompt = `## Decision record\n\n${decisionText}\n\n## Git diff\n${truncated || diff.length > MAX_DIFF_CHARS ? "(The diff may be truncated.)\n\n" : ""}\n\`\`\`\n${diffForPrompt}\n\`\`\``;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let rawContent: string;
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.text();
        console.error("Judge Anthropic API error:", res.status, err);
        return judgeJson(false, "Judge unavailable.");
      }

      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const firstBlock = data.content?.find((b) => b.type === "text");
      rawContent = firstBlock?.text?.trim() ?? "";

      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      if (workspace.id && (inputTokens > 0 || outputTokens > 0)) {
        recordJudgeUsage(supabase, workspace.id, inputTokens, outputTokens).catch((err) =>
          console.error("Judge usage recording failed:", err)
        );
      }
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof Error) {
        if (e.name === "AbortError") {
          return judgeJson(false, "Judge timeout.");
        }
        console.error("Judge request error:", e.message);
      }
      return judgeJson(false, "Judge unavailable.");
    }

    if (!rawContent) {
      return judgeJson(false, "Judge unavailable.");
    }

    const result = parseJudgeResponse(rawContent);
    return judgeJson(result.allowed, result.reason ?? "");
  } catch {
    return judgeJson(false, "Judge unavailable.");
  }
}
