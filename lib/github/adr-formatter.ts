/**
 * ADR Markdown formatter – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/github/adr-formatter.ts.
 */

export interface AdrFields {
  title: string;
  status: string;
  author?: string | null;
  date?: string | null;
  tags: string[];
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  pullRequestUrls: string[];
  externalLinks: { url: string; label?: string }[];
  supersedes: string | null;
}

export function formatAdrMarkdown(_fields: AdrFields): string {
  return "";
}

export function adrFilename(_adrRef: string, _title: string): string {
  return "";
}

export function adrCommitMessageCreate(_adrRef: string, _title: string): string {
  return "";
}

export function adrCommitMessageUpdate(_adrRef: string, _title: string): string {
  return "";
}

export function adrCommitMessageRename(_adrRef: string): string {
  return "";
}

export function adrCommitMessageStatus(_adrRef: string, _status: string): string {
  return "";
}

export function adrCommitMessageDelete(_adrRef: string, _title: string): string {
  return "";
}
