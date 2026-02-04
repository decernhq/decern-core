import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/queries/projects";
import { getDecisionsByProject } from "@/lib/queries/decisions";
import { Button } from "@/components/ui/button";
import { DecisionStatus } from "@/types/decision";
import { getDecisionStatusLabel, STATUS_COLORS } from "@/lib/constants/decision-status";
import { cn } from "@/lib/utils";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const [project, decisions] = await Promise.all([
    getProjectById(id),
    getDecisionsByProject(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link
          href="/dashboard/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna ai progetti
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-gray-600">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/projects/${id}/edit`}>
              <Button variant="outline">Modifica</Button>
            </Link>
            <Link href={`/dashboard/decisions/new?project=${id}`}>
              <Button>+ Nuova decisione</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Project stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Totale</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {decisions.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-yellow-600">Proposte</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {decisions.filter((d) => d.status === "proposed").length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-green-600">Approvate</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {decisions.filter((d) => d.status === "approved").length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Altre</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {
              decisions.filter(
                (d) => d.status === "superseded" || d.status === "rejected"
              ).length
            }
          </p>
        </div>
      </div>

      {/* Decisions list */}
      {decisions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Titolo
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
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_COLORS[decision.status]
                      )}
                    >
                      {getDecisionStatusLabel(decision.status)}
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
          <h3 className="text-sm font-medium text-gray-900">
            Nessuna decisione
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Inizia documentando la prima decisione tecnica per questo progetto.
          </p>
          <Link href={`/dashboard/decisions/new?project=${id}`}>
            <Button className="mt-6">Crea decisione</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
