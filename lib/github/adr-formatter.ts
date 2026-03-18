/**
 * Format structured decision fields into a pure-Markdown ADR file.
 */

export interface AdrFields {
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

export function formatAdrMarkdown(fields: AdrFields): string {
  const lines: string[] = [];

  lines.push(`# ${fields.title}`);
  lines.push("");
  lines.push(`**Status:** ${capitalize(fields.status)}`);
  lines.push("");

  if (fields.tags.length > 0) {
    lines.push(`**Tags:** ${fields.tags.join(", ")}`);
    lines.push("");
  }

  lines.push("## Context");
  lines.push("");
  lines.push(fields.context || "_(no context provided)_");
  lines.push("");

  if (fields.options.length > 0) {
    lines.push("## Options Considered");
    lines.push("");
    for (const opt of fields.options) {
      lines.push(`- ${opt}`);
    }
    lines.push("");
  }

  lines.push("## Decision");
  lines.push("");
  lines.push(fields.decision || "_(no decision provided)_");
  lines.push("");

  lines.push("## Consequences");
  lines.push("");
  lines.push(fields.consequences || "_(no consequences provided)_");
  lines.push("");

  if (fields.pullRequestUrls.length > 0) {
    lines.push("## Pull Requests");
    lines.push("");
    for (const url of fields.pullRequestUrls) {
      lines.push(`- ${url}`);
    }
    lines.push("");
  }

  if (fields.externalLinks.length > 0) {
    lines.push("## External Links");
    lines.push("");
    for (const link of fields.externalLinks) {
      if (link.label) {
        lines.push(`- [${link.label}](${link.url})`);
      } else {
        lines.push(`- ${link.url}`);
      }
    }
    lines.push("");
  }

  if (fields.supersedes) {
    lines.push("## Supersedes");
    lines.push("");
    lines.push(fields.supersedes);
    lines.push("");
  }

  return lines.join("\n");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function adrFilename(adrRef: string, title: string): string {
  return `adr/${adrRef}-${slugify(title)}.md`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
