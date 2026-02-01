"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function createDecisionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non autenticato" };
  }

  const projectId = formData.get("project_id") as string;
  const title = formData.get("title") as string;
  const status = formData.get("status") as string;
  const context = formData.get("context") as string;
  const optionsRaw = formData.get("options") as string;
  const decision = formData.get("decision") as string;
  const consequences = formData.get("consequences") as string;
  const tagsRaw = formData.get("tags") as string;

  if (!projectId) {
    return { error: "Seleziona un progetto" };
  }

  if (!title || title.trim().length === 0) {
    return { error: "Il titolo è obbligatorio" };
  }

  // Parse options (one per line)
  const options = optionsRaw
    ? optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)
    : [];

  // Parse tags (comma-separated)
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    : [];

  const { error } = await supabase.from("decisions").insert({
    project_id: projectId,
    title: title.trim(),
    status: status as "proposed" | "approved" | "superseded" | "rejected",
    context: context?.trim() || "",
    options,
    decision: decision?.trim() || "",
    consequences: consequences?.trim() || "",
    tags,
    created_by: user.id,
  });

  if (error) {
    console.error("Error creating decision:", error);
    return { error: "Errore nella creazione della decisione" };
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect("/dashboard/decisions");
}

export async function updateDecisionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const status = formData.get("status") as string;
  const context = formData.get("context") as string;
  const optionsRaw = formData.get("options") as string;
  const decision = formData.get("decision") as string;
  const consequences = formData.get("consequences") as string;
  const tagsRaw = formData.get("tags") as string;

  if (!id) {
    return { error: "ID decisione mancante" };
  }

  if (!title || title.trim().length === 0) {
    return { error: "Il titolo è obbligatorio" };
  }

  const options = optionsRaw
    ? optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)
    : [];

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    : [];

  const { error } = await supabase
    .from("decisions")
    .update({
      title: title.trim(),
      status: status as "proposed" | "approved" | "superseded" | "rejected",
      context: context?.trim() || "",
      options,
      decision: decision?.trim() || "",
      consequences: consequences?.trim() || "",
      tags,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating decision:", error);
    return { error: "Errore nell'aggiornamento della decisione" };
  }

  revalidatePath("/dashboard/decisions");
  revalidatePath(`/dashboard/decisions/${id}`);
  return { success: true };
}

export async function deleteDecisionAction(id: string): Promise<ActionState> {
  const supabase = await createClient();

  // Get decision to know project_id for revalidation
  const { data: decision } = await supabase
    .from("decisions")
    .select("project_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("decisions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting decision:", error);
    return { error: "Errore nell'eliminazione della decisione" };
  }

  revalidatePath("/dashboard/decisions");
  if (decision?.project_id) {
    revalidatePath(`/dashboard/projects/${decision.project_id}`);
  }
  redirect("/dashboard/decisions");
}
