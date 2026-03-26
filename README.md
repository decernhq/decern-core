# decern-core

Open-source Decern application for team decision management: capture architectural decisions, collaborate in workspaces, and enforce decision governance through CI.

## Repository Role

This repository is the `decern-core` app (Next.js + Supabase). In the Decern ecosystem:

- `decern-core` (this repo): authenticated app, dashboard, workspace/project/decision management
- `decern-protocol`: stateless shared logic (ADR parsing/formatting, policy and judge helpers)
- `decern-gate`: CI CLI that enforces decision governance on high-impact changes
- `decern-website`: public marketing and pricing website
- `decern-cloud`: private cloud feature layer (billing, GitHub sync, judge, cloud APIs)

## Architecture And Linked Repositories

This repo can run in OSS-only mode, or with optional linked repositories:

- `protocol/` (optional local clone, otherwise `@decern/protocol` from npm)
- `cloud/` (optional private local clone, otherwise `@decernhq/cloud` package)
- `gate/` and `website/` as separate side-by-side repositories for CLI and marketing site development

On build (`npm run build`), `scripts/vercel-prebuild.mjs` handles integration:

- uses local `protocol/` only if present, otherwise relies on `@decern/protocol` from npm
- enables cloud from local `cloud/` first, then `node_modules/@decernhq/cloud`
- generates `app/api/*` cloud proxy route files (re-export files, not symlinks)
- disables cloud in self-hosted mode when `NEXT_PUBLIC_SELF_HOSTED=true` and `DECERN_LICENSE_KEY` is missing

## Tech Stack

- Next.js App Router (TypeScript)
- Supabase (auth + Postgres)
- Tailwind CSS
- Vitest

## What You Get In Core

- User authentication and profile preferences
- Workspaces, members, and invites
- Projects and decision CRUD
- Decision lifecycle statuses (`proposed`, `approved`, `superseded`, `rejected`)
- Decision metadata (tags, links, PR references, superseded relationships)
- Internationalization (English and Italian)
- Base API/UI ready to run standalone in OSS mode

## Local Development

1) Install dependencies:

```bash
npm install
```

2) Configure environment:

```bash
cp .env.example .env
```

At minimum, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (local: `http://localhost:3000`)

3) Run database migrations:

```bash
npx supabase db push
```

4) Start the app:

```bash
npm run dev
```

## Useful Scripts

- `npm run dev` - start development server
- `npm run build` - run prebuild integration checks, then Next.js build
- `npm run test` - run Vitest tests
- `npm run lint` - run linting
- `npm run qa:seed` - seed QA prerequisites for gate demo
- `npm run qa:run` - run full QA demo runner
- `npm run qa:governance` - run governance role QA runner
- `npm run qa:all` - seed + full QA run

## Cloud Notes

Cloud capabilities are activated only when a cloud layer is available and allowed by licensing mode. Without cloud availability, core still runs and cloud-only routes/features remain inactive.

## License

MIT for core code. Cloud-specific code is proprietary in `decern-cloud`.
