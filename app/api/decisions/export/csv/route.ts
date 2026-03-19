import { NextRequest, NextResponse } from "next/server";
import { getDecisionsWithAuthors } from "@/lib/queries/decisions";
import { getProjects } from "@/lib/queries/projects";

function csvEscape(value: string): string {
  if (value === "") return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() || null;

  const projects = await getProjects();
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  let decisions = await getDecisionsWithAuthors();
  if (projectId) {
    if (!projectNames.has(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    decisions = decisions.filter((d) => d.project_id === projectId);
  }

  const headers = [
    "ADR",
    "Title",
    "Status",
    "Project",
    "Author",
    "Created",
    "Context",
    "Decision",
    "Consequences",
    "Tags",
    "External links",
    "PR URLs",
  ];

  const rows = decisions.map((d) => {
    const author = d.author;
    const authorName = author?.full_name ?? author?.email ?? "";
    const projectName = projectNames.get(d.project_id) ?? "";
    return [
      csvEscape(d.adr_ref),
      csvEscape(d.title),
      csvEscape(d.status),
      csvEscape(projectName),
      csvEscape(authorName),
      csvEscape(new Date(d.created_at).toISOString()),
      csvEscape(d.context ?? ""),
      csvEscape(d.decision ?? ""),
      csvEscape(d.consequences ?? ""),
      csvEscape(Array.isArray(d.tags) ? d.tags.join("; ") : ""),
      csvEscape(
        Array.isArray(d.external_links)
          ? d.external_links.map((l) => l.url).join("; ")
          : ""
      ),
      csvEscape(Array.isArray(d.pull_request_urls) ? d.pull_request_urls.join("; ") : ""),
    ];
  });

  const headerLine = headers.map(csvEscape).join(",");
  const bodyLines = rows.map((row) => row.join(","));
  const csv = [headerLine, ...bodyLines].join("\r\n");

  const datePart = new Date().toISOString().slice(0, 10);
  const slug =
    projectId && projectNames.get(projectId)
      ? projectNames.get(projectId)!.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 32)
      : "";
  const filename = slug
    ? `decisions-${slug}-${datePart}.csv`
    : `decisions-${datePart}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
