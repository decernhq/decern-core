"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const isGitHubRepo = (repo: string) => repo.startsWith("github.com/");

type Signal = {
  id: string;
  description: string;
  suggested_adr_title: string | null;
  files_involved: string[];
  pr_url: string | null;
  pr_title: string | null;
  repository_identifier: string;
};

export function SignalActions({
  signals,
  workspaceId,
  isPaid,
  labels,
}: {
  signals: Signal[];
  workspaceId: string;
  isPaid: boolean;
  labels: {
    generateDraft: string;
    generating: string;
    createPr: string;
    creatingPr: string;
    dismiss: string;
    dismissing: string;
    upgradeHint: string;
    editHint: string;
    prCreated: string;
    close: string;
    previewTitle: string;
    copyMarkdown: string;
    githubOnly: string;
  };
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<string | null>(null);
  const [draftRepo, setDraftRepo] = useState<string>("");
  const [draftSignalIds, setDraftSignalIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [prResult, setPrResult] = useState<{ url: string; number: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signalIds = signals.map((s) => s.id);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signals/generate-adr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, signalIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setDraft(data.adr);
      setDraftRepo(data.repositoryIdentifier ?? signals[0]?.repository_identifier ?? "");
      setDraftSignalIds(signalIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, signalIds, signals]);

  const createPr = useCallback(async () => {
    if (!draft || !draftRepo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signals/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          repositoryIdentifier: draftRepo,
          signalIds: draftSignalIds,
          adrMarkdown: draft,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setPrResult({ url: data.prUrl, number: data.prNumber });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [draft, draftRepo, draftSignalIds, workspaceId, router]);

  const dismiss = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/signals/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, signalIds }),
      });
      router.refresh();
    } catch {
      // best effort
    } finally {
      setLoading(false);
    }
  }, [workspaceId, signalIds, router]);

  // PR success state
  if (prResult) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800/50 dark:bg-green-900/10">
        <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium text-green-800 dark:text-green-300">{labels.prCreated}</span>
        <a
          href={prResult.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-green-700 underline hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
        >
          PR #{prResult.number}
        </a>
      </div>
    );
  }

  // Draft preview state
  if (draft !== null) {
    // Compute branch name from the generated draft
    const idMatch = draft.match(/^id:\s*(ADR-\d+)/m);
    const titleMatch = draft.match(/^title:\s*(.+)$/m);
    const adrId = idMatch?.[1] ?? "ADR-000";
    const slug = (titleMatch?.[1] ?? "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    const branchName = `decern/${adrId.toLowerCase()}-${slug}`;
    const isGH = isGitHubRepo(draftRepo);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-app-text">{labels.previewTitle}</h3>
          <button
            type="button"
            onClick={() => { setDraft(null); setError(null); }}
            className="text-xs text-app-text-muted hover:text-app-text"
          >
            {labels.close}
          </button>
        </div>
        <p className="font-mono text-xs text-app-text-muted">
          branch: <span className="select-all text-app-text">{branchName}</span>
        </p>
        <p className="text-xs text-app-text-muted">{labels.editHint}</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-lg border border-app-border bg-app-bg px-4 py-3 font-mono text-xs leading-relaxed text-app-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={Math.min(draft.split("\n").length + 2, 30)}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              try { await navigator.clipboard.writeText(draft); } catch {}
            }}
            className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
          >
            {labels.copyMarkdown}
          </button>
          {isGH ? (
            <button
              type="button"
              onClick={createPr}
              disabled={loading}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? labels.creatingPr : labels.createPr}
            </button>
          ) : (
            <span className="self-center text-xs text-app-text-muted">{labels.githubOnly}</span>
          )}
        </div>
      </div>
    );
  }

  // Default: action buttons
  return (
    <div className="flex flex-wrap gap-2">
      {isPaid ? (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? labels.generating : labels.generateDraft}
        </button>
      ) : (
        <span className="rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-xs text-app-text-muted">
          {labels.upgradeHint}
        </span>
      )}
      <button
        type="button"
        onClick={dismiss}
        disabled={loading}
        className="rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text-muted transition hover:bg-app-hover hover:text-app-text disabled:opacity-50"
      >
        {loading ? labels.dismissing : labels.dismiss}
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
