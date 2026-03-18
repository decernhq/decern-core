import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "../actions";

export default async function NewProjectPage() {
  const t = await getTranslations("projects");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: ghConn } = await supabase
    .from("github_connections")
    .select("id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t("backToProjects")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{t("newProjectTitle")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {t("newProjectSubtitle")}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ProjectForm
          action={createProjectAction}
          submitLabel={t("createProject")}
          isGithubConnected={!!ghConn}
        />
      </div>
    </div>
  );
}
