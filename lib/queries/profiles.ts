import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}
