import { createClient } from "@/lib/supabase/server";
import type { InsertDecision, UpdateDecision, DbDecision } from "@/types/database";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";

/** Decision with author (profile) for list display */
export type DecisionWithAuthor = DbDecision & {
  author: { full_name: string | null; email: string } | null;
};

/**
 * Get project IDs in the selected workspace
 */
async function getProjectIdsInSelectedWorkspace(): Promise<string[]> {
  const workspaceId = await getSelectedWorkspaceId();
  if (!workspaceId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId);
  return (data ?? []).map((p) => p.id);
}

/**
 * Get all decisions for the current user in the selected workspace
 */
export async function getDecisions(): Promise<DbDecision[]> {
  const projectIds = await getProjectIdsInSelectedWorkspace();
  if (projectIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching decisions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all decisions with author (full_name, email) for list/table display (selected workspace)
 */
export async function getDecisionsWithAuthors(): Promise<DecisionWithAuthor[]> {
  const projectIds = await getProjectIdsInSelectedWorkspace();
  if (projectIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select(`
      *,
      author:profiles!decisions_created_by_fkey(full_name, email)
    `)
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching decisions with authors:", error);
    return [];
  }

  return (data || []) as DecisionWithAuthor[];
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
 * Get decision with project info.
 * Linked decision (if any) is fetched separately to avoid self-relation query issues.
 */
export async function getDecisionWithProject(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("decisions")
    .select(`
      *,
      project:projects(id, name),
      author:profiles!decisions_created_by_fkey(full_name, email)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching decision with project:", error);
    return null;
  }

  if (!data) return null;

  // Decisione che questa sostituisce (supersede)
  let linkedDecision: { id: string; title: string } | null = null;
  if (data.linked_decision_id) {
    const { data: linked } = await supabase
      .from("decisions")
      .select("id, title")
      .eq("id", data.linked_decision_id)
      .single();
    if (linked) linkedDecision = linked;
  }

  // Decisioni che sostituiscono questa (hanno linked_decision_id = questa)
  const { data: supersededByList } = await supabase
    .from("decisions")
    .select("id, title")
    .eq("linked_decision_id", id);

  return {
    ...data,
    linked_decision: linkedDecision,
    superseded_by: (supersededByList ?? []) as { id: string; title: string }[],
  };
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
 * Get user's dashboard stats for the selected workspace
 */
export async function getDashboardStats() {
  const projectIds = await getProjectIdsInSelectedWorkspace();
  if (projectIds.length === 0) {
    return {
      totalProjects: 0,
      totalDecisions: 0,
      proposed: 0,
      approved: 0,
      superseded: 0,
      rejected: 0,
    };
  }

  const supabase = await createClient();
  const [projectsResult, decisionsResult] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact" }).in("id", projectIds),
    supabase.from("decisions").select("status").in("project_id", projectIds),
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

/**
 * Get all distinct tags used in the user's decisions in the selected workspace (for autocomplete/suggestions)
 */
export async function getSuggestedTags(): Promise<string[]> {
  const projectIds = await getProjectIdsInSelectedWorkspace();
  if (projectIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select("tags")
    .in("project_id", projectIds);

  if (error) {
    console.error("Error fetching tags:", error);
    return [];
  }

  const allTags = (data || []).flatMap((row) => row.tags ?? []);
  const unique = Array.from(new Set(allTags.map((t) => t.toLowerCase().trim()).filter(Boolean)));
  return unique.sort();
}
