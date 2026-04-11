import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";
import Link from "next/link";

type AdrRow = {
  id: string;
  repository_identifier: string;
  title: string;
  status: string;
  enforcement: string;
  scope: string[] | null;
};

export default async function AdrsPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
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
    .select("id, repository_identifier, title, status, enforcement, scope")
    .eq("workspace_id", workspaceId)
    .order("repository_identifier", { ascending: true })
    .order("id", { ascending: true });

  if (selectedRepo) query.eq("repository_identifier", selectedRepo);

  const { data: adrs } = await query;
  const allAdrs = (adrs ?? []) as AdrRow[];

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

  return (
    <div className="mx-auto max-w-4xl">
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
        <div className="rounded-xl border border-app-border bg-app-card p-8 text-center">
          <p className="text-sm font-medium text-app-text">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-app-text-muted">{t("emptyBody")}</p>
          <pre className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-left font-mono text-xs text-gray-300">
            npx decern init
          </pre>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([repo, rows]) => (
            <div key={repo} className="overflow-hidden rounded-xl border border-app-border bg-app-card">
              <div className="flex items-center justify-between border-b border-app-border bg-app-bg px-4 py-2">
                <p className="font-mono text-xs text-app-text-muted">{repo}</p>
                <p className="text-xs text-app-text-muted">{rows.length}</p>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-app-border text-left text-xs font-medium uppercase tracking-wide text-app-text-muted">
                  <tr>
                    <th className="px-4 py-3">{t("colId")}</th>
                    <th className="px-4 py-3">{t("colTitle")}</th>
                    <th className="px-4 py-3">{t("colStatus")}</th>
                    <th className="px-4 py-3">{t("colEnforcement")}</th>
                    <th className="px-4 py-3">{t("colScope")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {rows.map((adr) => (
                    <tr key={`${adr.repository_identifier}/${adr.id}`} className="transition-colors hover:bg-app-hover">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-app-text-muted">{adr.id}</td>
                      <td className="px-4 py-3 font-medium text-app-text">{adr.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          adr.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          adr.status === "superseded" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>{adr.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          adr.enforcement === "blocking" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>{adr.enforcement}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-app-text-muted">
                        {adr.scope && adr.scope.length > 0 ? adr.scope.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
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
