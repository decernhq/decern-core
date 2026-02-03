import { createClient } from "@/lib/supabase/server";
import type { InsertProject, UpdateProject, Project } from "@/types/database";
import { getOrCreateDefaultWorkspace } from "./workspaces";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";

/**
 * Get all projects for the current user in the selected workspace
 */
export async function getProjects(): Promise<Project[]> {
  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a single project by ID
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching project:", error);
    return null;
  }

  return data;
}

/**
 * Create a new project in the selected workspace (or default if none selected)
 */
export async function createProject(
  project: Omit<InsertProject, "owner_id" | "workspace_id">
): Promise<Project | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated");
    return null;
  }

  let workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) {
    const w = await getOrCreateDefaultWorkspace();
    workspaceId = w?.id ?? null;
  }
  if (!workspaceId) return null;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...project,
      owner_id: user.id,
      workspace_id: workspaceId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return null;
  }

  return data;
}

/**
 * Update an existing project
 */
export async function updateProject(
  id: string,
  updates: UpdateProject
): Promise<Project | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating project:", error);
    return null;
  }

  return data;
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("Error deleting project:", error);
    return false;
  }

  return true;
}

/**
 * Get decision counts for multiple projects (for list/cards). Returns map of project_id -> count.
 */
export async function getDecisionCountsByProjectIds(
  projectIds: string[]
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select("project_id")
    .in("project_id", projectIds);

  if (error) {
    console.error("Error fetching decision counts:", error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const id of projectIds) counts[id] = 0;
  for (const row of data || []) {
    counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Get project statistics
 */
export async function getProjectStats(projectId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .select("status")
    .eq("project_id", projectId);

  if (error) {
    console.error("Error fetching project stats:", error);
    return { total: 0, proposed: 0, approved: 0, superseded: 0, rejected: 0 };
  }

  const stats = {
    total: data?.length || 0,
    proposed: data?.filter((d) => d.status === "proposed").length || 0,
    approved: data?.filter((d) => d.status === "approved").length || 0,
    superseded: data?.filter((d) => d.status === "superseded").length || 0,
    rejected: data?.filter((d) => d.status === "rejected").length || 0,
  };

  return stats;
}
