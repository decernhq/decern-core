import { cookies } from "next/headers";

const WORKSPACE_COOKIE = "workspace_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Restituisce l'id del workspace attualmente selezionato.
 * Se il cookie punta a un workspace non accessibile (es. membership rimossa),
 * si usa il primo workspace accessibile (in ordine di creazione).
 */
export async function getSelectedWorkspaceId(): Promise<string | null> {
  const { getWorkspacesForCurrentUser } = await import("@/lib/queries/workspaces");
  const allowed = await getWorkspacesForCurrentUser();
  if (allowed.length === 0) return null;

  const cookieStore = cookies();
  const id = cookieStore.get(WORKSPACE_COOKIE)?.value ?? null;
  const isAllowed = id && allowed.some((w) => w.id === id);
  return isAllowed ? id : allowed[0].id;
}

/**
 * Nome del cookie usato per il workspace (per impostarlo da server action).
 */
export const WORKSPACE_COOKIE_NAME = WORKSPACE_COOKIE;

export const WORKSPACE_COOKIE_OPTIONS = { path: "/" as const, maxAge: COOKIE_MAX_AGE };
