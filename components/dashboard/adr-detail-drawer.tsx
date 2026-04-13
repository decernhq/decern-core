"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useCallback } from "react";
import { AdrLifecycleActions } from "./adr-lifecycle-actions";

export type DrawerAdr = {
  id: string;
  repository_identifier: string;
  title: string;
  status: string;
  enforcement: string;
  scope: string[];
  content_hash: string;
  synced_at: string;
  parsed: {
    supersedes: string | null;
    date: string | null;
    context: string;
    decision: string;
    consequences: string;
  } | null;
  raw_body: string | null;
};

export type LifecycleLabels = {
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

export function AdrDetailDrawer({
  adrs,
  workspaceId,
  labels,
  lifecycleLabels,
}: {
  adrs: DrawerAdr[];
  workspaceId: string;
  labels: {
    close: string;
    repository: string;
    status: string;
    enforcement: string;
    scope: string;
    supersedes: string;
    date: string;
    context: string;
    decision: string;
    consequences: string;
    rawBody: string;
    bodyMissing: string;
  };
  lifecycleLabels: LifecycleLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selRepo = searchParams.get("sel_repo");
  const selId = searchParams.get("sel_id");

  const selected = useMemo(() => {
    if (!selRepo || !selId) return null;
    return adrs.find((a) => a.repository_identifier === selRepo && a.id === selId) ?? null;
  }, [adrs, selRepo, selId]);

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("sel_repo");
    next.delete("sel_id");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, close]);

  if (!selected) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-app-border bg-app-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-app-text-muted">{selected.id}</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-app-text">{selected.title}</h2>
            <p className="mt-1 truncate font-mono text-xs text-app-text-muted">
              {selected.repository_identifier}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={labels.close}
            className="rounded-md p-1.5 text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <MetaRow label={labels.status}>
            <Badge tone={selected.status === "approved" ? "green" : selected.status === "superseded" ? "gray" : "amber"}>
              {selected.status}
            </Badge>
          </MetaRow>
          <MetaRow label={labels.enforcement}>
            <Badge tone={selected.enforcement === "blocking" ? "red" : "amber"}>
              {selected.enforcement}
            </Badge>
          </MetaRow>
          <MetaRow label={labels.scope}>
            {selected.scope.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selected.scope.map((s, i) => (
                  <code key={i} className="rounded bg-app-bg px-2 py-0.5 font-mono text-xs text-app-text-muted">{s}</code>
                ))}
              </div>
            ) : (
              <span className="text-xs text-app-text-muted">—</span>
            )}
          </MetaRow>
          {selected.parsed?.supersedes && (
            <MetaRow label={labels.supersedes}>
              <code className="rounded bg-app-bg px-2 py-0.5 font-mono text-xs text-app-text-muted">{selected.parsed.supersedes}</code>
            </MetaRow>
          )}
          {selected.parsed?.date && (
            <MetaRow label={labels.date}>
              <span className="text-sm text-app-text-muted">{selected.parsed.date}</span>
            </MetaRow>
          )}

          {selected.parsed ? (
            <>
              <Section title={labels.context} text={selected.parsed.context} />
              <Section title={labels.decision} text={selected.parsed.decision} />
              <Section title={labels.consequences} text={selected.parsed.consequences} />
            </>
          ) : (
            <div className="mt-6 rounded-md border border-app-border bg-app-bg p-4 text-sm text-app-text-muted">
              {labels.bodyMissing}
            </div>
          )}

          {/* Lifecycle actions */}
          <div className="mt-8 border-t border-app-border pt-5">
            <AdrLifecycleActions
              workspaceId={workspaceId}
              repositoryIdentifier={selected.repository_identifier}
              adrId={selected.id}
              currentStatus={selected.status}
              currentEnforcement={selected.enforcement}
              rawBody={selected.raw_body}
              siblingAdrs={adrs
                .filter((a) => a.repository_identifier === selected.repository_identifier && a.id !== selected.id && a.status === "approved")
                .map((a) => ({ id: a.id, title: a.title }))}
              labels={lifecycleLabels}
            />
          </div>

          {selected.raw_body && (
            <details className="mt-8">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-app-text-muted hover:text-app-text">
                {labels.rawBody}
              </summary>
              <pre className="mt-3 overflow-x-auto rounded-md border border-app-border bg-app-bg p-4 font-mono text-xs leading-relaxed text-app-text">
                {selected.raw_body}
              </pre>
            </details>
          )}
        </div>
      </aside>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-4">
      <div className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-app-text-muted">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "red" | "amber" | "gray"; children: React.ReactNode }) {
  const cls = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

/**
 * Section renders an ADR section (Context / Decision / Consequences).
 * Light markdown: preserves line breaks, renders **bold**, `code`, and
 * - bulleted lists. No external dependency.
 */
function Section({ title, text }: { title: string; text: string }) {
  if (!text?.trim()) return null;
  return (
    <section className="mt-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-app-text">
        {renderLiteMarkdown(text)}
      </div>
    </section>
  );
}

function renderLiteMarkdown(text: string): React.ReactNode {
  // Group consecutive "- " lines into a single <ul>, other lines into paragraphs.
  const blocks: Array<{ type: "p"; lines: string[] } | { type: "ul"; items: string[] }> = [];
  const lines = text.split("\n");
  let current: (typeof blocks)[number] | null = null;

  const flush = () => { if (current) { blocks.push(current); current = null; } };

  for (const raw of lines) {
    const line = raw;
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (current?.type !== "ul") { flush(); current = { type: "ul", items: [] }; }
      current.items.push(bullet[1]);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (current?.type !== "p") { flush(); current = { type: "p", lines: [] }; }
    current.lines.push(line);
  }
  flush();

  return blocks.map((b, i) => {
    if (b.type === "ul") {
      return (
        <ul key={i} className="ml-5 list-disc space-y-1">
          {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
        </ul>
      );
    }
    return (
      <p key={i} className="whitespace-pre-wrap">
        {b.lines.map((l, j) => (
          <span key={j}>
            {renderInline(l)}
            {j < b.lines.length - 1 && "\n"}
          </span>
        ))}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  // Tokenize into bold / code / plain, in one pass. Regex matches `code` or **bold**.
  const nodes: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(<code key={key++} className="rounded bg-app-bg px-1 py-0.5 font-mono text-xs">{tok.slice(1, -1)}</code>);
    } else {
      nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
