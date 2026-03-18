import fs from "fs";
import path from "path";
import Link from "next/link";

export const metadata = {
  title: "Decern — Developer Documentation",
  description:
    "The complete guide for PMs, developers, and DevOps engineers using Decern.",
};

const SECTIONS = [
  { id: "1-what-is-decern", label: "What is Decern?" },
  { id: "2-what-are-adrs", label: "What are ADRs?" },
  { id: "3-core-concepts", label: "Core Concepts" },
  { id: "4-getting-started", label: "Getting Started" },
  { id: "5-workspaces", label: "Workspaces" },
  { id: "6-projects", label: "Projects" },
  { id: "7-decisions-adrs", label: "Decisions (ADRs)" },
  { id: "8-ai-powered-decision-generation", label: "AI Generation" },
  { id: "9-team-collaboration", label: "Team Collaboration" },
  { id: "10-workspace-policies", label: "Workspace Policies" },
  { id: "11-decision-gate-cicd-integration", label: "Decision Gate (CI/CD)" },
  { id: "12-setting-up-github-actions", label: "GitHub Actions Setup" },
  { id: "13-the-judge-llm-code-review", label: "The Judge (LLM)" },
  { id: "14-plans-billing", label: "Plans & Billing" },
  { id: "15-settings-profile", label: "Settings & Profile" },
  { id: "16-export-sharing", label: "Export & Sharing" },
  { id: "17-faq", label: "FAQ" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface Token {
  type: "heading" | "paragraph" | "code" | "table" | "list" | "hr";
  level?: number;
  text?: string;
  lang?: string;
  rows?: string[][];
  items?: string[];
}

function tokenize(md: string): Token[] {
  const lines = md.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      tokens.push({ type: "code", text: codeLines.join("\n"), lang });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      tokens.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    if (line.startsWith("---") && line.trim().match(/^-{3,}$/)) {
      tokens.push({ type: "hr" });
      i++;
      continue;
    }

    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[\s:-]+\|/)) {
      const headerCells = line
        .split("|")
        .filter(Boolean)
        .map((c) => c.trim());
      i += 2;
      const rows: string[][] = [headerCells];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(
          lines[i]
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim())
        );
        i++;
      }
      tokens.push({ type: "table", rows });
      continue;
    }

    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      tokens.push({ type: "list", items });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("|") &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].match(/^-{3,}$/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      tokens.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return tokens;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[1]}
        </strong>
      );
    } else if (match[2]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-brand-700 dark:bg-gray-800 dark:text-brand-300"
        >
          {match[2]}
        </code>
      );
    } else if (match[3] && match[4]) {
      parts.push(
        <a
          key={match.index}
          href={match[4]}
          className="text-brand-600 underline hover:text-brand-500"
          target={match[4].startsWith("http") ? "_blank" : undefined}
          rel={
            match[4].startsWith("http") ? "noopener noreferrer" : undefined
          }
        >
          {match[3]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function MarkdownRenderer({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((token, idx) => {
        switch (token.type) {
          case "hr":
            return (
              <hr
                key={idx}
                className="my-10 border-t border-app-border"
              />
            );

          case "heading": {
            const id = slugify(token.text ?? "");
            const Tag = `h${token.level}` as keyof JSX.IntrinsicElements;
            const sizes: Record<number, string> = {
              1: "text-3xl font-bold mt-12 mb-4",
              2: "text-2xl font-bold mt-10 mb-3",
              3: "text-xl font-semibold mt-8 mb-2",
              4: "text-lg font-semibold mt-6 mb-2",
              5: "text-base font-semibold mt-4 mb-1",
              6: "text-sm font-semibold mt-4 mb-1",
            };
            return (
              <Tag
                key={idx}
                id={id}
                className={`${sizes[token.level ?? 3]} text-app-text scroll-mt-20`}
              >
                {renderInline(token.text ?? "")}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p
                key={idx}
                className="my-3 leading-7 text-app-text-muted"
              >
                {renderInline(token.text ?? "")}
              </p>
            );

          case "code":
            return (
              <div key={idx} className="my-4">
                {token.lang && (
                  <div className="rounded-t-lg bg-gray-800 px-4 py-1.5 text-xs text-gray-400 font-mono">
                    {token.lang}
                  </div>
                )}
                <pre
                  className={`overflow-x-auto bg-gray-900 p-4 text-sm text-gray-100 font-mono leading-relaxed ${
                    token.lang ? "rounded-b-lg" : "rounded-lg"
                  }`}
                >
                  <code>{token.text}</code>
                </pre>
              </div>
            );

          case "table": {
            const [header, ...body] = token.rows ?? [];
            return (
              <div key={idx} className="my-4 overflow-x-auto">
                <table className="min-w-full text-sm border border-app-border rounded-lg">
                  <thead>
                    <tr className="bg-app-hover">
                      {header?.map((cell, ci) => (
                        <th
                          key={ci}
                          className="border-b border-app-border px-4 py-2 text-left font-semibold text-app-text"
                        >
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {body.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-app-border last:border-0"
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-4 py-2 text-app-text-muted"
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case "list":
            return (
              <ul key={idx} className="my-3 ml-6 list-disc space-y-1">
                {token.items?.map((item, li) => (
                  <li key={li} className="text-app-text-muted leading-7">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );

          default:
            return null;
        }
      })}
    </>
  );
}

export default function DocsPage() {
  const filePath = path.join(process.cwd(), "docs", "DEVELOPER_GUIDE.md");
  const raw = fs.readFileSync(filePath, "utf-8");

  const withoutTitle = raw.replace(/^#\s+.+\n/, "");
  const tokens = tokenize(withoutTitle);

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:flex lg:gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block lg:w-56 shrink-0">
          <nav className="sticky top-20 space-y-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-text-muted">
              On this page
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-hover hover:text-app-text transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <article className="min-w-0 max-w-4xl flex-1">
          <div className="mb-8">
            <Link
              href="/"
              className="text-sm text-brand-600 hover:text-brand-500"
            >
              &larr; Back to home
            </Link>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-app-text">
            User & Integration Guide
          </h1>
          <p className="mt-3 text-lg text-app-text-muted">
            The complete guide for PMs, developers, and DevOps engineers using
            Decern to document, enforce, and automate architectural decisions.
          </p>

          <hr className="my-8 border-t border-app-border" />

          <MarkdownRenderer tokens={tokens} />
        </article>
      </div>
    </main>
  );
}
