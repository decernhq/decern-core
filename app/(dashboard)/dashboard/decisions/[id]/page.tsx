import Link from "next/link";
import { notFound } from "next/navigation";
import { getDecisionWithProject } from "@/lib/queries/decisions";
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

interface DecisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function DecisionPage({ params }: DecisionPageProps) {
  const { id } = await params;
  const decision = await getDecisionWithProject(id);

  if (!decision) {
    notFound();
  }

  const project = decision.project as { id: string; name: string } | null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/decisions"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna alle decisioni
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {decision.title}
              </h1>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusColors[decision.status]
                )}
              >
                {statusLabels[decision.status]}
              </span>
            </div>
            {project && (
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="mt-1 text-sm text-gray-500 hover:text-brand-600"
              >
                Progetto: {project.name}
              </Link>
            )}
          </div>
          <Link href={`/dashboard/decisions/${id}/edit`}>
            <Button variant="outline">Modifica</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Context */}
        {decision.context && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Contesto</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-600">
              {decision.context}
            </p>
          </div>
        )}

        {/* Options */}
        {decision.options.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Opzioni considerate
            </h2>
            <ul className="mt-3 space-y-2">
              {decision.options.map((option, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                  <span className="text-gray-600">{option}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decision */}
        {decision.decision && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <h2 className="text-lg font-semibold text-green-900">Decisione</h2>
            <p className="mt-2 whitespace-pre-wrap text-green-800">
              {decision.decision}
            </p>
          </div>
        )}

        {/* Consequences */}
        {decision.consequences && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Conseguenze</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-600">
              {decision.consequences}
            </p>
          </div>
        )}

        {/* Tags and metadata */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {decision.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {decision.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>
                Creata:{" "}
                {new Date(decision.created_at).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {decision.updated_at !== decision.created_at && (
                <p>
                  Aggiornata:{" "}
                  {new Date(decision.updated_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
