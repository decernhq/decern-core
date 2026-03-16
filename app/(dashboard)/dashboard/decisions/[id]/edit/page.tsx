import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDecisionById, getDecisions, getSuggestedTags } from "@/lib/queries/decisions";
import { getProjects } from "@/lib/queries/projects";
import { DecisionForm } from "@/components/decisions/decision-form";
import { updateDecisionAction, deleteDecisionAction } from "../../actions";
import { DeleteDecisionButton } from "./delete-button";

interface EditDecisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDecisionPage({ params }: EditDecisionPageProps) {
  const { id } = await params;
  const [decision, projects, allDecisions, suggestedTags, t, tc] = await Promise.all([
    getDecisionById(id),
    getProjects(),
    getDecisions(),
    getSuggestedTags(),
    getTranslations("decisions"),
    getTranslations("common"),
  ]);
  const otherDecisions = allDecisions
    .filter((d) => d.id !== id)
    .map((d) => ({ id: d.id, title: d.title, project_id: d.project_id }));

  if (!decision) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/decisions/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t("backToDecision")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {t("editDecision")}
        </h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <DecisionForm
          decision={decision}
          projects={projects}
          otherDecisions={otherDecisions}
          suggestedTags={suggestedTags}
          action={updateDecisionAction}
          submitLabel={t("saveChanges")}
        />
      </div>

      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-medium text-red-800">{tc("dangerZone")}</h3>
        <p className="mt-1 text-sm text-red-600">
          {t("deleteDecisionWarning")}
        </p>
        <DeleteDecisionButton decisionId={id} decisionTitle={decision.title} />
      </div>
    </div>
  );
}
