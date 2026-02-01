import { createClient } from "@/lib/supabase/server";
import type { InsertDecision, UpdateDecision, DbDecision } from "@/types/database";

/**
 * Get all decisions for the current user (across all projects)
 */
export async function getDecisions(): Promise<DbDecision[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching decisions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all decisions for a specific project
 */
export async function getDecisionsByProject(
  projectId: string
): Promise<DbDecision[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching decisions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a single decision by ID
 */
export async function getDecisionById(id: string): Promise<DbDecision | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching decision:", error);
    return null;
  }

  return data;
}

/**
 * Get decision with project info
 */
export async function getDecisionWithProject(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .select(`
      *,
      project:projects(id, name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching decision with project:", error);
    return null;
  }

  return data;
}

/**
 * Create a new decision
 */
export async function createDecision(
  decision: Omit<InsertDecision, "created_by">
): Promise<DbDecision | null> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("User not authenticated");
    return null;
  }

  const { data, error } = await supabase
    .from("decisions")
    .insert({
      ...decision,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating decision:", error);
    return null;
  }

  return data;
}

/**
 * Update an existing decision
 */
export async function updateDecision(
  id: string,
  updates: UpdateDecision
): Promise<DbDecision | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating decision:", error);
    return null;
  }

  return data;
}

/**
 * Delete a decision
 */
export async function deleteDecision(id: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase.from("decisions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting decision:", error);
    return false;
  }

  return true;
}

/**
 * Search decisions by title or tags
 */
export async function searchDecisions(query: string): Promise<DbDecision[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .or(`title.ilike.%${query}%,context.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error searching decisions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get decisions by status
 */
export async function getDecisionsByStatus(
  status: DbDecision["status"]
): Promise<DbDecision[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching decisions by status:", error);
    return [];
  }

  return data || [];
}

/**
 * Get user's dashboard stats
 */
export async function getDashboardStats() {
  const supabase = await createClient();
  
  const [projectsResult, decisionsResult] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact" }),
    supabase.from("decisions").select("status"),
  ]);

  const decisions = decisionsResult.data || [];

  return {
    totalProjects: projectsResult.count || 0,
    totalDecisions: decisions.length,
    proposed: decisions.filter((d) => d.status === "proposed").length,
    approved: decisions.filter((d) => d.status === "approved").length,
    superseded: decisions.filter((d) => d.status === "superseded").length,
    rejected: decisions.filter((d) => d.status === "rejected").length,
  };
}
