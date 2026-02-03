import Link from "next/link";
import { redirect } from "next/navigation";
import { getProjects } from "@/lib/queries/projects";
import { getDecisions, getDecisionById, getSuggestedTags } from "@/lib/queries/decisions";
import { NewDecisionFlow } from "@/components/decisions/new-decision-flow";
import { createDecisionAction } from "../actions";

interface NewDecisionPageProps {
  searchParams: Promise<{ project?: string; duplicate?: string }>;
}

export default async function NewDecisionPage({ searchParams }: NewDecisionPageProps) {
  const { project: projectId, duplicate: duplicateId } = await searchParams;
  const [projects, decisions, suggestedTags, duplicateFrom] = await Promise.all([
    getProjects(),
    getDecisions(),
    getSuggestedTags(),
    duplicateId ? getDecisionById(duplicateId) : Promise.resolve(null),
  ]);
  const otherDecisions = decisions.map((d) => ({
    id: d.id,
    title: d.title,
    project_id: d.project_id,
  }));
  const existingDecisionsForDuplicateCheck = decisions.map((d) => ({
    id: d.id,
    title: d.title,
  }));

  if (projects.length === 0) {
    redirect("/dashboard/projects/new");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/decisions"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna alle decisioni
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {duplicateFrom ? "Nuova decisione (da copia)" : "Nuova decisione"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {duplicateFrom
            ? "Campi precompilati dalla decisione selezionata. Modifica e salva per creare la nuova decisione."
            : "Genera la decisione con l’AI incollando il testo oppure inseriscila manualmente."}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <NewDecisionFlow
          projects={projects}
          otherDecisions={otherDecisions}
          suggestedTags={suggestedTags}
          existingDecisionsForDuplicateCheck={existingDecisionsForDuplicateCheck}
          defaultProjectId={projectId ?? (projects.length === 1 ? projects[0].id : undefined)}
          duplicateFrom={duplicateFrom}
          createDecisionAction={createDecisionAction}
        />
      </div>
    </div>
  );
}
