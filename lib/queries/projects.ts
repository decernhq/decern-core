import { createClient } from "@/lib/supabase/server";
import type { InsertProject, UpdateProject, Project } from "@/types/database";

/**
 * Get all projects for the current user
 */
export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("projects")
    .select("*")
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
 * Create a new project
 */
export async function createProject(
  project: Omit<InsertProject, "owner_id">
): Promise<Project | null> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("User not authenticated");
    return null;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...project,
      owner_id: user.id,
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
