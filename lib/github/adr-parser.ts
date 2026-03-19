/**
 * ADR Markdown parser – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/github/adr-parser.ts.
 */

export interface ParsedAdr {
  title: string;
  status: string;
  author: string | null;
  date: string | null;
  tags: string[];
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  pullRequestUrls: string[];
  externalLinks: { url: string; label?: string }[];
  supersedes: string | null;
}

export function parseAdrMarkdown(_markdown: string): ParsedAdr {
  return {
    title: "",
    status: "",
    author: null,
    date: null,
    tags: [],
    context: "",
    options: [],
    decision: "",
    consequences: "",
    pullRequestUrls: [],
    externalLinks: [],
    supersedes: null,
  };
}
