import { getTranslations } from "next-intl/server";
import { getGateRunStatsThisMonth, getRecentGateRuns } from "@/lib/queries/gate-runs";
import { GateRunsTable } from "@/components/dashboard/gate-runs-table";
import { cn } from "@/lib/utils";

export default async function GateRunsPage() {
  const t = await getTranslations("gateRuns");

  const [stats, runs] = await Promise.all([
    getGateRunStatsThisMonth(),
    getRecentGateRuns(50),
  ]);

  const hasRuns = stats.total > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-app-text">{t("title")}</h1>
        <p className="mt-1 text-sm text-app-text-muted">{t("subtitle")}</p>
      </div>

      {hasRuns ? (
        <>
          <div className="rounded-xl border border-app-border bg-app-card p-5 sm:p-6">
            <p className="text-lg font-semibold text-app-text sm:text-xl">
              {t("hero", { percent: stats.passedPercent, blocked: stats.blocked })}
            </p>
            <p className="mt-1 text-sm text-app-text-muted">
              {t("heroSub", { period: stats.periodLabel, total: stats.total })}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("statTotal")} value={String(stats.total)} accent="gray" />
            <StatCard label={t("statPassed")} value={String(stats.passed)} accent="emerald" />
            <StatCard label={t("statWarned")} value={String(stats.warned)} accent="amber" />
            <StatCard label={t("statBlocked")} value={String(stats.blocked)} accent="rose" />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-app-border bg-app-card p-6 sm:p-8">
          <div className="text-center">
            <p className="text-base font-semibold text-app-text">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-app-text-muted">{t("emptyBody")}</p>
          </div>
        </div>
      )}

      <GateRunsTable runs={runs} />
    </div>
  );
}

type Accent = "gray" | "emerald" | "amber" | "rose";

const ACCENT_STYLES: Record<Accent, string> = {
  gray: "text-app-text",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
};

function StatCard({ label, value, accent }: { label: string; value: string; accent: Accent }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-card p-5 transition hover:border-brand-300">
      <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{label}</p>
      <p className={cn("mt-4 text-3xl font-bold tabular-nums", ACCENT_STYLES[accent])}>{value}</p>
    </div>
  );
}
