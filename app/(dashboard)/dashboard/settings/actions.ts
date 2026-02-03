"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceInvitationByToken } from "@/lib/queries/workspaces";

export type UpdateProfileNameState = {
  error?: string;
  success?: boolean;
};

export type WorkspaceActionState = {
  error?: string;
  success?: boolean;
  inviteLink?: string;
};

export async function updateProfileNameAction(
  _prevState: UpdateProfileNameState,
  formData: FormData
): Promise<UpdateProfileNameState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non autenticato" };
  }

  const full_name = (formData.get("full_name") as string)?.trim() ?? "";

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: full_name || null })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile name:", error);
    return { error: "Impossibile aggiornare il nome. Riprova." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export type UpdateProfileRoleState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileRoleAction(
  _prevState: UpdateProfileRoleState,
  formData: FormData
): Promise<UpdateProfileRoleState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non autenticato" };
  }

  const role = (formData.get("role") as string)?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile role:", error);
    return { error: "Impossibile aggiornare il ruolo. Riprova." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Invita un utente al workspace per email. Restituisce il link invito. */
export async function inviteUserToWorkspaceAction(
  workspaceId: string,
  email: string
): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const emailTrimmed = email?.trim().toLowerCase();
  if (!emailTrimmed) return { error: "Inserisci un indirizzo email" };

  const ws = await supabase.from("workspaces").select("id, owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return { error: "Workspace non trovato" };
  if (ws.data.owner_id !== user.id) return { error: "Solo il proprietario del workspace può invitare" };

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: workspaceId,
    email: emailTrimmed,
    invited_by: user.id,
    token,
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "Esiste già un invito in sospeso per questa email" };
    console.error("Error creating workspace invitation:", error);
    return { error: "Errore durante l'invito" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${token}`;
  revalidatePath("/dashboard/settings");
  return { success: true, inviteLink };
}

/** Accetta un invito al workspace. */
export async function acceptWorkspaceInvitationAction(token: string): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi per accettare l'invito" };

  const invite = await getWorkspaceInvitationByToken(token);
  if (!invite) return { error: "Invito non valido o scaduto" };

  const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
  const userEmail = profile.data?.email?.toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return { error: "Questo invito è stato inviato a un altro indirizzo email. Accedi con l'account corretto." };
  }

  const { error: insertError } = await supabase.from("workspace_members").insert({
    workspace_id: invite.workspace_id,
    user_id: user.id,
  });
  if (insertError) {
    if (insertError.code === "23505") return { error: "Sei già membro di questo workspace" };
    console.error("Error joining workspace:", insertError);
    return { error: "Errore durante l'accettazione" };
  }

  await supabase.from("workspace_invitations").update({ status: "accepted" }).eq("id", invite.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard");
}

/** Rimuovi un membro dal workspace (solo owner) o esci (self). */
export async function removeWorkspaceMemberAction(
  workspaceId: string,
  userId: string
): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const ws = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return { error: "Workspace non trovato" };
  const isOwner = ws.data.owner_id === user.id;
  const isSelf = userId === user.id;
  if (!isOwner && !isSelf) return { error: "Non puoi rimuovere questo membro" };

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing workspace member:", error);
    return { error: "Errore durante la rimozione" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  if (userId === user.id) redirect("/dashboard");
  return { success: true };
}

/** Revoca un invito workspace pendente. */
export async function revokeWorkspaceInvitationAction(invitationId: string): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const inv = await supabase.from("workspace_invitations").select("workspace_id").eq("id", invitationId).single();
  if (inv.error || !inv.data) return { error: "Invito non trovato" };

  const ws = await supabase.from("workspaces").select("owner_id").eq("id", inv.data.workspace_id).single();
  if (ws.error || !ws.data || ws.data.owner_id !== user.id) {
    return { error: "Solo il proprietario può revocare un invito" };
  }

  const { error } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (error) {
    console.error("Error revoking invitation:", error);
    return { error: "Errore durante la revoca" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
