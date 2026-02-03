"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacesForCurrentUser, countWorkspacesOwnedByCurrentUser } from "@/lib/queries/workspaces";
import { WORKSPACE_COOKIE_NAME, WORKSPACE_COOKIE_OPTIONS } from "@/lib/workspace-cookie";
import { getEffectivePlanId } from "@/lib/billing";
import { PLANS } from "@/types/billing";

/**
 * Imposta il workspace selezionato (cookie) e revalida.
 * Mostra "Caricando Workspace" lato client mentre si fa refresh.
 */
export async function setWorkspaceCookieAction(workspaceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const workspaces = await getWorkspacesForCurrentUser();
  const canAccess = workspaces.some((w) => w.id === workspaceId);
  if (!canAccess) return { error: "Workspace non trovato" };

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, workspaceId, WORKSPACE_COOKIE_OPTIONS);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/decisions");
  revalidatePath("/dashboard/workspace");
  return {};
}

/**
 * Crea un nuovo workspace. Solo piano Pro può averne più di uno.
 */
export async function createWorkspaceAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", user.id)
    .single();

  const planId = getEffectivePlanId(subscription?.plan_id);
  const plan = PLANS[planId];
  const workspaceLimit = plan.limits.workspaces;

  if (workspaceLimit !== -1) {
    const count = await countWorkspacesOwnedByCurrentUser();
    if (count >= workspaceLimit) {
      return {
        error:
          "Il piano attuale permette un solo workspace. Passa a Pro per crearne di più.",
      };
    }
  }

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
