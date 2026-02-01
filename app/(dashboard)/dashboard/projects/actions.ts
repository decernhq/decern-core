"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function createProjectAction(
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

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Il nome del progetto è obbligatorio" };
  }

  const { error } = await supabase.from("projects").insert({
    name: name.trim(),
    description: description?.trim() || null,
    owner_id: user.id,
  });

  if (error) {
    console.error("Error creating project:", error);
    return { error: "Errore nella creazione del progetto" };
  }

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

export async function updateProjectAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!id) {
    return { error: "ID progetto mancante" };
  }

  if (!name || name.trim().length === 0) {
    return { error: "Il nome del progetto è obbligatorio" };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating project:", error);
    return { error: "Errore nell'aggiornamento del progetto" };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  return { success: true };
}

export async function deleteProjectAction(id: string): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("Error deleting project:", error);
    return { error: "Errore nell'eliminazione del progetto" };
  }

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}
