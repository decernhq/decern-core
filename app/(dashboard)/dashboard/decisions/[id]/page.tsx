import Link from "next/link";
import { notFound } from "next/navigation";
import { getDecisionWithProject } from "@/lib/queries/decisions";
import { Button } from "@/components/ui/button";
import { CopyDecisionMarkdown } from "@/components/decisions/copy-decision-markdown";
import { DecisionDetailStatusSelect } from "@/components/decisions/decision-detail-status-select";
import { DecisionStatus } from "@/types/decision";
import { cn } from "@/lib/utils";
import { getDecisionStatusLabel, STATUS_COLORS } from "@/lib/constants/decision-status";

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
  const linkedDecision = decision.linked_decision as { id: string; title: string } | null;
  const supersededBy = (decision as { superseded_by?: { id: string; title: string }[] }).superseded_by ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/decisions"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna alle decisioni
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          <DecisionDetailStatusSelect
            decisionId={id}
            currentStatus={decision.status as DecisionStatus}
          />
          <CopyDecisionMarkdown
            decision={{
              title: decision.title,
              status: decision.status,
              context: decision.context ?? "",
              options: decision.options ?? [],
              decision: decision.decision ?? "",
              consequences: decision.consequences ?? "",
              external_links: decision.external_links ?? [],
              pull_request_urls: decision.pull_request_urls ?? [],
              tags: decision.tags ?? [],
              created_at: decision.created_at,
              updated_at: decision.updated_at,
              project: project ? { name: project.name } : null,
            }}
          />
          <Link href={`/dashboard/decisions/${id}/edit`}>
            <Button variant="outline">Modifica</Button>
          </Link>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {decision.title}
            </h1>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_COLORS[decision.status as DecisionStatus]
              )}
            >
              {getDecisionStatusLabel(decision.status)}
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
          {linkedDecision && (
            <Link
              href={`/dashboard/decisions/${linkedDecision.id}`}
              className="mt-1 block text-sm text-gray-500 hover:text-brand-600"
            >
              Sostituisce: {linkedDecision.title}
            </Link>
          )}
          {supersededBy.length > 0 && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm font-medium text-red-800">Sostituita da:</p>
              <div className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5 text-sm text-red-700">
                {supersededBy.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/dashboard/decisions/${d.id}`}
                      className="font-medium underline hover:no-underline"
                    >
                      {d.title}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          )}
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
              {decision.options.map((option: string, index: number) => (
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

        {/* Pull Request */}
        {(decision.pull_request_urls?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Pull Request</h2>
            <ul className="mt-3 space-y-2">
              {(decision.pull_request_urls ?? []).map((url: string, index: number) => (
                <li key={index}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={url}
                    className="text-brand-600 hover:underline"
                  >
                    {url.length > 60 ? `${url.slice(0, 57)}…` : url} →
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* External links */}
        {(decision.external_links?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Link esterni</h2>
            <ul className="mt-3 space-y-2">
              {(decision.external_links ?? []).map((link: { url: string; label?: string }, index: number) => (
                <li key={index}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    {link.label || link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags and metadata */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {decision.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {decision.tags.map((tag: string) => (
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
