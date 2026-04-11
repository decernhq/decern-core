"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { GateRun } from "@/lib/queries/gate-runs";

type Props = {
  runs: GateRun[];
};

type VerdictStyle = { label: string; chip: string };

function getVerdictStyle(verdict: string, reasonCode: string, t: ReturnType<typeof useTranslations>): VerdictStyle {
  if (verdict === "block") {
    return { label: t("verdictBlock"), chip: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" };
  }
  if (verdict === "warn") {
    return { label: t("verdictWarn"), chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
  }
  if (reasonCode === "OVERRIDE") {
    return { label: t("verdictOverride"), chip: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" };
  }
  return { label: t("verdictPass"), chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" };
}

export function GateRunsTable({ runs }: Props) {
  const t = useTranslations("gateRuns");
  const locale = useLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const [selected, setSelected] = useState<GateRun | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-app-border bg-app-card">
        <div className="border-b border-app-border px-6 py-4">
          <h2 className="text-lg font-semibold text-app-text">{t("recentTitle")}</h2>
        </div>
        <p className="p-6 text-sm text-app-text-muted">{t("recentEmpty")}</p>
      </div>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-app-border bg-app-card">
        <header className="flex items-center justify-between border-b border-app-border px-6 py-4">
          <h2 className="text-lg font-semibold text-app-text">{t("recentTitle")}</h2>
          <span className="rounded-full bg-app-bg px-2.5 py-0.5 text-xs font-medium text-app-text-muted">
            {runs.length}
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-app-border text-sm">
            <thead className="bg-app-bg text-left text-xs font-medium uppercase tracking-wide text-app-text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">{t("colPr")}</th>
                <th className="px-6 py-3 font-medium">{t("colRepo")}</th>
                <th className="px-6 py-3 font-medium">{t("colVerdict")}</th>
                <th className="px-6 py-3 font-medium">{t("colAdrs")}</th>
                <th className="px-6 py-3 font-medium text-right">{t("colDetails")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {runs.map((run) => {
                const style = getVerdictStyle(run.verdict, run.reason_code, t);
                const adrChecks = (run.deterministic_checks ?? []) as Array<Record<string, unknown>>;
                const adrsEvaluated = adrChecks.filter((c) => c.result !== "skipped");
                return (
                  <tr key={run.evidence_id} className="text-app-text transition-colors hover:bg-app-hover">
                    <td className="px-6 py-3 align-top">
                      <div className="font-medium text-app-text">
                        {run.pull_request_id ? `#${run.pull_request_id}` : t("untitledPr")}
                      </div>
                      <div className="mt-0.5 text-xs text-app-text-muted">
                        {new Date(run.timestamp_utc).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </td>
                    <td className="px-6 py-3 align-top font-mono text-xs text-app-text-muted">
                      {run.repository_identifier || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 align-top">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", style.chip)}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-top text-xs text-app-text-muted tabular-nums">
                      {adrsEvaluated.length > 0 ? `${adrsEvaluated.length}` : "—"}
                    </td>
                    <td className="px-6 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(run)}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        {t("detailsLink")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <RunDetailsModal run={selected} onClose={() => setSelected(null)} dateLocale={dateLocale} />
      )}
    </>
  );
}

function RunDetailsModal({
  run,
  onClose,
  dateLocale,
}: {
  run: GateRun;
  onClose: () => void;
  dateLocale: string;
}) {
  const t = useTranslations("gateRuns");
  const style = getVerdictStyle(run.verdict, run.reason_code, t);
  const created = new Date(run.timestamp_utc).toLocaleString(dateLocale, { dateStyle: "long", timeStyle: "short" });
  const adrChecks = (run.deterministic_checks ?? []) as Array<Record<string, unknown>>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-app-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-app-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-app-text">
                {run.pull_request_id ? `PR #${run.pull_request_id}` : t("untitledPr")}
              </h2>
              <p className="mt-0.5 text-xs text-app-text-muted">{created}</p>
            </div>
            <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium", style.chip)}>
              {style.label}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label={t("modalRepo")} fullWidth>
              <span className="font-mono text-xs text-app-text-muted">{run.repository_identifier || "—"}</span>
            </Field>
            <Field label={t("modalCommit")}>
              <code className="rounded bg-app-bg px-1.5 py-0.5 text-xs text-app-text-muted">
                {run.commit_sha ? run.commit_sha.slice(0, 12) : "—"}
              </code>
            </Field>
            <Field label={t("modalCiProvider")}>
              <span className="text-xs text-app-text-muted">{run.ci_provider || "unknown"}</span>
            </Field>
            <Field label={t("modalAuthor")} fullWidth>
              {run.author_identity?.display_name ? (
                <span className="text-sm text-app-text">
                  {run.author_identity.display_name}
                  {run.author_identity.email && run.author_identity.email !== "unknown" && (
                    <span className="text-app-text-muted"> ({run.author_identity.email})</span>
                  )}
                </span>
              ) : (
                <span className="text-app-text-muted">—</span>
              )}
            </Field>
          </dl>

          {run.reason_detail?.trim() && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t("modalReason")}</p>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-app-bg p-3 text-sm text-app-text">
                {run.reason_detail}
              </p>
            </div>
          )}

          {adrChecks.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t("modalAdrsEvaluated")}</p>
              <div className="mt-2 space-y-2">
                {adrChecks.map((check, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                    <span className="font-mono text-xs text-app-text">{String(check.check_id ?? "—")}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      check.result === "pass" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                      check.result === "fail" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" :
                      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      {String(check.result ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {run.diff_files_touched.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t("modalFiles")}</p>
              <ul className="mt-2 space-y-1">
                {run.diff_files_touched.slice(0, 10).map((f) => (
                  <li key={f} className="font-mono text-xs text-app-text-muted">{f}</li>
                ))}
                {run.diff_files_touched.length > 10 && (
                  <li className="text-xs text-app-text-muted">+ {run.diff_files_touched.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-app-border px-6 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t("modalClose")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(fullWidth && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-app-text">{children}</dd>
    </div>
  );
}
