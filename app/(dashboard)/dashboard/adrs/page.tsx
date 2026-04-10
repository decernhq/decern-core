import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";

export default async function AdrsPage() {
  const t = await getTranslations("adrs");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) redirect("/dashboard");

  const { data: adrs } = await supabase
    .from("adr_cache")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("id", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">{t("title")}</h1>
        <p className="mt-1 text-sm text-app-text-muted">{t("subtitle")}</p>
      </div>

      {!adrs || adrs.length === 0 ? (
        <div className="rounded-xl border border-app-border bg-app-card p-8 text-center">
          <p className="text-sm font-medium text-app-text">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-app-text-muted">{t("emptyBody")}</p>
          <pre className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-left font-mono text-xs text-gray-300">
            npx decern init
          </pre>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
          <table className="w-full text-sm">
            <thead className="border-b border-app-border bg-app-bg text-left text-xs font-medium uppercase tracking-wide text-app-text-muted">
              <tr>
                <th className="px-4 py-3">{t("colId")}</th>
                <th className="px-4 py-3">{t("colTitle")}</th>
                <th className="px-4 py-3">{t("colStatus")}</th>
                <th className="px-4 py-3">{t("colEnforcement")}</th>
                <th className="px-4 py-3">{t("colScope")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {adrs.map((adr) => (
                <tr key={adr.id} className="transition-colors hover:bg-app-hover">
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
                    {adr.scope?.length > 0 ? adr.scope.join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
