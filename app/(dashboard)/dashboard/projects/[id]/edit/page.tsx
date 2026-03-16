import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProjectById } from "@/lib/queries/projects";
import { ProjectForm } from "@/components/projects/project-form";
import { updateProjectAction, deleteProjectAction } from "../../actions";
import { DeleteProjectButton } from "./delete-button";

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const [project, t, tc] = await Promise.all([
    getProjectById(id),
    getTranslations("projects"),
    getTranslations("common"),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/projects/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t("backToProject")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {t("editProject")}
        </h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ProjectForm
          project={project}
          action={updateProjectAction}
          submitLabel={t("saveChanges")}
        />
      </div>

      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-medium text-red-800">{tc("dangerZone")}</h3>
        <p className="mt-1 text-sm text-red-600">
          {t("deleteProjectWarning")}
        </p>
        <DeleteProjectButton projectId={id} projectName={project.name} />
      </div>
    </div>
  );
}
