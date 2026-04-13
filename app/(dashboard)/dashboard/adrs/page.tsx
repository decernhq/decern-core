import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";
import Link from "next/link";
import { parseAdrMarkdown } from "@decern/protocol/adr";
import { AdrDetailDrawer, type DrawerAdr } from "@/components/dashboard/adr-detail-drawer";
import { AdrsList } from "@/components/dashboard/adrs-list";

type AdrRow = {
  id: string;
  repository_identifier: string;
  title: string;
  status: string;
  enforcement: string;
  scope: string[] | null;
  content_hash: string;
  body: string | null;
  synced_at: string;
};

export default async function AdrsPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; sel_repo?: string; sel_id?: string }>;
}) {
  const t = await getTranslations("adrs");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) redirect("/dashboard");

  const { repo: selectedRepo } = await searchParams;

  const query = supabase
    .from("adr_cache")
    .select("id, repository_identifier, title, status, enforcement, scope, content_hash, body, synced_at")
    .eq("workspace_id", workspaceId)
    .order("repository_identifier", { ascending: true })
    .order("id", { ascending: true });

  if (selectedRepo) query.eq("repository_identifier", selectedRepo);

  const { data: adrs } = await query;
  const allAdrs = (adrs ?? []) as AdrRow[];

  // Parse each ADR body server-side. Some rows may have null body (synced
  // before migration 00053); those get `parsed: null` and the drawer shows a
  // "body missing, re-sync" hint.
  const drawerAdrs: DrawerAdr[] = allAdrs.map((a) => {
    const parsed = a.body ? parseAdrMarkdown(a.body) : null;
    return {
      id: a.id,
      repository_identifier: a.repository_identifier,
      title: a.title,
      status: a.status,
      enforcement: a.enforcement,
      scope: a.scope ?? [],
      content_hash: a.content_hash,
      synced_at: a.synced_at,
      parsed: parsed
        ? {
            supersedes: parsed.supersedes,
            date: parsed.date,
            context: parsed.context,
            decision: parsed.decision,
            consequences: parsed.consequences,
          }
        : null,
      raw_body: a.body,
    };
  });

  // Distinct repo list for the filter dropdown (unfiltered query, separate call).
  const { data: repoRows } = await supabase
    .from("adr_cache")
    .select("repository_identifier")
    .eq("workspace_id", workspaceId);

  const repoOptions = Array.from(
    new Set((repoRows ?? []).map((r) => r.repository_identifier as string))
  ).sort();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{t("title")}</h1>
          <p className="mt-1 text-sm text-app-text-muted">{t("subtitle")}</p>
        </div>

        {repoOptions.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-app-text-muted">
              {t("filterRepo")}
            </label>
            <div className="flex flex-wrap gap-1">
              <RepoPill href="/dashboard/adrs" active={!selectedRepo} label={t("filterAll")} />
              {repoOptions.map((r) => (
                <RepoPill
                  key={r}
                  href={`/dashboard/adrs?repo=${encodeURIComponent(r)}`}
                  active={selectedRepo === r}
                  label={r}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {allAdrs.length === 0 ? (
        <div className="rounded-xl border border-app-border bg-app-card p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-bg">
            <svg className="h-6 w-6 text-app-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-app-text">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-app-text-muted">{t("emptyBody")}</p>
          <pre className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-left font-mono text-xs text-gray-300">
            npx decern init
          </pre>
        </div>
      ) : (
        <AdrsList
          adrs={allAdrs.map((a) => ({
            id: a.id,
            repository_identifier: a.repository_identifier,
            title: a.title,
            status: a.status,
            enforcement: a.enforcement,
            scope: a.scope,
          }))}
          workspaceId={workspaceId}
          selectedRepo={selectedRepo}
          labels={{
            search: t("search"),
            colId: t("colId"),
            colTitle: t("colTitle"),
            colStatus: t("colStatus"),
            colEnforcement: t("colEnforcement"),
            colScope: t("colScope"),
            syncButton: t("syncButton"),
            syncing: t("syncing"),
            synced: t("synced"),
            syncCliHint: t("syncCliHint"),
            noResults: t("searchNoResults"),
            blocking: t("filterBlocking"),
            proposed: t("filterProposed"),
          }}
        />
      )}

      <AdrDetailDrawer
        adrs={drawerAdrs}
        workspaceId={workspaceId}
        labels={{
          close: t("drawerClose"),
          repository: t("drawerRepository"),
          status: t("colStatus"),
          enforcement: t("colEnforcement"),
          scope: t("colScope"),
          supersedes: t("drawerSupersedes"),
          date: t("drawerDate"),
          context: t("drawerContext"),
          decision: t("drawerDecision"),
          consequences: t("drawerConsequences"),
          rawBody: t("drawerRawBody"),
          bodyMissing: t("drawerBodyMissing"),
        }}
        lifecycleLabels={{
          approve: t("actionApprove"),
          reject: t("actionReject"),
          supersede: t("actionSupersede"),
          promoteBlocking: t("actionPromoteBlocking"),
          demoteWarning: t("actionDemoteWarning"),
          loading: t("actionLoading"),
          prCreated: t("actionPrCreated"),
          preview: t("actionPreview"),
          copy: t("actionCopy"),
          copied: t("actionCopied"),
          createPr: t("actionCreatePr"),
          creatingPr: t("actionCreatingPr"),
          close: t("actionClose"),
          bodyRequired: t("actionBodyRequired"),
          githubOnly: t("actionGithubOnly"),
          supersededByLabel: t("actionSupersededByLabel"),
          supersededByPlaceholder: t("actionSupersededByPlaceholder"),
          supersededByRequired: t("actionSupersededByRequired"),
        }}
      />
    </div>
  );
}

function RepoPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex rounded-full px-3 py-1 font-mono text-xs transition-colors ${
        active
          ? "bg-brand-600 text-white"
          : "bg-app-bg text-app-text-muted hover:bg-app-hover hover:text-app-text"
      }`}
    >
      {label}
    </Link>
  );
}

