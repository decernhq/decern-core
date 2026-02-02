"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type DecisionForMarkdown = {
  title: string;
  status: string;
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  external_links?: { url: string; label?: string }[];
  tags: string[];
  created_at: string;
  updated_at: string;
  project?: { name: string } | null;
};

const statusLabels: Record<string, string> = {
  proposed: "Proposta",
  approved: "Approvata",
  superseded: "Superata",
  rejected: "Rifiutata",
};

function decisionToMarkdown(decision: DecisionForMarkdown): string {
  const lines: string[] = [];

  lines.push(`# ${decision.title}`);
  lines.push("");
  lines.push(`**Stato:** ${statusLabels[decision.status] ?? decision.status}`);
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

  const handleCopy = async () => {
    const markdown = decisionToMarkdown(decision);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
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
  );
}
