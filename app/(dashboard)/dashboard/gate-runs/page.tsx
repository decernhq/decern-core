import { getTranslations } from "next-intl/server";
import { getGateRunStatsThisMonth, getRecentGateRuns } from "@/lib/queries/gate-runs";
import { GateRunsTable } from "@/components/dashboard/gate-runs-table";
import { cn } from "@/lib/utils";

export default async function GateRunsPage() {
  const t = await getTranslations("gateRuns");

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

      {hasRuns ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <p className="text-lg font-semibold text-gray-900 sm:text-xl">
              {t("hero", { percent: stats.alignedPercent, flagged: stats.flagged })}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {t("heroSub", { period: stats.periodLabel, total: stats.total })}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("statTotal")}
              value={String(stats.total)}
              accent="gray"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
              }
            />
            <StatCard
              label={t("statFlagged")}
              value={String(stats.flagged)}
              accent="rose"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V4.5a.75.75 0 0 1 .75-.75h11.69a.75.75 0 0 1 .53 1.28L13.5 8.25l2.47 3.22a.75.75 0 0 1-.53 1.28H4.5" />
                </svg>
              }
            />
            <StatCard
              label={t("statAligned")}
              value={`${stats.alignedPercent}%`}
              accent="emerald"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              }
            />
            <StatCard
              label={t("statAvgConfidence")}
              value={stats.avgConfidencePercent != null ? `${stats.avgConfidencePercent}%` : "—"}
              accent="brand"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              }
            />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-gray-500">{t("emptyBody")}</p>
          </div>
        </div>
      )}

      <GateRunsTable runs={runs} />
    </div>
  );
}

type Accent = "gray" | "rose" | "emerald" | "brand";

const ACCENT_STYLES: Record<Accent, { chip: string; ring: string }> = {
  gray: {
    chip: "bg-gray-50 text-gray-600",
    ring: "ring-gray-200",
  },
  rose: {
    chip: "bg-rose-50 text-rose-600",
    ring: "ring-rose-200",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600",
    ring: "ring-emerald-200",
  },
  brand: {
    chip: "bg-brand-50 text-brand-600",
    ring: "ring-brand-200",
  },
};

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: Accent;
  icon: React.ReactNode;
}) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset",
            styles.chip,
            styles.ring
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}
