import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";
import { isPaidWorkspace } from "@/lib/plan-gate";
import { SignalActions } from "@/components/dashboard/signal-actions";

type Signal = {
  id: string;
  workspace_id: string;
  repository_identifier: string;
  pr_url: string | null;
  pr_title: string | null;
  description: string;
  suggested_adr_title: string | null;
  files_involved: string[];
  status: string;
  created_at: string;
};

export default async function SignalsPage() {
  const t = await getTranslations("signals");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) redirect("/dashboard");

  const svc = createServiceRoleClient();
  const paid = await isPaidWorkspace(svc, workspaceId);

  const { data: signals } = await supabase
    .from("case_c_signals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);

  const allSignals = (signals ?? []) as Signal[];
  const openSignals = allSignals.filter((s) => s.status === "open");
  const resolvedSignals = allSignals.filter((s) => s.status !== "open");

  // Group open signals by repo
  const grouped = new Map<string, Signal[]>();
  for (const s of openSignals) {
    const key = s.repository_identifier;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  const actionLabels = {
    generateDraft: t("generateDraft"),
    generating: t("generating"),
    createPr: t("createPr"),
    creatingPr: t("creatingPr"),
    dismiss: t("dismiss"),
    dismissing: t("dismissing"),
    upgradeHint: t("upgradeHint"),
    editHint: t("editHint"),
    prCreated: t("prCreated"),
    close: t("close"),
    previewTitle: t("previewTitle"),
    copyMarkdown: t("copyMarkdown"),
    githubOnly: t("githubOnly"),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">{t("title")}</h1>
        <p className="mt-1 text-sm text-app-text-muted">{t("subtitle")}</p>
      </div>

      {allSignals.length === 0 ? (
        <div className="rounded-xl border border-app-border bg-app-card p-8 text-center">
          <p className="text-sm font-medium text-app-text">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-app-text-muted">{t("emptyBody")}</p>
        </div>
      ) : (
        <>
          {grouped.size > 0 && (
            <div className="mb-8 space-y-6">
              <h2 className="text-lg font-semibold text-app-text">
                {t("openTitle")} ({openSignals.length})
              </h2>
              {Array.from(grouped.entries()).map(([repo, sigs]) => (
                <div
                  key={repo}
                  className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/5"
                >
                  {/* Repo header */}
                  <div className="flex items-center justify-between border-b border-amber-200/60 px-5 py-3 dark:border-amber-800/30">
                    <p className="truncate font-mono text-xs font-medium text-app-text">{repo}</p>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                      {sigs.length}
                    </span>
                  </div>

                  {/* Signal cards */}
                  <div className="divide-y divide-amber-200/40 dark:divide-amber-800/20">
                    {sigs.map((signal) => (
                      <div key={signal.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-app-text">
                              {signal.suggested_adr_title || t("untitled")}
                            </p>
                            <p className="mt-1 text-sm text-app-text-muted">{signal.description}</p>
                            {signal.pr_url && (
                              <a
                                href={signal.pr_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-xs text-brand-600 hover:underline dark:text-brand-400"
                              >
                                {signal.pr_title || signal.pr_url}
                              </a>
                            )}
                            {signal.files_involved?.length > 0 && (
                              <p className="mt-1.5 font-mono text-xs text-app-text-muted">
                                {signal.files_involved.slice(0, 5).join(", ")}
                                {signal.files_involved.length > 5
                                  ? ` +${signal.files_involved.length - 5}`
                                  : ""}
                              </p>
                            )}
                          </div>
                          <time className="shrink-0 text-xs text-app-text-muted">
                            {new Date(signal.created_at).toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions (per-repo group) */}
                  <div className="border-t border-amber-200/60 px-5 py-3 dark:border-amber-800/30">
                    <SignalActions
                      signals={sigs.map((s) => ({
                        id: s.id,
                        description: s.description,
                        suggested_adr_title: s.suggested_adr_title,
                        files_involved: s.files_involved,
                        pr_url: s.pr_url,
                        pr_title: s.pr_title,
                        repository_identifier: s.repository_identifier,
                      }))}
                      workspaceId={workspaceId}
                      isPaid={paid}
                      labels={actionLabels}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolvedSignals.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-app-text-muted">
                {t("resolvedTitle")} ({resolvedSignals.length})
              </h2>
              <div className="space-y-2">
                {resolvedSignals.map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-lg border border-app-border bg-app-card px-4 py-3 opacity-60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-app-text-muted">
                        {signal.suggested_adr_title || t("untitled")}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          signal.status === "formalized"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {signal.status}
                      </span>
                    </div>
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
