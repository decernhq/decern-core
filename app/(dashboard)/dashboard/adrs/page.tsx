import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";
import Link from "next/link";
import { parseAdrMarkdown } from "@decern/protocol/adr";
import { AdrDetailDrawer, type DrawerAdr } from "@/components/dashboard/adr-detail-drawer";

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

  // Group ADRs by repo for display.
  const grouped = new Map<string, AdrRow[]>();
  for (const adr of allAdrs) {
    const key = adr.repository_identifier;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(adr);
  }

  const rowLinkHref = (a: AdrRow) => {
    const params = new URLSearchParams();
    if (selectedRepo) params.set("repo", selectedRepo);
    params.set("sel_repo", a.repository_identifier);
    params.set("sel_id", a.id);
    return `/dashboard/adrs?${params.toString()}`;
  };

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
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([repo, rows]) => (
            <div key={repo} className="overflow-hidden rounded-xl border border-app-border bg-app-card shadow-sm">
              {/* Repo header */}
              <div className="flex items-center justify-between gap-3 border-b border-app-border bg-app-bg/60 px-5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <svg className="h-4 w-4 flex-shrink-0 text-app-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  <p className="truncate font-mono text-sm font-medium text-app-text">{repo}</p>
                </div>
                <span className="flex-shrink-0 rounded-full border border-app-border bg-app-card px-2.5 py-0.5 text-xs font-medium text-app-text-muted">
                  {rows.length}
                </span>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-[11%]" />
                    <col />
                    <col className="w-[12%]" />
                    <col className="w-[14%]" />
                    <col className="w-[25%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-app-border bg-app-bg/30 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-app-text-muted">
                      <th className="px-5 py-2.5">{t("colId")}</th>
                      <th className="px-5 py-2.5">{t("colTitle")}</th>
                      <th className="px-5 py-2.5">{t("colStatus")}</th>
                      <th className="px-5 py-2.5">{t("colEnforcement")}</th>
                      <th className="px-5 py-2.5">{t("colScope")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {rows.map((adr) => (
                      <tr
                        key={`${adr.repository_identifier}/${adr.id}`}
                        className="group relative cursor-pointer transition-colors hover:bg-app-hover/70"
                      >
                        <td className="p-0 align-middle">
                          <Link href={rowLinkHref(adr)} className="block whitespace-nowrap px-5 py-3.5">
                            <span className="rounded bg-app-bg px-1.5 py-0.5 font-mono text-[0.72rem] font-medium text-app-text-muted group-hover:bg-app-card">
                              {adr.id}
                            </span>
                          </Link>
                        </td>
                        <td className="p-0 align-middle">
                          <Link
                            href={rowLinkHref(adr)}
                            className="block px-5 py-3.5 font-medium text-app-text group-hover:text-brand-600 dark:group-hover:text-brand-400"
                          >
                            {adr.title}
                          </Link>
                        </td>
                        <td className="p-0 align-middle">
                          <Link href={rowLinkHref(adr)} className="block px-5 py-3.5">
                            <StatusPill status={adr.status} />
                          </Link>
                        </td>
                        <td className="p-0 align-middle">
                          <Link href={rowLinkHref(adr)} className="block px-5 py-3.5">
                            <EnforcementPill enforcement={adr.enforcement} />
                          </Link>
                        </td>
                        <td className="p-0 align-middle">
                          <Link href={rowLinkHref(adr)} className="block px-5 py-3.5">
                            <ScopeChips scope={adr.scope} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-app-border md:hidden">
                {rows.map((adr) => (
                  <li key={`${adr.repository_identifier}/${adr.id}`}>
                    <Link
                      href={rowLinkHref(adr)}
                      className="block px-4 py-3 transition-colors hover:bg-app-hover/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded bg-app-bg px-1.5 py-0.5 font-mono text-[0.72rem] font-medium text-app-text-muted">
                          {adr.id}
                        </span>
                        <StatusPill status={adr.status} />
                      </div>
                      <p className="mt-2 font-medium text-app-text">{adr.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <EnforcementPill enforcement={adr.enforcement} />
                        <ScopeChips scope={adr.scope} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AdrDetailDrawer
        adrs={drawerAdrs}
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

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : status === "superseded"
        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  const dot =
    status === "approved"
      ? "bg-green-500"
      : status === "superseded"
        ? "bg-gray-400"
        : "bg-yellow-500";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function EnforcementPill({ enforcement }: { enforcement: string }) {
  const isBlocking = enforcement === "blocking";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isBlocking
          ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        {isBlocking ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        )}
      </svg>
      {enforcement}
    </span>
  );
}

function ScopeChips({ scope }: { scope: string[] | null }) {
  if (!scope || scope.length === 0) {
    return <span className="text-xs text-app-text-muted">—</span>;
  }
  const MAX = 2;
  const visible = scope.slice(0, MAX);
  const extra = scope.length - MAX;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((s, i) => (
        <code
          key={i}
          className="max-w-[14rem] truncate rounded border border-app-border bg-app-bg px-1.5 py-0.5 font-mono text-[0.7rem] text-app-text-muted"
          title={s}
        >
          {s}
        </code>
      ))}
      {extra > 0 && (
        <span className="rounded-full bg-app-bg px-1.5 py-0.5 font-mono text-[0.7rem] text-app-text-muted">
          +{extra}
        </span>
      )}
    </div>
  );
}
