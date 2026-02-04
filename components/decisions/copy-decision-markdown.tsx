"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getDecisionStatusLabel } from "@/lib/constants/decision-status";

type DecisionForMarkdown = {
  title: string;
  status: string;
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  external_links?: { url: string; label?: string }[];
  pull_request_urls?: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  project?: { name: string } | null;
};

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "decisione";
}

function decisionToMarkdown(decision: DecisionForMarkdown): string {
  const lines: string[] = [];

  lines.push(`# ${decision.title}`);
  lines.push("");
  lines.push(`**Stato:** ${getDecisionStatusLabel(decision.status)}`);
  if (decision.project?.name) {
    lines.push(`**Progetto:** ${decision.project.name}`);
  }
  lines.push("");

  if (decision.context) {
    lines.push("## Contesto");
    lines.push("");
    lines.push(decision.context);
    lines.push("");
  }

  if (decision.options?.length) {
    lines.push("## Opzioni considerate");
    lines.push("");
    decision.options.forEach((opt) => lines.push(`- ${opt}`));
    lines.push("");
  }

  if (decision.decision) {
    lines.push("## Decisione");
    lines.push("");
    lines.push(decision.decision);
    lines.push("");
  }

  if (decision.consequences) {
    lines.push("## Conseguenze");
    lines.push("");
    lines.push(decision.consequences);
    lines.push("");
  }

  if (decision.external_links?.length) {
    lines.push("## Link esterni");
    lines.push("");
    decision.external_links.forEach((link) => {
      const text = link.label || link.url;
      lines.push(`- [${text}](${link.url})`);
    });
    lines.push("");
  }

  if (decision.pull_request_urls?.length) {
    lines.push("## Pull Request");
    lines.push("");
    decision.pull_request_urls.forEach((url) => {
      const u = url.trim();
      if (u) lines.push(`- [Apri Pull Request](${u})`);
    });
    lines.push("");
  }

  if (decision.tags?.length) {
    lines.push("## Tags");
    lines.push("");
    lines.push(decision.tags.join(", "));
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  const created = new Date(decision.created_at).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  lines.push(`*Creata: ${created}*`);
  if (decision.updated_at !== decision.created_at) {
    const updated = new Date(decision.updated_at).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    lines.push(`*Aggiornata: ${updated}*`);
  }

  return lines.join("\n");
}

interface CopyDecisionMarkdownProps {
  decision: DecisionForMarkdown;
}

export function CopyDecisionMarkdown({ decision }: CopyDecisionMarkdownProps) {
  const [copied, setCopied] = useState(false);

  const markdown = decisionToMarkdown(decision);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const filename = `${slugify(decision.title)}.md`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleCopy}
        className="h-10 gap-2"
      >
        {copied ? (
          <>
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Copiato!
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l2-2m-2 2l2 2"
              />
            </svg>
            Copia in Markdown
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleDownload}
        className="h-10 gap-2"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Scarica .md
      </Button>
    </div>
  );
}
