import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getProjects, getDecisionCountsByProjectIds } from "@/lib/queries/projects";
import { getOrCreateDefaultWorkspace } from "@/lib/queries/workspaces";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { getEffectivePlanId } from "@/lib/billing";
import { normalizeWorkspaceDecisionRole, supportsWorkspaceRoles } from "@/lib/workspace-roles";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";

export default async function ProjectsPage() {
  const t = await getTranslations("projects");
  const supabase = await createClient();
  const projects = await getProjects();
  const projectIds = projects.map((p) => p.id);
  const decisionCounts = await getDecisionCountsByProjectIds(projectIds);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canCreateProjects = true;
  let workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) {
    const workspace = await getOrCreateDefaultWorkspace();
    workspaceId = workspace?.id ?? null;
  }

  if (workspaceId && user) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (workspace?.owner_id && workspace.owner_id !== user.id) {
      const [{ data: subscription }, { data: member }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("user_id", workspace.owner_id)
          .maybeSingle(),
        supabase
          .from("workspace_members")
          .select("decision_role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      const rolesEnabled = supportsWorkspaceRoles(getEffectivePlanId(subscription?.plan_id));
      canCreateProjects =
        !rolesEnabled || normalizeWorkspaceDecisionRole(member?.decision_role) !== "viewer";
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
        </div>
        {canCreateProjects && (
          <Link href="/dashboard/projects/new">
            <Button>{t("newProject")}</Button>
          </Link>
        )}
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
          <h3 className="mt-4 text-sm font-medium text-gray-900">{t("noProjects")}</h3>
          <p className="mt-1 text-sm text-gray-500">{t("noProjectsHint")}</p>
          {canCreateProjects && (
            <Link href="/dashboard/projects/new">
              <Button className="mt-6">{t("createProject")}</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
