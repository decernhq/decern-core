"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { JudgeGateRun } from "@/types/database";

type Props = {
  runs: JudgeGateRun[];
};

export function GateRunsTable({ runs }: Props) {
  const t = useTranslations("gateRuns");
  const locale = useLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const [selected, setSelected] = useState<JudgeGateRun | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{t("recentTitle")}</h2>
        </div>
        <p className="p-6 text-sm text-gray-500">{t("recentEmpty")}</p>
      </div>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{t("recentTitle")}</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {runs.length}
          </span>
        </header>
        <div className="overflow-x-auto bg-white">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">{t("colPr")}</th>
                <th className="px-6 py-3 font-medium">{t("colDecision")}</th>
                <th className="px-6 py-3 font-medium">{t("colVerdict")}</th>
                <th className="px-6 py-3 font-medium">{t("colConfidence")}</th>
                <th className="px-6 py-3 font-medium text-right">{t("colDetails")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {runs.map((run) => {
                const verdictPass = run.allowed === true;
                return (
                  <tr key={run.id} className="text-gray-700 transition-colors hover:bg-gray-50/40">
                    <td className="px-6 py-3 align-top">
                      <div className="font-medium text-gray-900">
                        {run.pr_url ? (
                          <a
                            href={run.pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-brand-700 hover:underline"
                          >
                            {run.pr_title?.trim() || t("untitledPr")}
                          </a>
                        ) : (
                          run.pr_title?.trim() || t("untitledPr")
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {new Date(run.created_at).toLocaleString(dateLocale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-3 align-top">
                      {run.decision_id ? (
                        <Link
                          href={`/dashboard/decisions/${run.decision_id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {run.decision_adr_ref || run.decision_title || t("decisionFallback")}
                        </Link>
                      ) : (
                        <span className="text-gray-500">
                          {run.decision_adr_ref || run.decision_title || "—"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 align-top">
                      <div className="flex flex-nowrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            verdictPass
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {verdictPass ? t("verdictPass") : t("verdictFlag")}
                        </span>
                        {run.advisory && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            {t("advisoryBadge")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 align-top text-gray-700 tabular-nums">
                      {run.confidence_percent != null ? `${run.confidence_percent}%` : "—"}
                    </td>
                    <td className="px-6 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(run)}
                        className="text-sm font-medium text-brand-700 hover:underline"
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
        <RunDetailsModal
          run={selected}
          onClose={() => setSelected(null)}
          dateLocale={dateLocale}
        />
      )}
    </>
  );
}

function RunDetailsModal({
  run,
  onClose,
  dateLocale,
}: {
  run: JudgeGateRun;
  onClose: () => void;
  dateLocale: string;
}) {
  const t = useTranslations("gateRuns");
  const verdictPass = run.allowed === true;
  const created = new Date(run.created_at).toLocaleString(dateLocale, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-details-title"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="run-details-title"
                className="truncate text-lg font-semibold text-gray-900"
              >
                {run.pr_title?.trim() || t("untitledPr")}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">{created}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  verdictPass
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                )}
              >
                {verdictPass ? t("verdictPass") : t("verdictFlag")}
              </span>
              {run.advisory && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  {t("advisoryBadge")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label={t("modalDecision")}>
              {run.decision_id ? (
                <Link
                  href={`/dashboard/decisions/${run.decision_id}`}
                  className="text-brand-700 hover:underline"
                >
                  {run.decision_adr_ref || run.decision_title || t("decisionFallback")}
                </Link>
              ) : (
                <span className="text-gray-500">
                  {run.decision_adr_ref || run.decision_title || "—"}
                </span>
              )}
            </Field>
            <Field label={t("modalConfidence")}>
              <span className="tabular-nums">
                {run.confidence_percent != null ? `${run.confidence_percent}%` : "—"}
              </span>
            </Field>
            <Field label={t("modalPrUrl")} fullWidth={!run.pr_url}>
              {run.pr_url ? (
                <a
                  href={run.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-brand-700 hover:underline"
                >
                  {run.pr_url}
                </a>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </Field>
            <Field label={t("modalBaseSha")}>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                {run.base_sha ? run.base_sha.slice(0, 12) : "—"}
              </code>
            </Field>
            <Field label={t("modalHeadSha")}>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                {run.head_sha ? run.head_sha.slice(0, 12) : "—"}
              </code>
            </Field>
          </dl>

          {run.reason?.trim() && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("modalReason")}
              </p>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {run.reason}
              </p>
            </div>
          )}

          {run.advisory_message?.trim() && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                {t("modalAdvisory")}
              </p>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {run.advisory_message}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-3">
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
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-gray-900">{children}</dd>
    </div>
  );
}
