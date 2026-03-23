"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceInvitationByToken } from "@/lib/queries/workspaces";
import { checkCanInviteToWorkspace } from "@/lib/plan-limits";
import { encryptLlmApiKey } from "@/lib/security/llm-credentials";

const LOCALE_COOKIE = "NEXT_LOCALE";
const VALID_LOCALES = ["en", "it"] as const;

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
    return { error: "not_authenticated" };
  }

  const full_name = (formData.get("full_name") as string)?.trim() ?? "";

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: full_name || null })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile name:", error);
    return { error: "name_update_failed" };
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
    return { error: "not_authenticated" };
  }

  const role = (formData.get("role") as string)?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile role:", error);
    return { error: "role_update_failed" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Invite a user to the workspace by email. Returns the invite link. */
export async function inviteUserToWorkspaceAction(
  workspaceId: string,
  email: string
): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const emailTrimmed = email?.trim().toLowerCase();
  if (!emailTrimmed) return { error: "Enter an email address" };

  const ws = await supabase.from("workspaces").select("id, owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return { error: "Workspace not found" };
  if (ws.data.owner_id !== user.id) return { error: "Only the workspace owner can invite members" };

  const canInvite = await checkCanInviteToWorkspace(ws.data.owner_id, workspaceId);
  if (!canInvite.allowed) return { error: canInvite.error };

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
    if (error.code === "23505") return { error: "A pending invitation already exists for this email" };
    console.error("Error creating workspace invitation:", error);
    return { error: "Error sending invitation" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${token}`;
  revalidatePath("/dashboard/settings");
  return { success: true, inviteLink };
}

/** Accept a workspace invitation. */
export async function acceptWorkspaceInvitationAction(token: string): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to accept the invitation" };

  const invite = await getWorkspaceInvitationByToken(token);
  if (!invite) return { error: "Invalid or expired invitation" };

  const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
  const userEmail = profile.data?.email?.toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return { error: "This invitation was sent to a different email address. Sign in with the correct account." };
  }

  const { error: insertError } = await supabase.from("workspace_members").insert({
    workspace_id: invite.workspace_id,
    user_id: user.id,
  });
  if (insertError) {
    if (insertError.code === "23505") return { error: "You are already a member of this workspace" };
    console.error("Error joining workspace:", insertError);
    return { error: "Error accepting invitation" };
  }

  await supabase.from("workspace_invitations").update({ status: "accepted" }).eq("id", invite.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard");
}

/** Remove a member from the workspace (owner only) or leave (self). */
export async function removeWorkspaceMemberAction(
  workspaceId: string,
  userId: string
): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ws = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (ws.error || !ws.data) return { error: "Workspace not found" };
  const isOwner = ws.data.owner_id === user.id;
  const isSelf = userId === user.id;
  if (!isOwner && !isSelf) return { error: "You cannot remove this member" };

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing workspace member:", error);
    return { error: "Error removing member" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  if (userId === user.id) redirect("/dashboard");
  return { success: true };
}

/** Revoke a pending workspace invitation. */
export async function revokeWorkspaceInvitationAction(invitationId: string): Promise<WorkspaceActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const inv = await supabase.from("workspace_invitations").select("workspace_id").eq("id", invitationId).single();
  if (inv.error || !inv.data) return { error: "Invitation not found" };

  const ws = await supabase.from("workspaces").select("owner_id").eq("id", inv.data.workspace_id).single();
  if (ws.error || !ws.data || ws.data.owner_id !== user.id) {
    return { error: "Only the owner can revoke an invitation" };
  }

  const { error } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (error) {
    console.error("Error revoking invitation:", error);
    return { error: "Error revoking invitation" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export type UpdateProfileLocaleState = {
  error?: string;
  success?: boolean;
};

export type UpdateAiGenerationLlmState = {
  error?: string;
  success?: boolean;
};

const AI_LLM_PROVIDERS = ["openai", "anthropic"] as const;
type AiLlmProvider = (typeof AI_LLM_PROVIDERS)[number];

function defaultBaseUrlForProvider(provider: AiLlmProvider): string {
  return provider === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com/v1";
}

function defaultModelForProvider(provider: AiLlmProvider): string {
  return provider === "anthropic" ? "claude-3-5-sonnet-latest" : "gpt-4o-mini";
}

export async function updateAiGenerationLlmSettingsAction(
  _prevState: UpdateAiGenerationLlmState,
  formData: FormData
): Promise<UpdateAiGenerationLlmState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const providerRaw = String(formData.get("provider") ?? "").trim().toLowerCase();
  if (!AI_LLM_PROVIDERS.includes(providerRaw as AiLlmProvider)) {
    return { error: "invalid_llm_provider" };
  }
  const provider = providerRaw as AiLlmProvider;

  const apiKey = String(formData.get("api_key") ?? "").trim();
  if (!apiKey) return { error: "missing_llm_api_key" };

  const baseUrlRaw = String(formData.get("base_url") ?? "").trim();
  const modelRaw = String(formData.get("model") ?? "").trim();
  const baseUrl = baseUrlRaw || defaultBaseUrlForProvider(provider);
  const model = modelRaw || defaultModelForProvider(provider);

  try {
    // Validate URL upfront to avoid persisting broken config.
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { error: "invalid_llm_base_url" };
    }
  } catch {
    return { error: "invalid_llm_base_url" };
  }

  if (model.length > 256) {
    return { error: "invalid_llm_model" };
  }

  let encryptedApiKey: string;
  try {
    encryptedApiKey = encryptLlmApiKey(apiKey);
  } catch (e) {
    console.error("Error encrypting LLM API key:", e);
    return { error: "llm_encryption_failed" };
  }

  const { error } = await supabase.from("user_ai_llm_settings").upsert(
    {
      user_id: user.id,
      provider,
      base_url: baseUrl,
      model,
      encrypted_api_key: encryptedApiKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error updating AI generation LLM settings:", error);
    return { error: "llm_settings_update_failed" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function clearAiGenerationLlmSettingsAction(): Promise<UpdateAiGenerationLlmState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { error } = await supabase
    .from("user_ai_llm_settings")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error clearing AI generation LLM settings:", error);
    return { error: "llm_settings_clear_failed" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateProfileLocaleAction(
  _prevState: UpdateProfileLocaleState,
  formData: FormData
): Promise<UpdateProfileLocaleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const locale = (formData.get("locale") as string)?.trim();
  if (!locale || !VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])) {
    return { error: "Invalid locale" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ locale })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile locale:", error);
    return { error: "Failed to update language" };
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/dashboard/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function disconnectGitHubAction(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("github_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error disconnecting GitHub:", error);
    return { error: "Failed to disconnect GitHub" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
