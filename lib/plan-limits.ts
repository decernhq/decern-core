"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlanLimits } from "@/types/billing";

const UNLIMITED = -1;

/**
 * Restituisce i limiti effettivi per l'utente (da DB: plans + override enterprise).
 * Se non ha subscription attiva, ritorna i limiti del piano Free.
 */
export async function getPlanLimits(userId: string): Promise<PlanLimits | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_plan_limits", {
    p_user_id: userId,
  });
  if (error || !data?.length) return null;
  const row = data[0];
  return {
    workspaces_limit: row.workspaces_limit ?? 1,
    projects_limit: row.projects_limit ?? 1,
    users_per_workspace_limit: row.users_per_workspace_limit ?? 1,
    decisions_limit: row.decisions_limit ?? 30,
    ai_generations_per_month: row.ai_generations_per_month ?? 10,
  };
}

function withinLimit(limit: number, current: number): boolean {
  if (limit === UNLIMITED) return true;
  return current < limit;
}

/**
 * Verifica se l'utente può creare un altro workspace (in base ai workspace di cui è owner).
 */
export async function checkCanCreateWorkspace(userId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const limits = await getPlanLimits(userId);
  if (!limits) return { allowed: false, error: "Unable to verify plan limits" };

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (error) return { allowed: false, error: "Verification error" };
  const current = count ?? 0;

  if (!withinLimit(limits.workspaces_limit, current)) {
    return {
      allowed: false,
      error:
        limits.workspaces_limit === 1
          ? "The Free plan allows one workspace. Upgrade to Team or Business to create more."
          : "You have reached the workspace limit for your plan.",
    };
  }
  return { allowed: true };
}

/**
 * Verifica se si può creare un altro progetto nel workspace (limite per l'owner del workspace).
 */
export async function checkCanCreateProject(
  workspaceOwnerId: string,
  workspaceId: string
): Promise<{ allowed: boolean; error?: string }> {
  const limits = await getPlanLimits(workspaceOwnerId);
  if (!limits) return { allowed: false, error: "Unable to verify plan limits" };

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) return { allowed: false, error: "Verification error" };
  const current = count ?? 0;

  if (!withinLimit(limits.projects_limit, current)) {
    return {
      allowed: false,
      error: "Hai raggiunto il limite di progetti del tuo piano per questo workspace.",
    };
  }
  return { allowed: true };
}

/**
 * Conta i membri del workspace (owner + workspace_members). Per il limite "utenti" si conta chi può usare il workspace.
 */
async function countWorkspaceMembers(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const ws = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return 0;

  const { count, error } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) return 0;
  const membersCount = count ?? 0;
  return membersCount + 1;
}

/**
 * Verifica se si può invitare un altro utente (limite utenti per workspace per l'owner).
 */
export async function checkCanInviteToWorkspace(
  workspaceOwnerId: string,
  workspaceId: string
): Promise<{ allowed: boolean; error?: string }> {
  const limits = await getPlanLimits(workspaceOwnerId);
  if (!limits) return { allowed: false, error: "Unable to verify plan limits" };

  const current = await countWorkspaceMembers(workspaceId);
  if (!withinLimit(limits.users_per_workspace_limit, current)) {
    return {
      allowed: false,
      error: `Il tuo piano permette fino a ${limits.users_per_workspace_limit} utenti per workspace. Passa a un piano superiore per invitare altri.`,
    };
  }
  return { allowed: true };
}

/**
 * Conta le decisioni nel workspace (tramite progetti).
 */
async function countDecisionsInWorkspace(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId);
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("decisions")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds);
  if (error) return 0;
  return count ?? 0;
}

/**
 * Verifica se si può creare un'altra decisione nel workspace (limite per l'owner del workspace).
 */
export async function checkCanCreateDecision(
  workspaceOwnerId: string,
  workspaceId: string
): Promise<{ allowed: boolean; error?: string }> {
  const limits = await getPlanLimits(workspaceOwnerId);
  if (!limits) return { allowed: false, error: "Unable to verify plan limits" };

  const current = await countDecisionsInWorkspace(workspaceId);
  if (!withinLimit(limits.decisions_limit, current)) {
    return {
      allowed: false,
      error:
        limits.decisions_limit === 30
          ? "Il piano Free permette fino a 30 decisioni totali. Passa a Team per decisioni illimitate."
          : "Hai raggiunto il limite di decisioni del tuo piano per questo workspace.",
    };
  }
  return { allowed: true };
}

/**
 * Periodo corrente in formato YYYY-MM per ai_generations_usage.
 */
function currentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Restituisce il numero di generazioni AI usate dall'utente nel mese corrente.
 */
export async function getAiGenerationsUsageCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const period = currentPeriod();
  const { data, error } = await supabase
    .from("ai_generations_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();
  if (error || !data) return 0;
  return data.count ?? 0;
}

/**
 * Verifica se l'utente può usare una generazione AI (senza incrementare).
 */
export async function checkCanUseAiGeneration(userId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const limits = await getPlanLimits(userId);
  if (!limits) return { allowed: false, error: "Unable to verify plan limits" };

  const current = await getAiGenerationsUsageCount(userId);
  if (!withinLimit(limits.ai_generations_per_month, current)) {
    return {
      allowed: false,
      error:
        limits.ai_generations_per_month <= 10
          ? `Hai esaurito le ${limits.ai_generations_per_month} generazioni AI mensili del piano Free. Passa al piano Team.`
          : "Hai esaurito le generazioni AI incluse questo mese. Riprova il prossimo mese o passa a un piano superiore.",
    };
  }
  return { allowed: true };
}

/**
 * Incrementa il conteggio generazioni AI per l'utente nel mese corrente.
 * Chiamare solo dopo una generazione AI completata con successo.
 * @deprecated Preferire reserveAiUsageSlot per enforcement atomico (anti-race).
 */
export async function incrementAiUsage(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const period = currentPeriod();
  const current = await getAiGenerationsUsageCount(userId);
  const { error } = await supabase.from("ai_generations_usage").upsert(
    { user_id: userId, period, count: current + 1 },
    { onConflict: "user_id,period" }
  );
  if (error) {
    console.error("Error incrementing AI usage:", error);
    return { ok: false, error: "Error updating usage" };
  }
  return { ok: true };
}

/**
 * Riserva un slot di generazione AI in modo atomico (incremento solo se sotto il limite).
 * Da chiamare PRIMA di chiamare OpenAI; se restituisce true lo slot è già consumato.
 * A prova di race: richieste concorrenti non possono superare il limite.
 */
export async function reserveAiUsageSlot(userId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("increment_ai_usage_if_allowed", {
    p_user_id: userId,
  });
  if (error) {
    console.error("Error reserving AI usage slot:", error);
    return { allowed: false, error: "Limit verification error" };
  }
  const allowed = data === true || (Array.isArray(data) && data[0] === true);
  if (allowed) return { allowed: true };
  const limits = await getPlanLimits(userId);
  const limit = limits?.ai_generations_per_month ?? 10;
  return {
    allowed: false,
    error:
      limit <= 10
        ? `Hai esaurito le ${limit} generazioni AI mensili del piano Free. Passa al piano Team.`
        : "Hai esaurito le generazioni AI incluse questo mese. Riprova il prossimo mese o passa a un piano superiore.",
  };
}
