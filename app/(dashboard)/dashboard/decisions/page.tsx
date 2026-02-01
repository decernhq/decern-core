import Link from "next/link";
import { getDecisions } from "@/lib/queries/decisions";
import { getProjects } from "@/lib/queries/projects";
import { Button } from "@/components/ui/button";
import { DecisionStatus } from "@/types/decision";
import { cn } from "@/lib/utils";

const statusColors: Record<DecisionStatus, string> = {
  proposed: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  superseded: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<DecisionStatus, string> = {
  proposed: "Proposta",
  approved: "Approvata",
  superseded: "Superata",
  rejected: "Rifiutata",
};

export default async function DecisionsPage() {
  const [decisions, projects] = await Promise.all([
    getDecisions(),
    getProjects(),
  ]);

  // Create a map of project IDs to names for display
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Decisioni</h1>
          <p className="mt-1 text-sm text-gray-600">
            Tutte le decisioni tecniche documentate
          </p>
        </div>
        {hasProjects ? (
          <Link href="/dashboard/decisions/new">
            <Button>+ Nuova decisione</Button>
          </Link>
        ) : (
          <Link href="/dashboard/projects/new">
            <Button>+ Crea progetto</Button>
          </Link>
        )}
      </div>

      {!hasProjects && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            Per creare decisioni, devi prima creare almeno un progetto.
          </p>
        </div>
      )}

      {decisions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Titolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Progetto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {decisions.map((decision) => (
                <tr key={decision.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/decisions/${decision.id}`}
                      className="font-medium text-gray-900 hover:text-brand-600"
                    >
                      {decision.title}
                    </Link>
                    <div className="mt-1 line-clamp-1 text-sm text-gray-500">
                      {decision.context}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/projects/${decision.project_id}`}
                      className="text-sm text-gray-600 hover:text-brand-600"
                    >
                      {projectMap.get(decision.project_id) || "—"}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        statusColors[decision.status]
                      )}
                    >
                      {statusLabels[decision.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {decision.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(decision.created_at).toLocaleDateString("it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 p-3">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            Nessuna decisione
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasProjects
              ? "Inizia documentando la prima decisione tecnica."
              : "Crea prima un progetto, poi potrai aggiungere decisioni."}
          </p>
          {hasProjects ? (
            <Link href="/dashboard/decisions/new">
              <Button className="mt-6">Crea decisione</Button>
            </Link>
          ) : (
            <Link href="/dashboard/projects/new">
              <Button className="mt-6">Crea progetto</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
