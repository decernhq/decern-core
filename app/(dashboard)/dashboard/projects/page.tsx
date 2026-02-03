import Link from "next/link";
import { getProjects, getDecisionCountsByProjectIds } from "@/lib/queries/projects";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const projectIds = projects.map((p) => p.id);
  const decisionCounts = await getDecisionCountsByProjectIds(projectIds);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progetti</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestisci i tuoi progetti e le relative decisioni
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>+ Nuovo progetto</Button>
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              decisionCount={decisionCounts[project.id] ?? 0}
            />
          ))}
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            Nessun progetto
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Inizia creando il tuo primo progetto per organizzare le decisioni.
          </p>
          <Link href="/dashboard/projects/new">
            <Button className="mt-6">Crea progetto</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
