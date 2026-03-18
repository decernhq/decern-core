import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getFileContent } from "@/lib/github/client";
import { parseAdrMarkdown } from "@/lib/github/adr-parser";

interface PushCommit {
  added: string[];
  modified: string[];
  removed: string[];
}

interface PushEvent {
  ref: string;
  repository: { full_name: string };
  commits: PushCommit[];
}

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function extractAdrRef(filename: string): string | null {
  const match = filename.match(/^adr\/(ADR-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event !== "push") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payload = JSON.parse(rawBody) as PushEvent;
  const repoFullName = payload.repository.full_name;

  const adrAddedMap: Record<string, boolean> = {};
  const adrModifiedMap: Record<string, boolean> = {};
  const adrRemovedMap: Record<string, boolean> = {};

  for (const commit of payload.commits) {
    for (const f of commit.added) {
      if (f.startsWith("adr/") && f.endsWith(".md") && !f.endsWith("README.md")) {
        adrAddedMap[f] = true;
      }
    }
    for (const f of commit.modified) {
      if (f.startsWith("adr/") && f.endsWith(".md") && !f.endsWith("README.md")) {
        adrModifiedMap[f] = true;
      }
    }
    for (const f of commit.removed) {
      if (f.startsWith("adr/") && f.endsWith(".md") && !f.endsWith("README.md")) {
        adrRemovedMap[f] = true;
      }
    }
  }

  const allChanged = Object.keys({ ...adrAddedMap, ...adrModifiedMap });
  const adrRemoved = Object.keys(adrRemovedMap);
  if (allChanged.length === 0 && adrRemoved.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no adr changes" });
  }

  const supabase = createServiceRoleClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, workspace_id, github_default_branch")
    .eq("github_repo_full_name", repoFullName);

  if (!projects || projects.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no linked project" });
  }

  // Get a GitHub token from any user who has connected GitHub and owns one of these projects
  const projectOwnerIds = await Promise.all(
    projects.map(async (p) => {
      const { data } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", p.id)
        .single();
      return data?.owner_id;
    })
  );

  const ownerIds = Array.from(new Map(
    projectOwnerIds.filter(Boolean).map((id) => [id, id])
  ).values()) as string[];
  let ghToken: string | null = null;
  for (const ownerId of ownerIds) {
    const { data } = await supabase
      .from("github_connections")
      .select("access_token")
      .eq("user_id", ownerId)
      .maybeSingle();
    if (data?.access_token) {
      ghToken = data.access_token;
      break;
    }
  }

  if (!ghToken) {
    return NextResponse.json({ ok: false, error: "No GitHub token available for sync" }, { status: 500 });
  }

  const results: { file: string; action: string; ok: boolean }[] = [];

  // Handle added/modified files
  for (const filePath of allChanged) {
    const adrRef = extractAdrRef(filePath);
    if (!adrRef) continue;

    try {
      const branch = projects[0].github_default_branch || undefined;
      const { content } = await getFileContent(ghToken, repoFullName, filePath, branch);
      const parsed = parseAdrMarkdown(content);

      for (const project of projects) {
        const { data: existing } = await supabase
          .from("decisions")
          .select("id")
          .eq("project_id", project.id)
          .eq("adr_ref", adrRef)
          .maybeSingle();

        const decisionData = {
          title: parsed.title,
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
            project_id: project.id,
            workspace_id: project.workspace_id,
            adr_ref: adrRef,
          });
        }
      }

      results.push({ file: filePath, action: "upsert", ok: true });
    } catch (err) {
      console.error(`Webhook sync error for ${filePath}:`, err);
      results.push({ file: filePath, action: "upsert", ok: false });
    }
  }

  // Handle removed files
  for (const filePath of adrRemoved) {
    const adrRef = extractAdrRef(filePath);
    if (!adrRef) continue;

    try {
      for (const project of projects) {
        await supabase
          .from("decisions")
          .delete()
          .eq("project_id", project.id)
          .eq("adr_ref", adrRef);
      }
      results.push({ file: filePath, action: "delete", ok: true });
    } catch (err) {
      console.error(`Webhook sync error for ${filePath}:`, err);
      results.push({ file: filePath, action: "delete", ok: false });
    }
  }

  return NextResponse.json({ ok: true, synced: results });
}
