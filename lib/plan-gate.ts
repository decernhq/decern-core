/**
 * Plan gate – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/plan-gate.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export async function isPaidWorkspace(
  _supabase: SupabaseClient,
  _workspaceId: string,
): Promise<boolean> {
  // Self-hosted: all features unlocked
  return true;
}
