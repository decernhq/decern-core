# Decern

Architecture governance for AI-assisted teams. Decern reads your Architecture Decision Records (ADRs), evaluates every pull request against them with your LLM, and blocks what doesn't fit. New patterns get flagged as signals for the tech lead to formalize.

## How it works

1. **Bootstrap**: `decern init` analyzes your codebase and proposes 15-25 ADR drafts. You review, approve, and commit them to `/docs/adr/`.
2. **CI gate**: `decern gate` runs on every PR. Each ADR is evaluated against the diff using your BYO LLM. Violations on blocking ADRs fail the build. Confidence scores prevent false positives.
3. **Signal detection**: Every PR is scanned for new architectural patterns not covered by any ADR. The tech lead sees them in the dashboard and can generate a draft ADR with one click.
4. **Dashboard lifecycle**: Approve, promote to blocking, supersede, or dismiss ADRs from the dashboard. Every change creates a PR on your repo. The human always has the last word.

ADRs in the repo are the source of truth. The dashboard is the control plane. The gate is the enforcement.

## Repository structure

| Package | Path | Description |
|---|---|---|
| **decern-core** | this repo | Next.js app: dashboard, workspace management, API |
| **decern-gate** | `gate/` | CI CLI: `decern gate`, `decern init`, `decern adr sync` |
| **@decern/protocol** | `protocol/` | Shared library: ADR parsing, evidence chain, scope matching |
| **@decernhq/cloud** | `cloud/` | Private cloud layer: GitHub integration, LLM draft generation, billing |
| **decern-website** | `website/` | Marketing site: landing, pricing, terms |
| **decern-gate-demo** | `decern-gate-demo/` | QA test suite (159 end-to-end tests) |

## Tech stack

- Next.js 14 App Router (TypeScript)
- Supabase (auth + PostgreSQL + RLS)
- Tailwind CSS
- Vitest
- BYO LLM (OpenAI, Anthropic, or any OpenAI-compatible endpoint)

## Dashboard

- **ADRs**: View, search, filter by repo. Detail drawer with full ADR body. Lifecycle actions (approve, promote, supersede) create PRs. Sync from GitHub.
- **Signals**: New architectural decisions detected in PRs. Group by repo. Generate draft ADR (Enterprise, cloud LLM). Create PR or copy markdown.
- **Gate Runs**: Evidence records from CI. Verdict, confidence, ADRs evaluated, files changed, author.
- **Workspace**: CI token, evidence retention policy, members.

## Evidence chain

Every gate run produces a hash-chained, Ed25519-signed evidence record:
- Which ADRs were evaluated, each verdict with confidence score
- Diff hash and files touched
- Author identity from CI metadata
- Exportable bundle with records, access logs, public keys
- Cryptographically verifiable offline

## Plans

| | Free | Enterprise |
|---|---|---|
| Workspaces | 1 | Unlimited |
| Developers | 3 | Unlimited |
| ADRs + gate runs | Unlimited | Unlimited |
| CI blocking | Yes | Yes |
| Signal detection | Yes | Yes |
| Evidence chain | Yes | Yes |
| Draft ADR from signals | No | Cloud LLM |
| Create PR from dashboard | No | GitHub |
| Self-hosted | No | VPC / air-gapped |

## Local development

```bash
npm install
cp .env.example .env
# Set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npx supabase db push
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Prebuild + Next.js build |
| `npm test` | Vitest |
| `npm run qa:all` | Seed + run 159 e2e tests |

## License

MIT for core. Cloud layer is proprietary (`@decernhq/cloud`).
