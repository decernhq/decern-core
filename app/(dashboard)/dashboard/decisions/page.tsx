import Link from "next/link";
import { getDecisionsWithAuthors, getSuggestedTags } from "@/lib/queries/decisions";
import { getProjects } from "@/lib/queries/projects";
import { Button } from "@/components/ui/button";
import { DecisionsListWithFilters } from "@/components/decisions/decisions-list-with-filters";

export default async function DecisionsPage() {
  const [decisions, projects, availableTags] = await Promise.all([
    getDecisionsWithAuthors(),
    getProjects(),
    getSuggestedTags(),
  ]);

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
        {/* {hasProjects ? (
          <Link href="/dashboard/decisions/new">
            <Button>+ Nuova decisione</Button>
          </Link>
        ) : (
          <Link href="/dashboard/projects/new">
            <Button>+ Crea progetto</Button>
          </Link>
        )} */}
      </div>

      {!hasProjects && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            Per creare decisioni, devi prima creare almeno un progetto.
          </p>
        </div>
      )}

      <DecisionsListWithFilters
        decisions={decisions}
        projects={projects}
        availableTags={availableTags}
        hasProjects={hasProjects}
      />
    </div>
  );
}
