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

  if (workspaces.length === 0) return null;

  async function handleChange(workspaceId: string) {
    if (workspaceId === selectedWorkspaceId) return;
    setLoading(true);
    await setWorkspaceCookieAction(workspaceId);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="border-b border-gray-200 px-3 pb-3">
      <label className="mb-1.5 block text-xs font-medium text-gray-500">
        Workspace
      </label>
      <div className="relative">
        <select
          value={selectedWorkspaceId ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          disabled={loading}
          className={cn(
            "w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
          )}
          aria-label="Seleziona workspace"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {loading && (
        <p className="mt-2 text-xs text-brand-600" role="status">
          Caricando Workspace…
        </p>
      )}
    </div>
  );
}
