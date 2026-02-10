import { getTranslations } from "next-intl/server";
import { getDecisionsWithAuthors, getSuggestedTags } from "@/lib/queries/decisions";
import { getProjects } from "@/lib/queries/projects";
import { DecisionsListWithFilters } from "@/components/decisions/decisions-list-with-filters";

export default async function DecisionsPage() {
  const t = await getTranslations("decisions");
  const [decisions, projects, availableTags] = await Promise.all([
    getDecisionsWithAuthors(),
    getProjects(),
    getSuggestedTags(),
  ]);

  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
        </div>
      </div>

      {!hasProjects && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">{t("createFirstProject")}</p>
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
