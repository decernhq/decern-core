"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AdrSyncButton } from "./adr-sync-button";

type AdrRow = {
  id: string;
  repository_identifier: string;
  title: string;
  status: string;
  enforcement: string;
  scope: string[] | null;
};

type RepoGroup = {
  repo: string;
  rows: AdrRow[];
  blocking: number;
  proposed: number;
};

export function AdrsList({
  adrs,
  workspaceId,
  selectedRepo,
  labels,
}: {
  adrs: AdrRow[];
  workspaceId: string;
  selectedRepo: string | undefined;
  labels: {
    search: string;
    colId: string;
    colTitle: string;
    colStatus: string;
    colEnforcement: string;
    colScope: string;
    syncButton: string;
    syncing: string;
    synced: string;
    syncCliHint: string;
    noResults: string;
    blocking: string;
    proposed: string;
  };
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return adrs;
    const q = query.toLowerCase();
    return adrs.filter(
      (a) => a.id.toLowerCase().includes(q) || a.title.toLowerCase().includes(q),
    );
  }, [adrs, query]);

  const groups = useMemo(() => {
    const map: Record<string, AdrRow[]> = {};
    for (const a of filtered) {
      if (!map[a.repository_identifier]) map[a.repository_identifier] = [];
      map[a.repository_identifier].push(a);
    }
    const result: RepoGroup[] = [];
    for (const repo of Object.keys(map)) {
      const rows = map[repo];
      result.push({
        repo,
        rows,
        blocking: rows.filter((r: AdrRow) => r.enforcement === "blocking").length,
        proposed: rows.filter((r: AdrRow) => r.status === "proposed").length,
      });
    }
    return result;
  }, [filtered]);

  const rowHref = (a: AdrRow) => {
    const params = new URLSearchParams();
    if (selectedRepo) params.set("repo", selectedRepo);
    params.set("sel_repo", a.repository_identifier);
    params.set("sel_id", a.id);
    return `/dashboard/adrs?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={labels.search}
        className="w-full rounded-lg border border-app-border bg-app-bg px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      {groups.length === 0 && (
        <p className="py-8 text-center text-sm text-app-text-muted">{labels.noResults}</p>
      )}

      {/* Repo accordions */}
      {groups.map((g) => (
        <details
          key={g.repo}
          open={groups.length === 1 || selectedRepo === g.repo}
          className="group overflow-hidden rounded-xl border border-app-border bg-app-card shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-app-bg/60 px-5 py-3 transition-colors hover:bg-app-hover [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              {/* Chevron */}
              <svg
                className="h-4 w-4 flex-shrink-0 text-app-text-muted transition-transform group-open:rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <p className="truncate font-mono text-sm font-medium text-app-text">{g.repo}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {g.blocking > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {g.blocking} {labels.blocking}
                </span>
              )}
              {g.proposed > 0 && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {g.proposed} {labels.proposed}
                </span>
              )}
              <span className="rounded-full border border-app-border bg-app-card px-2.5 py-0.5 text-xs font-medium text-app-text-muted">
                {g.rows.length}
              </span>
            </div>
          </summary>

          <div className="border-t border-app-border">
            {/* Sync button row */}
            <div className="flex justify-end border-b border-app-border px-5 py-2">
              <AdrSyncButton
                workspaceId={workspaceId}
                repositoryIdentifier={g.repo}
                labels={{
                  sync: labels.syncButton,
                  syncing: labels.syncing,
                  synced: labels.synced,
                  cliHint: labels.syncCliHint,
                }}
              />
            </div>

            {/* Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border bg-app-bg/30 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-app-text-muted">
                  <th className="px-5 py-2.5 w-[11%]">{labels.colId}</th>
                  <th className="px-5 py-2.5">{labels.colTitle}</th>
                  <th className="px-5 py-2.5 w-[12%]">{labels.colStatus}</th>
                  <th className="px-5 py-2.5 w-[14%]">{labels.colEnforcement}</th>
                  <th className="px-5 py-2.5 w-[22%]">{labels.colScope}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {g.rows.map((adr) => (
                  <tr
                    key={`${adr.repository_identifier}/${adr.id}`}
                    className="group/row cursor-pointer transition-colors hover:bg-app-hover/70"
                  >
                    <td className="p-0">
                      <Link href={rowHref(adr)} className="block whitespace-nowrap px-5 py-3.5">
                        <span className="rounded bg-app-bg px-1.5 py-0.5 font-mono text-[0.72rem] font-medium text-app-text-muted group-hover/row:bg-app-card">
                          {adr.id}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={rowHref(adr)} className="block px-5 py-3.5 font-medium text-app-text group-hover/row:text-brand-600 dark:group-hover/row:text-brand-400">
                        {adr.title}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={rowHref(adr)} className="block px-5 py-3.5">
                        <StatusPill status={adr.status} />
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={rowHref(adr)} className="block px-5 py-3.5">
                        <EnforcementPill enforcement={adr.enforcement} />
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={rowHref(adr)} className="block px-5 py-3.5 font-mono text-xs text-app-text-muted">
                        {adr.scope && adr.scope.length > 0 ? adr.scope.join(", ") : "—"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : status === "superseded"
        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        : status === "rejected"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function EnforcementPill({ enforcement }: { enforcement: string }) {
  const cls =
    enforcement === "blocking"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{enforcement}</span>;
}
