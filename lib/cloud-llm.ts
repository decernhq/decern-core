/**
 * Cloud LLM – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/cloud-llm.ts.
 */

export async function generateAdrDraft(_opts: {
  signals: Array<{
    description: string;
    suggestedTitle: string;
    filesInvolved: string[];
    prUrl?: string | null;
    prTitle?: string | null;
  }>;
  existingAdrTitles: string[];
  nextAdrNumber: number;
}): Promise<string> {
  throw new Error("Cloud LLM is not available in self-hosted mode. Configure CLOUD_LLM_API_KEY.");
}
