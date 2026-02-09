"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacesForCurrentUser, getOrCreateDefaultWorkspace } from "@/lib/queries/workspaces";
import { WORKSPACE_COOKIE_NAME, WORKSPACE_COOKIE_OPTIONS } from "@/lib/workspace-cookie";
import { checkCanCreateWorkspace } from "@/lib/plan-limits";
import { generateCiToken, hashCiToken } from "@/lib/ci-token";

/**
 * Crea il workspace di default (se mancante), imposta il cookie e revalida.
 * Usato dalla vista "Preparando il tuo workspace" al primo accesso.
 */
export async function prepareWorkspaceAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const defaultWs = await getOrCreateDefaultWorkspace();
  if (!defaultWs) return { error: "Impossibile creare il workspace" };

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, defaultWs.id, WORKSPACE_COOKIE_OPTIONS);
  revalidatePath("/dashboard", "layout");
  return {};
}

/**
 * Imposta il workspace selezionato (cookie) e revalida.
 * È consentito solo se il workspace è tra quelli accessibili (primi N per creazione, in base al piano).
 */
export async function setWorkspaceCookieAction(workspaceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const workspaces = await getWorkspacesForCurrentUser();
  const canAccess = workspaces.some((w) => w.id === workspaceId);
  if (!canAccess) {
    return { error: "Non hai il piano per accedere a questo workspace." };
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, workspaceId, WORKSPACE_COOKIE_OPTIONS);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/decisions");
  revalidatePath("/dashboard/workspace");
  return {};
}

export async function createWorkspaceAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const canCreate = await checkCanCreateWorkspace(user.id);
  if (!canCreate.allowed) return { error: canCreate.error };

  const name = (formData.get("name") as string)?.trim() || "Nuovo workspace";
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating workspace:", error);
    return { error: "Errore nella creazione del workspace" };
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, data.id, WORKSPACE_COOKIE_OPTIONS);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspace");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/decisions");
  return { success: true };
}

/**
 * Rinomina un workspace. Solo il proprietario può farlo.
 */
export async function renameWorkspaceAction(
  workspaceId: string,
  name: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const trimmed = name?.trim();
  if (!trimmed) return { error: "Il nome non può essere vuoto" };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws || ws.owner_id !== user.id) {
    return { error: "Solo il proprietario può rinominare il workspace" };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ name: trimmed })
    .eq("id", workspaceId);

  if (error) {
    console.error("Error renaming workspace:", error);
    return { error: "Errore durante la modifica del nome" };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspace");
  return { success: true };
}

export type WorkspaceCiTokenResult =
  | { error: string }
  | { success: true; token: string }
  | { success: true; revoked: true };

/**
 * Genera un nuovo token CI per il workspace (Decision Gate). Solo il proprietario.
 * Il token in chiaro viene restituito una sola volta; in DB si salva solo l'hash.
 */
export async function generateWorkspaceCiTokenAction(
  workspaceId: string
): Promise<WorkspaceCiTokenResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws || ws.owner_id !== user.id) {
    return { error: "Solo il proprietario può generare il token CI" };
  }

  const token = generateCiToken();
  const hash = hashCiToken(token);
  const { error } = await supabase
    .from("workspaces")
    .update({
      ci_token_hash: hash,
      ci_token_created_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) {
    return { error: "Errore durante la generazione del token" };
  }

  revalidatePath("/dashboard/workspace");
  return { success: true, token };
}

/**
 * Revoca il token CI del workspace. Solo il proprietario.
 */
export async function revokeWorkspaceCiTokenAction(
  workspaceId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws || ws.owner_id !== user.id) {
    return { error: "Solo il proprietario può revocare il token CI" };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ ci_token_hash: null, ci_token_created_at: null })
    .eq("id", workspaceId);

  if (error) {
    return { error: "Errore durante la revoca del token" };
  }

  revalidatePath("/dashboard/workspace");
  return { success: true };
}
