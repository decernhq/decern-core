import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";

export default async function SignalsPage() {
  const t = await getTranslations("signals");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) redirect("/dashboard");

  const { data: signals } = await supabase
    .from("case_c_signals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  const openSignals = (signals ?? []).filter(s => s.status === "open");
  const resolvedSignals = (signals ?? []).filter(s => s.status !== "open");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">{t("title")}</h1>
        <p className="mt-1 text-sm text-app-text-muted">{t("subtitle")}</p>
      </div>

      {!signals || signals.length === 0 ? (
        <div className="rounded-xl border border-app-border bg-app-card p-8 text-center">
          <p className="text-sm font-medium text-app-text">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-app-text-muted">{t("emptyBody")}</p>
        </div>
      ) : (
        <>
          {openSignals.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-app-text">{t("openTitle")} ({openSignals.length})</h2>
              <div className="space-y-3">
                {openSignals.map((signal) => (
                  <div key={signal.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-app-text">{signal.suggested_adr_title || t("untitled")}</p>
                        <p className="mt-1 text-sm text-app-text-muted">{signal.description}</p>
                        {signal.pr_url && (
                          <a href={signal.pr_url} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-brand-600 hover:underline">
                            {signal.pr_title || signal.pr_url}
                          </a>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                        {t("open")}
                      </span>
                    </div>
                    {signal.files_involved?.length > 0 && (
                      <p className="mt-2 font-mono text-xs text-app-text-muted">{signal.files_involved.slice(0, 5).join(", ")}{signal.files_involved.length > 5 ? ` +${signal.files_involved.length - 5}` : ""}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolvedSignals.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-app-text-muted">{t("resolvedTitle")} ({resolvedSignals.length})</h2>
              <div className="space-y-2">
                {resolvedSignals.map((signal) => (
                  <div key={signal.id} className="rounded-lg border border-app-border bg-app-card p-3 opacity-60">
                    <p className="text-sm text-app-text-muted">{signal.suggested_adr_title} — {signal.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
