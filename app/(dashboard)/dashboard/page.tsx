import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats, getDecisions } from "@/lib/queries/decisions";
import { getProjects } from "@/lib/queries/projects";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  proposed: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  superseded: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};
const statusLabels: Record<string, string> = {
  proposed: "Proposta",
  approved: "Approvata",
  superseded: "Superata",
  rejected: "Rifiutata",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: { user } }, stats, projects, decisions] = await Promise.all([
    supabase.auth.getUser(),
    getDashboardStats(),
    getProjects(),
    getDecisions(),
  ]);

  let displayName = user?.email ?? "Utente";
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (profile?.full_name?.trim()) displayName = profile.full_name.trim();
  }

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const decisionCountByProject = decisions.reduce<Record<string, number>>(
    (acc, d) => {
      acc[d.project_id] = (acc[d.project_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const recentDecisions = decisions.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Welcome */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Benvenuto in Decern
        </h1>
        <p className="mt-2 text-gray-600">
          Ciao, <span className="font-medium">{displayName}</span>!
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Inizia a documentare le decisioni tecniche del tuo team.
        </p>

        {/* Stats: 6 cards */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Progetti</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalProjects}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Decisioni</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalDecisions}</p>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-yellow-600">Proposte</p>
            <p className="mt-1 text-2xl font-semibold text-yellow-900">{stats.proposed}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-green-600">Approvate</p>
            <p className="mt-1 text-2xl font-semibold text-green-900">{stats.approved}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Superate</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800">{stats.superseded}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-red-600">Rifiutate</p>
            <p className="mt-1 text-2xl font-semibold text-red-900">{stats.rejected}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/projects/new">
            <Button>+ Nuovo progetto</Button>
          </Link>
          {stats.totalProjects > 0 && (
            <Link href="/dashboard/decisions/new">
              <Button variant="outline">+ Nuova decisione</Button>
            </Link>
          )}
          {stats.totalDecisions > 0 && (
            <Link href="/dashboard/decisions">
              <Button variant="ghost">Vedi tutte le decisioni</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Two columns: Recent decisions | Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ultime decisioni */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Ultime decisioni</h2>
            {decisions.length > 0 && (
              <Link
                href="/dashboard/decisions"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Vedi tutte
              </Link>
            )}
          </div>
          {recentDecisions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              Nessuna decisione. Crea un progetto e aggiungi la prima decisione.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentDecisions.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/dashboard/decisions/${d.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 py-2.5 px-3 transition hover:border-gray-200 hover:bg-gray-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                      {d.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        statusColors[d.status]
                      )}
                    >
                      {statusLabels[d.status] ?? d.status}
                    </span>
                  </Link>
                  <p className="mt-0.5 pl-3 text-xs text-gray-500">
                    {projectMap.get(d.project_id) ?? "—"} · {new Date(d.created_at).toLocaleDateString("it-IT")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progetti */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Progetti</h2>
            <Link
              href="/dashboard/projects"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Vedi tutti
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              Nessun progetto. Creane uno per raggruppare le decisioni.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {projects.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 py-2.5 px-3 transition hover:border-gray-200 hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="text-sm text-gray-500">
                      {decisionCountByProject[p.id] ?? 0} decisioni
                    </span>
                  </Link>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 pl-3 text-xs text-gray-500">
                      {p.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Getting started (no projects) */}
      {stats.totalProjects === 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
          <h2 className="text-lg font-semibold text-brand-900">Come iniziare</h2>
          <ol className="mt-4 space-y-3 text-sm text-brand-800">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                1
              </span>
              <span>
                <strong>Crea un progetto</strong> — Raggruppa le decisioni per applicazione o servizio.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                2
              </span>
              <span>
                <strong>Documenta una decisione</strong> — Contesto, opzioni e decisione finale.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                3
              </span>
              <span>
                <strong>Condividi col team</strong> — Il &quot;perché&quot; dietro le scelte tecniche.
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
