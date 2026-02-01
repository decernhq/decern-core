import Link from "next/link";
import { redirect } from "next/navigation";
import { getProjects } from "@/lib/queries/projects";
import { DecisionForm } from "@/components/decisions/decision-form";
import { createDecisionAction } from "../actions";

interface NewDecisionPageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function NewDecisionPage({ searchParams }: NewDecisionPageProps) {
  const { project: projectId } = await searchParams;
  const projects = await getProjects();

  // If no projects, redirect to create one
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
          Nuova decisione
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Documenta una nuova decisione tecnica.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <DecisionForm
          projects={projects}
          defaultProjectId={projectId}
          action={createDecisionAction}
          submitLabel="Crea decisione"
        />
      </div>
    </div>
  );
}
