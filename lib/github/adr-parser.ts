/**
 * Parse a pure-Markdown ADR file into structured decision fields.
 *
 * Expected format:
 *   # Title
 *   **Status:** Approved
 *   **Tags:** tag1, tag2
 *   ## Context
 *   ...
 *   ## Options Considered
 *   - Option 1
 *   - Option 2
 *   ## Decision
 *   ...
 *   ## Consequences
 *   ...
 *   ## Pull Requests
 *   - https://...
 *   ## External Links
 *   - [Label](url)
 *   ## Supersedes
 *   ADR-001
 */

export interface ParsedAdr {
  title: string;
  status: string;
  tags: string[];
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  pullRequestUrls: string[];
  externalLinks: { url: string; label?: string }[];
  supersedes: string | null;
}

export function parseAdrMarkdown(markdown: string): ParsedAdr {
  const lines = markdown.split("\n");

  let title = "";
  let status = "proposed";
  let tags: string[] = [];
  let supersedes: string | null = null;

  const sections: Record<string, string[]> = {};
  let currentSection = "__header";
  sections[currentSection] = [];

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !title) {
      title = h1[1].trim();
      continue;
    }

    const statusMatch = line.match(/^\*\*Status:\*\*\s*(.+)$/i);
    if (statusMatch) {
      status = statusMatch[1].trim().toLowerCase();
      continue;
    }

    const tagsMatch = line.match(/^\*\*Tags:\*\*\s*(.+)$/i);
    if (tagsMatch) {
      tags = tagsMatch[1]
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      currentSection = h2[1].trim().toLowerCase();
      sections[currentSection] = [];
      continue;
    }

    if (sections[currentSection]) {
      sections[currentSection].push(line);
    }
  }

  const getSection = (key: string) =>
    (sections[key] || []).join("\n").trim();

  const getListItems = (key: string): string[] =>
    (sections[key] || [])
      .map((l) => l.replace(/^[-*]\s+/, "").trim())
      .filter(Boolean);

  const pullRequestUrls = getListItems("pull requests").filter((u) =>
    u.startsWith("http")
  );

  const externalLinks: { url: string; label?: string }[] = getListItems(
    "external links"
  ).map((item) => {
    const mdLink = item.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (mdLink) return { url: mdLink[2], label: mdLink[1] };
    if (item.startsWith("http")) return { url: item };
    return { url: item };
  });

  const supersedesRaw = getSection("supersedes");
  if (supersedesRaw) {
    const ref = supersedesRaw.match(/ADR-\d+/i);
    supersedes = ref ? ref[0] : supersedesRaw.trim() || null;
  }

  const options =
    sections["options considered"]
      ? getListItems("options considered")
      : [];

  return {
    title,
    status,
    tags,
    context: getSection("context"),
    options,
    decision: getSection("decision"),
    consequences: getSection("consequences"),
    pullRequestUrls,
    externalLinks,
    supersedes,
  };
}
