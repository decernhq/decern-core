"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseAdrMarkdown } from "@decern/protocol/adr";
import { formatAdrMarkdown } from "@decern/protocol/adr";

export type SiblingAdr = {
  id: string;
  title: string;
};

type ActionDef = {
  key: string;
  label: string;
  changes: { status?: string; enforcement?: string; supersededBy?: string };
  tone: "green" | "red" | "amber" | "gray";
  needsSupersededBy?: boolean;
};

export function AdrLifecycleActions({
  workspaceId,
  repositoryIdentifier,
  adrId,
  currentStatus,
  currentEnforcement,
  rawBody,
  siblingAdrs,
  labels,
}: {
  workspaceId: string;
  repositoryIdentifier: string;
  adrId: string;
  currentStatus: string;
  currentEnforcement: string;
  rawBody: string | null;
  siblingAdrs: SiblingAdr[];
  labels: {
    approve: string;
    reject: string;
    supersede: string;
    promoteBlocking: string;
    demoteWarning: string;
    loading: string;
    prCreated: string;
    preview: string;
    copy: string;
    copied: string;
    createPr: string;
    creatingPr: string;
    close: string;
    bodyRequired: string;
    githubOnly: string;
    supersededByLabel: string;
    supersededByPlaceholder: string;
    supersededByRequired: string;
  };
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<string | null>(null);
  const [changeLabel, setChangeLabel] = useState("");
  const [pendingChanges, setPendingChanges] = useState<{ status?: string; enforcement?: string } | null>(null);
  const [supersededBy, setSupersededBy] = useState("");
  const [showSupersedeSelector, setShowSupersedeSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prResult, setPrResult] = useState<{ url: string; number: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGitHub = repositoryIdentifier.startsWith("github.com/");

  const generatePreview = useCallback((changes: { status?: string; enforcement?: string }, label: string) => {
    if (!rawBody) return;
    const parsed = parseAdrMarkdown(rawBody);
    if (!parsed) return;

    const updated = formatAdrMarkdown({
      id: parsed.id,
      title: parsed.title,
      status: (changes.status ?? parsed.status) as any,
      enforcement: (changes.enforcement ?? parsed.enforcement) as any,
      scope: parsed.scope,
      supersedes: parsed.supersedes,
      date: parsed.date,
      context: parsed.context,
      decision: parsed.decision,
      consequences: parsed.consequences,
    });

    setDraft(updated);
    setChangeLabel(label);
    setShowSupersedeSelector(false);
    setPendingChanges(null);
    setPrResult(null);
    setError(null);
    setCopied(false);
  }, [rawBody]);

  const handleActionClick = useCallback((action: ActionDef) => {
    if (action.needsSupersededBy) {
      setShowSupersedeSelector(true);
      setPendingChanges(action.changes);
      setChangeLabel(action.label);
      setSupersededBy("");
      setError(null);
      return;
    }
    generatePreview(action.changes, action.label);
  }, [generatePreview]);

  const confirmSupersede = useCallback(() => {
    if (!supersededBy.trim()) {
      setError(labels.supersededByRequired);
      return;
    }
    if (!rawBody || !pendingChanges) return;
    const parsed = parseAdrMarkdown(rawBody);
    if (!parsed) return;

    // Add a note about the superseding ADR in the consequences
    const note = `\n\nSuperseded by ${supersededBy.trim()}.`;
    const updatedConsequences = parsed.consequences.trimEnd() + note;

    const updated = formatAdrMarkdown({
      id: parsed.id,
      title: parsed.title,
      status: "superseded" as any,
      enforcement: parsed.enforcement,
      scope: parsed.scope,
      supersedes: parsed.supersedes,
      date: parsed.date,
      context: parsed.context,
      decision: parsed.decision,
      consequences: updatedConsequences,
    });

    setDraft(updated);
    setShowSupersedeSelector(false);
    setPendingChanges(null);
    setPrResult(null);
    setError(null);
    setCopied(false);
  }, [supersededBy, rawBody, pendingChanges, labels.supersededByRequired]);

  const copyToClipboard = useCallback(async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* user selects manually */ }
  }, [draft]);

  const createPr = useCallback(async () => {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/adrs/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          repositoryIdentifier,
          adrId,
          changes: parseChangesFromLabel(changeLabel),
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
  }, [draft, workspaceId, repositoryIdentifier, adrId, changeLabel, router]);

  const resetAll = useCallback(() => {
    setDraft(null);
    setShowSupersedeSelector(false);
    setPendingChanges(null);
    setError(null);
    setCopied(false);
  }, []);

  // PR success
  if (prResult) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-800/50 dark:bg-green-900/10">
        <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-green-800 dark:text-green-300">{labels.prCreated}</span>
        <a href={prResult.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-green-700 underline dark:text-green-400">
          PR #{prResult.number}
        </a>
      </div>
    );
  }

  // Supersede selector
  if (showSupersedeSelector) {
    const candidates = siblingAdrs.filter((a) => a.id !== adrId);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-app-text">{labels.supersededByLabel}</h3>
          <button type="button" onClick={resetAll} className="text-xs text-app-text-muted hover:text-app-text">
            {labels.close}
          </button>
        </div>
        {candidates.length > 0 ? (
          <select
            value={supersededBy}
            onChange={(e) => setSupersededBy(e.target.value)}
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">{labels.supersededByPlaceholder}</option>
            {candidates.map((a) => (
              <option key={a.id} value={a.id}>{a.id}: {a.title}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={supersededBy}
            onChange={(e) => setSupersededBy(e.target.value)}
            placeholder={labels.supersededByPlaceholder}
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 font-mono text-sm text-app-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={confirmSupersede}
          disabled={!supersededBy.trim()}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {labels.supersede}
        </button>
      </div>
    );
  }

  // Preview state
  if (draft !== null) {
    // Compute the branch name (same logic as the server endpoint)
    const titleMatch = draft.match(/^title:\s*(.+)$/m);
    const slug = (titleMatch?.[1] ?? "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const changeSlug = parseChangesFromLabel(changeLabel);
    const branchSuffix = changeSlug.status ?? changeSlug.enforcement ?? "update";
    const branchName = `decern/${adrId.toLowerCase()}-${slug}-${branchSuffix}`;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-app-text">{labels.preview}: {changeLabel}</h3>
          <button type="button" onClick={resetAll} className="text-xs text-app-text-muted hover:text-app-text">
            {labels.close}
          </button>
        </div>
        <p className="font-mono text-xs text-app-text-muted">
          branch: <span className="select-all text-app-text">{branchName}</span>
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-lg border border-app-border bg-app-bg px-4 py-3 font-mono text-xs leading-relaxed text-app-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={Math.min(draft.split("\n").length + 2, 25)}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
          >
            {copied ? labels.copied : labels.copy}
          </button>
          {isGitHub ? (
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

  // No body
  if (!rawBody) {
    return <p className="text-xs text-app-text-muted">{labels.bodyRequired}</p>;
  }

  // Build available actions
  const actions: ActionDef[] = [];
  if (currentStatus === "proposed") {
    actions.push({ key: "approve", label: labels.approve, changes: { status: "approved" }, tone: "green" });
    actions.push({ key: "reject", label: labels.reject, changes: { status: "rejected" }, tone: "red" });
  }
  if (currentStatus === "approved" && currentEnforcement === "warning") {
    actions.push({ key: "promote", label: labels.promoteBlocking, changes: { enforcement: "blocking" }, tone: "amber" });
  }
  if (currentStatus === "approved" && currentEnforcement === "blocking") {
    actions.push({ key: "demote", label: labels.demoteWarning, changes: { enforcement: "warning" }, tone: "gray" });
  }
  if (currentStatus === "approved") {
    actions.push({ key: "supersede", label: labels.supersede, changes: { status: "superseded" }, tone: "gray", needsSupersededBy: true });
  }

  if (actions.length === 0) return null;

  const TONE_CLASSES: Record<string, string> = {
    green: "bg-green-600 hover:bg-green-700 text-white",
    red: "bg-red-600 hover:bg-red-700 text-white",
    amber: "bg-amber-600 hover:bg-amber-700 text-white",
    gray: "border border-app-border bg-app-bg text-app-text-muted hover:bg-app-hover hover:text-app-text",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={() => handleActionClick(a)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${TONE_CLASSES[a.tone]}`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function parseChangesFromLabel(label: string): { status?: string; enforcement?: string } {
  const l = label.toLowerCase();
  if (l.includes("approv")) return { status: "approved" };
  if (l.includes("reject") || l.includes("rifiut")) return { status: "rejected" };
  if (l.includes("supersed")) return { status: "superseded" };
  if (l.includes("blocking") || l.includes("promuov")) return { enforcement: "blocking" };
  if (l.includes("warning") || l.includes("declass")) return { enforcement: "warning" };
  return {};
}
