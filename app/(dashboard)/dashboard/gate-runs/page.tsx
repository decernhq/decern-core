import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getGateRunStatsThisMonth, getRecentGateRuns } from "@/lib/queries/gate-runs";
import { cn } from "@/lib/utils";

export default async function GateRunsPage() {
  const t = await getTranslations("gateRuns");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const [stats, runs] = await Promise.all([
    getGateRunStatsThisMonth(),
    getRecentGateRuns(20),
  ]);

  const hasRuns = stats.total > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        {hasRuns ? (
          <>
            <p className="text-3xl font-bold text-gray-900 sm:text-4xl">
              {t("hero", { percent: stats.alignedPercent, flagged: stats.flagged })}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {t("heroSub", { period: stats.periodLabel, total: stats.total })}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <Stat label={t("statTotal")} value={String(stats.total)} />
              <Stat label={t("statFlagged")} value={String(stats.flagged)} tone="rose" />
              <Stat label={t("statAligned")} value={`${stats.alignedPercent}%`} tone="emerald" />
              <Stat
                label={t("statAvgConfidence")}
                value={stats.avgConfidencePercent != null ? `${stats.avgConfidencePercent}%` : "—"}
              />
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-gray-500">{t("emptyBody")}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{t("recentTitle")}</h2>
        </div>
        {runs.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">{t("recentEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">{t("colPr")}</th>
                  <th className="px-6 py-3">{t("colDecision")}</th>
                  <th className="px-6 py-3">{t("colVerdict")}</th>
                  <th className="px-6 py-3">{t("colConfidence")}</th>
                  <th className="px-6 py-3">{t("colReason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const verdictPass = run.allowed === true;
                  const reasonText =
                    run.advisory_message?.trim() ||
                    run.reason?.trim() ||
                    "—";
                  return (
                    <tr key={run.id} className="text-gray-700">
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
                      <td className="px-6 py-3 align-top">
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
                          <span className="ml-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            {t("advisoryBadge")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 align-top text-gray-700">
                        {run.confidence_percent != null ? `${run.confidence_percent}%` : "—"}
                      </td>
                      <td className="px-6 py-3 align-top text-gray-600">
                        <p className="line-clamp-1">{reasonText}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "rose" | "emerald";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-gray-200 bg-gray-50 text-gray-900";
  const labelClass =
    tone === "rose"
      ? "text-rose-600"
      : tone === "emerald"
        ? "text-emerald-600"
        : "text-gray-500";
  return (
    <div className={cn("rounded-lg border p-4", toneClass)}>
      <p className={cn("text-xs font-medium uppercase tracking-wide", labelClass)}>{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
