"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvitationByToken } from "@/lib/queries/project-members";

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

/** Invite a user to a project by email. Returns the invite link on success. */
export async function inviteUserToProjectAction(
  projectId: string,
  email: string
): Promise<ActionState & { inviteLink?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const emailTrimmed = email?.trim().toLowerCase();
  if (!emailTrimmed) return { error: "Inserisci un indirizzo email" };

  const project = await supabase.from("projects").select("id, owner_id").eq("id", projectId).single();
  if (project.error || !project.data) return { error: "Progetto non trovato" };
  if (project.data.owner_id !== user.id) return { error: "Solo il proprietario può invitare" };

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase.from("project_invitations").insert({
    project_id: projectId,
    email: emailTrimmed,
    invited_by: user.id,
    token,
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "Esiste già un invito in sospeso per questa email" };
    console.error("Error creating invitation:", error);
    return { error: "Errore durante l'invito" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${token}`;
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true, inviteLink };
}

/** Accept an invitation (current user must have the invitation email). */
export async function acceptInvitationAction(token: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi per accettare l'invito" };

  const invite = await getInvitationByToken(token);
  if (!invite) return { error: "Invito non valido o scaduto" };

  const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
  const userEmail = profile.data?.email?.toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return { error: "Questo invito è stato inviato a un altro indirizzo email. Accedi con l'account corretto." };
  }

  const { error: insertError } = await supabase.from("project_members").insert({
    project_id: invite.project_id,
    user_id: user.id,
  });
  if (insertError) {
    if (insertError.code === "23505") return { error: "Sei già membro di questo progetto" };
    console.error("Error joining project:", insertError);
    return { error: "Errore durante l'accettazione" };
  }

  const { error: updateError } = await supabase
    .from("project_invitations")
    .update({ status: "accepted" })
    .eq("id", invite.id);
  if (updateError) console.error("Error updating invitation status:", updateError);

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${invite.project_id}`);
  redirect(`/dashboard/projects/${invite.project_id}`);
}

/** Remove a member from the project (owner only) or leave the project (self). */
export async function removeMemberAction(
  projectId: string,
  userId: string
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const project = await supabase.from("projects").select("owner_id").eq("id", projectId).single();
  if (project.error || !project.data) return { error: "Progetto non trovato" };
  const isOwner = project.data.owner_id === user.id;
  const isSelf = userId === user.id;
  if (!isOwner && !isSelf) return { error: "Non puoi rimuovere questo membro" };

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing member:", error);
    return { error: "Errore durante la rimozione" };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
  if (userId === user.id) {
    redirect("/dashboard/projects");
  }
  return { success: true };
}

/** Revoke a pending invitation. */
export async function revokeInvitationAction(invitationId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const inv = await supabase
    .from("project_invitations")
    .select("project_id")
    .eq("id", invitationId)
    .single();
  if (inv.error || !inv.data) return { error: "Invito non trovato" };

  const project = await supabase.from("projects").select("owner_id").eq("id", inv.data.project_id).single();
  if (project.error || !project.data || project.data.owner_id !== user.id) {
    return { error: "Solo il proprietario può revocare un invito" };
  }

  const { error } = await supabase
    .from("project_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (error) {
    console.error("Error revoking invitation:", error);
    return { error: "Errore durante la revoca" };
  }

  revalidatePath(`/dashboard/projects/${inv.data.project_id}`);
  return { success: true };
}
