import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCiToken } from "@/lib/ci-token";
import { recordJudgeUsage } from "@/lib/judge-usage";
import { JUDGE_ALLOWED_PLANS, isJudgeAdvisory, type PlanId } from "@/lib/decision-gate-policies";

const DECISION_ID_MAX_LENGTH = 128;
const DECISION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ADR_REF_REGEX = /^ADR-\d+$/i;
/** Max diff length to send to LLM (~25k tokens if 4 chars/token). Backend truncation if client sent more. */
const MAX_DIFF_CHARS = 120_000;
/** Max lengths for user-provided LLM config (no keys stored, only used in-memory for the request). */
const MAX_LLM_BASE_URL_LEN = 512;
const MAX_LLM_MODEL_LEN = 256;
const MAX_LLM_API_KEY_LEN = 2048;

/** Anthropic Messages API base host (native support, no gateway). */
const ANTHROPIC_API_HOST = "api.anthropic.com";

/**
 * User-provided LLM config for judge (sent by decern-gate from user settings).
 * We use it only for this request; we never store or log apiKey.
 * - If baseUrl is Anthropic (api.anthropic.com), we call the native Messages API.
 * - Otherwise we use OpenAI-compatible: POST {baseUrl}/chat/completions with Bearer apiKey.
 */
export type JudgeLlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type JudgeRequestBody = {
  diff: string;
  truncated?: boolean;
  baseSha?: string;
  headSha?: string;
  adrRef?: string;
  decisionId?: string;
  /** Required: LLM config from user (decern-gate sends it). We never store keys. */
  llm: JudgeLlmConfig;
};

export type JudgeResponse = {
  allowed: boolean;
  reason?: string;
  /** True when plan is Free/Team: client must not block CI on allowed: false (advisory only). */
  advisory?: boolean;
};

function judgeJson(allowed: boolean, reason: string, advisory?: boolean): NextResponse {
  const body: JudgeResponse = { allowed, reason };
  if (advisory !== undefined) body.advisory = advisory;
  return NextResponse.json(body, { status: 200 });
}

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

/**
 * Validates user-provided LLM config. baseUrl must be HTTPS (or http for localhost).
 * We never log or store apiKey.
 */
function validateLlmConfig(llm: unknown): { ok: true; config: JudgeLlmConfig } | { ok: false } {
  if (llm == null || typeof llm !== "object") return { ok: false };
  const o = llm as Record<string, unknown>;
  const baseUrl = typeof o.baseUrl === "string" ? o.baseUrl.trim() : "";
  const apiKey = typeof o.apiKey === "string" ? o.apiKey : "";
  const model = typeof o.model === "string" ? o.model.trim() : "";
  if (!baseUrl || !apiKey || !model) return { ok: false };
  if (baseUrl.length > MAX_LLM_BASE_URL_LEN || model.length > MAX_LLM_MODEL_LEN || apiKey.length > MAX_LLM_API_KEY_LEN) {
    return { ok: false };
  }
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ok: false };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { ok: false };
  if (parsed.protocol === "http:") {
    const host = parsed.hostname.toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") return { ok: false };
  }
  return { ok: true, config: { baseUrl, apiKey, model } };
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

function isAnthropicApi(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname.toLowerCase() === ANTHROPIC_API_HOST;
  } catch {
    return false;
  }
}

type JudgeLlmResult = { rawContent: string; inputTokens: number; outputTokens: number };

/**
 * Call Anthropic Messages API (native). Uses x-api-key and anthropic-version header.
 * Returns content from first text block and usage for billing.
 */
async function callAnthropicMessages(
  llmConfig: JudgeLlmConfig,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal
): Promise<JudgeLlmResult> {
  const url = "https://api.anthropic.com/v1/messages";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": llmConfig.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: llmConfig.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Judge Anthropic API error:", res.status, err.slice(0, 200));
    throw new Error("Judge unavailable.");
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const textBlock = data.content?.find((b) => b.type === "text");
  const rawContent = (textBlock?.text ?? "").trim();
  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;
  return { rawContent, inputTokens, outputTokens };
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

  const llmValidation = validateLlmConfig(body.llm);
  if (!llmValidation.ok) {
    return judgeJson(false, "Missing or invalid LLM configuration. Provide llm: { baseUrl, apiKey, model } (OpenAI-compatible).");
  }
  const llmConfig = llmValidation.config;

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
    const { data: underWorkspaceLimit } = await supabase.rpc("check_and_increment_judge_rate_limit", {
      p_workspace_id: workspace.id,
      p_limit_per_minute: rateLimitPerMinute,
    });
    if (!underWorkspaceLimit) {
      return judgeJson(false, "Rate limit exceeded. Try again later.");
    }

    const rateLimitPerMinuteOwner = Math.min(
      2000,
      Math.max(1, parseInt(process.env.JUDGE_RATE_LIMIT_PER_MINUTE_OWNER ?? "120", 10) || 120)
    );
    const { data: underOwnerLimit } = await supabase.rpc("check_and_increment_judge_rate_limit_by_owner", {
      p_owner_id: workspace.owner_id,
      p_limit_per_minute: rateLimitPerMinuteOwner,
    });
    if (!underOwnerLimit) {
      return judgeJson(false, "Rate limit exceeded. Try again later.");
    }

    const [{ data: subscription }, { data: workspacePolicies }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("stripe_customer_id, plan_id")
        .eq("user_id", workspace.owner_id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("workspace_policies")
        .select("judge_blocking")
        .eq("workspace_id", workspace.id)
        .maybeSingle(),
    ]);
    const planId = (subscription?.plan_id ?? "free") as PlanId;
    if (!JUDGE_ALLOWED_PLANS.has(planId)) {
      return judgeJson(false, "Judge is not available for this plan.");
    }
    if (planId !== "free" && !subscription?.stripe_customer_id) {
      return judgeJson(false, "Billing not set up. Add a payment method to use the Judge.");
    }

    const judgeBlockingFromDb = workspacePolicies?.judge_blocking ?? true;
    const advisory =
      isJudgeAdvisory(planId) || (planId !== "free" && planId !== "team" && !judgeBlockingFromDb);

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
    let rawContent = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      if (isAnthropicApi(llmConfig.baseUrl)) {
        const result = await callAnthropicMessages(
          llmConfig,
          systemPrompt,
          userPrompt,
          controller.signal
        );
        rawContent = result.rawContent;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
      } else {
        const baseUrlNormalized = llmConfig.baseUrl.replace(/\/+$/, "");
        const chatUrl = `${baseUrlNormalized}/chat/completions`;
        const res = await fetch(chatUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${llmConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: llmConfig.model,
            max_tokens: 1024,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.text();
          console.error("Judge LLM API error:", res.status, err.slice(0, 200));
          return judgeJson(false, "Judge unavailable.");
        }

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";
        inputTokens = data.usage?.prompt_tokens ?? 0;
        outputTokens = data.usage?.completion_tokens ?? 0;
      }
      clearTimeout(timeout);

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
    return judgeJson(result.allowed, result.reason ?? "", advisory);
  } catch {
    return judgeJson(false, "Judge unavailable.");
  }
}
