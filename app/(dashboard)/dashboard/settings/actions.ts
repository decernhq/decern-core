"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileNameState = {
  error?: string;
  success?: boolean;
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
