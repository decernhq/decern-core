import { listAdrFiles, getFileContent } from "@/lib/github/client";
import { parseAdrMarkdown } from "@/lib/github/adr-parser";
import { createClient } from "@/lib/supabase/server";

/**
 * Initial sync: import all existing ADR files from a GitHub repo into the Supabase cache.
 * Called when a project is first linked to a repo (or on re-sync).
 */
export async function syncAdrFromRepo(
  token: string,
  repoFullName: string,
  branch: string | undefined,
  projectId: string,
  workspaceId: string
): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient();
  const errors: string[] = [];
  let imported = 0;

  const files = await listAdrFiles(token, repoFullName, branch);
  if (files.length === 0) return { imported: 0, errors: [] };

  for (const file of files) {
    const adrRefMatch = file.name.match(/^(ADR-\d+)/i);
    if (!adrRefMatch) continue;
    const adrRef = adrRefMatch[1].toUpperCase();

    try {
      const { content } = await getFileContent(token, repoFullName, file.path, branch);
      const parsed = parseAdrMarkdown(content);

      const { data: existing } = await supabase
        .from("decisions")
        .select("id")
        .eq("project_id", projectId)
        .eq("adr_ref", adrRef)
        .maybeSingle();

      const decisionData = {
        title: parsed.title || file.name.replace(/\.md$/, ""),
        status: parsed.status as "proposed" | "approved" | "superseded" | "rejected",
        context: parsed.context,
        options: parsed.options,
        decision: parsed.decision,
        consequences: parsed.consequences,
        tags: parsed.tags,
        external_links: parsed.externalLinks,
        pull_request_urls: parsed.pullRequestUrls,
      };

      if (existing) {
        await supabase
          .from("decisions")
          .update(decisionData)
          .eq("id", existing.id);
      } else {
        await supabase.from("decisions").insert({
          ...decisionData,
          project_id: projectId,
          workspace_id: workspaceId,
          adr_ref: adrRef,
        });
      }

      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${file.name}: ${msg}`);
    }
  }

  return { imported, errors };
}
