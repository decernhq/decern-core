import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { getProjects } from "@/lib/queries/projects";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { IS_CLOUD } from "@/lib/cloud";

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");

  const [{ data: { user } }, projects, workspaceId] = await Promise.all([
    supabase.auth.getUser(),
    getProjects(),
    getSelectedWorkspaceId(),
  ]);

  const [{ data: ws }, { data: ghConn }] = await Promise.all([
    workspaceId
      ? supabase.from("workspaces").select("ci_token_hash").eq("id", workspaceId).single()
      : { data: null },
    user?.id
      ? supabase.from("github_connections").select("github_username").eq("user_id", user!.id).maybeSingle()
      : { data: null },
  ]);

  // Counts from new tables
  const [{ count: adrCount }, { count: signalCount }, { count: evidenceCount }] = await Promise.all([
    workspaceId ? supabase.from("adr_cache").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId) : { count: 0 },
    workspaceId ? supabase.from("case_c_signals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "open") : { count: 0 },
    workspaceId ? supabase.from("evidence_records").select("evidence_id", { count: "exact", head: true }).eq("workspace_id", workspaceId) : { count: 0 },
  ]);

  let displayName = user?.email ?? t("user");
  if (user?.id) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    if (profile?.full_name?.trim()) displayName = profile.full_name.trim();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <OnboardingChecklist
        hasProjects={projects.length > 0}
        hasDecisions={(adrCount ?? 0) > 0}
        hasCiToken={!!ws?.ci_token_hash}
        hasGithub={!!ghConn}
        isCloud={IS_CLOUD}
      />

      <div className="rounded-xl border border-app-border bg-app-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-app-text">{t("welcome")}</h1>
        <p className="mt-2 text-app-text-muted">
          {t("hello")} <span className="font-medium text-app-text">{displayName}</span>
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/adrs" className="rounded-lg border border-app-border bg-app-bg p-4 transition hover:border-brand-300">
            <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t("adrs")}</p>
            <p className="mt-1 text-2xl font-semibold text-app-text">{adrCount ?? 0}</p>
          </Link>
          <Link href="/dashboard/signals" className="rounded-lg border border-app-border bg-app-bg p-4 transition hover:border-amber-300">
            <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t("openSignals")}</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">{signalCount ?? 0}</p>
          </Link>
          <Link href="/dashboard/gate-runs" className="rounded-lg border border-app-border bg-app-bg p-4 transition hover:border-brand-300">
            <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t("evidenceRecords")}</p>
            <p className="mt-1 text-2xl font-semibold text-app-text">{evidenceCount ?? 0}</p>
          </Link>
          <Link href="/dashboard/projects" className="rounded-lg border border-app-border bg-app-bg p-4 transition hover:border-brand-300">
            <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t("projects")}</p>
            <p className="mt-1 text-2xl font-semibold text-app-text">{projects.length}</p>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/adrs"><Button>{t("viewAdrs")}</Button></Link>
          <Link href="/dashboard/gate-runs"><Button variant="outline">{t("viewGateRuns")}</Button></Link>
          {(signalCount ?? 0) > 0 && (
            <Link href="/dashboard/signals"><Button variant="ghost">{t("viewSignals")}</Button></Link>
          )}
        </div>
      </div>

      {(adrCount ?? 0) === 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-800 dark:bg-brand-950">
          <h2 className="text-lg font-semibold text-brand-900 dark:text-brand-100">{t("howToStart")}</h2>
          <ol className="mt-4 space-y-3 text-sm text-brand-800 dark:text-brand-200">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">1</span>
              <span>{t("step1Init")}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">2</span>
              <span>{t("step2Commit")}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">3</span>
              <span>{t("step3Gate")}</span>
            </li>
          </ol>
          <pre className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 font-mono text-xs text-gray-300">npx decern init</pre>
        </div>
      )}
    </div>
  );
}
