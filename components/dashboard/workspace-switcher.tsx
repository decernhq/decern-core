"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/types/database";
import { setWorkspaceCookieAction } from "@/app/(dashboard)/dashboard/actions";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  workspaces,
  selectedWorkspaceId,
}: {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (workspaces.length === 0) return null;

  async function handleChange(workspaceId: string) {
    if (workspaceId === selectedWorkspaceId) return;
    setLoading(true);
    setError(null);
    const result = await setWorkspaceCookieAction(workspaceId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="border-b border-app-border px-3 pb-3">
      <label className="mb-1.5 block text-xs font-medium text-app-text-muted">
        Workspace
      </label>
      <div className="relative">
        <select
          value={selectedWorkspaceId ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          disabled={loading}
          className={cn(
            "w-full appearance-none rounded-lg border border-app-border bg-app-input-bg py-2 pl-3 pr-8 text-sm font-medium text-app-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
          )}
          aria-label="Seleziona workspace"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-app-text-muted">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {loading && (
        <p className="mt-2 text-xs text-app-active-text" role="status">
          Caricando Workspace…
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
