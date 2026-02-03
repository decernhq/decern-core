import { cookies } from "next/headers";
import { getOrCreateDefaultWorkspace } from "@/lib/queries/workspaces";

const WORKSPACE_COOKIE = "workspace_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Restituisce l'id del workspace attualmente selezionato.
 * Se non c'è cookie, usa il workspace predefinito (il cookie si imposta solo
 * quando l'utente seleziona un workspace dal menu, via Server Action).
 */
export async function getSelectedWorkspaceId(): Promise<string | null> {
  const cookieStore = cookies();
  const id = cookieStore.get(WORKSPACE_COOKIE)?.value ?? null;
  if (id) return id;
  const w = await getOrCreateDefaultWorkspace();
  return w?.id ?? null;
}

/**
 * Nome del cookie usato per il workspace (per impostarlo da server action).
 */
export const WORKSPACE_COOKIE_NAME = WORKSPACE_COOKIE;

export const WORKSPACE_COOKIE_OPTIONS = { path: "/" as const, maxAge: COOKIE_MAX_AGE };
