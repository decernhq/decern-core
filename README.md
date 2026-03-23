# decern-core

Open-source Decern application for team decision management: capture architectural decisions, collaborate in workspaces, and enforce decision governance through CI.

## Repository Role

This repository is the `decern-core` app (Next.js + Supabase). In the Decern ecosystem:

- `decern-core` (this repo): app UI, dashboard, auth, projects, decisions, workspace management
- `decern-protocol`: pure stateless logic (ADR parsing/formatting, policy and judge primitives)
- `decern-website`: public marketing and pricing website
- `decern-gate`: CI CLI that checks high-impact changes against approved decisions
- `decern-cloud`: private cloud feature layer (billing, GitHub sync, judge, cloud APIs)

## Tech Stack

- Next.js App Router (TypeScript)
- Supabase (auth + Postgres)
- Tailwind CSS
- Vitest

## What You Get In Core

- User authentication and profile preferences
- Workspaces, members, invites
- Projects and decision CRUD
- Decision lifecycle statuses (`proposed`, `approved`, `superseded`, `rejected`)
- Decision metadata (tags, links, PR references, superseded relationships)
- Internationalization (English and Italian)
- Base API/UI ready to run standalone in OSS mode

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

At minimum, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (for local dev: `http://localhost:3000`)

### 3) Run database migrations

```bash
npx supabase db push
```

### 4) Start the app

```bash
npm run dev
```

## Useful Scripts

- `npm run dev` - start development server
- `npm run build` - run prebuild integration checks then Next.js build
- `npm run test` - run Vitest tests
- `npm run lint` - run linting

## Notes On Cloud Features

Cloud capabilities are integrated via the private `decern-cloud` layer (or `@decernhq/cloud` package), detected during build. Without cloud availability, core still runs and cloud-only routes/features remain inactive.

## License

MIT for core code. Cloud-specific code is proprietary in `decern-cloud`.
