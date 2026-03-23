# Decern

Your team's technical decision register. Document, share and track architectural choices.

**Repository:** [github.com/decernorg/decern](https://github.com/decernorg/decern)

The app is available in **English** (default) and **Italian**. Logged-in users can set their language in **Dashboard → Settings → Language**; the choice is saved to their profile and used on all devices.

## Architecture: Open Core

Decern follows an **open-core** model:

| | Public repo | Private repo |
|---|---|---|
| **What** | Core decision register (projects, decisions, workspace, auth, UI) | Cloud features (Stripe, Decision Gate, GitHub integration, metered AI, billing) |
| **Repo** | [decernorg/decern](https://github.com/decernorg/decern) | Team-only access |
| **License** | MIT | Proprietary |

The public repo works **standalone** for self-hosting (OSS mode). Cloud features (billing, CI gate, GitHub sync) are activated when the cloud layer is available (`@decernhq/cloud` package or local `cloud/` for internal development).

Marketing website and pricing are split in a separate repo:
- Website: [decernhq/decern-website](https://github.com/decernhq/decern-website)
- Core app (this repo): product app, auth, dashboard, APIs

In `decern-core`, `/` and `/pricing` redirect to the website using `NEXT_PUBLIC_WEBSITE_URL` (default `https://decern.dev`).

### For team members

For internal development, add the cloud layer from the private repository:

```bash
git clone <PRIVATE_CLOUD_REPO_URL> cloud
bash cloud/setup.sh
```

See `cloud/README.md` for full details.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth & Database**: Supabase (PostgreSQL)
- **Payments**: Stripe (cloud only)
- **Deployment**: Vercel + Supabase Cloud

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- A Supabase account

### 1. Install dependencies

```bash
npm install
# or
bun install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API**
3. Copy the **Project URL**, **anon/public key**, and **service_role key**

### 3. Run database migrations

```bash
npx supabase db push
```

This applies every file in `supabase/migrations/` (profiles, projects, decisions, subscriptions, workspaces, invites, plans, Decision Gate, etc.).

### 4. Configure environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

<details>
<summary><strong>Cloud-only env vars</strong> (team members with cloud/ access)</summary>

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TEAM_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...

# OpenAI (fallback for Judge)
OPENAI_API_KEY=sk-...
```

</details>

### 5. Run the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 6. (Cloud only) Stripe webhooks locally

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Project Structure

```
decern/
├── app/
│   ├── (public)/              # Public pages (landing, login, signup, pricing)
│   ├── (dashboard)/           # Protected dashboard
│   │   └── dashboard/
│   │       ├── page.tsx       # Dashboard home
│   │       ├── projects/      # Projects CRUD
│   │       ├── decisions/     # Decisions CRUD
│   │       ├── workspace/     # Workspace, members, invites
│   │       └── settings/      # User settings
│   ├── api/                   # API routes (cloud routes via symlinks)
│   ├── layout.tsx
│   └── globals.css
├── protocol/                  # 📐 Open source repo (git-ignored)
│   └── src/                   #    Stateless core: ADR, policies, types
├── cloud/                     # ⛅ Private repo (git-ignored)
│   ├── app/api/               #    Stripe, Decision Gate, GitHub, Cron, AI
│   ├── lib/                   #    Cloud lib implementations
│   ├── components/            #    Cloud UI components
│   └── setup.sh               #    Route proxy generator
├── components/
│   ├── ui/                    # Reusable UI primitives
│   ├── dashboard/             # Dashboard layout components
│   ├── projects/              # Project-specific components
│   └── decisions/             # Decision-specific components
├── lib/
│   ├── supabase/              # Supabase clients
│   ├── queries/               # Database queries
│   ├── cloud.ts               # IS_CLOUD feature flag
│   └── utils.ts               # Utility functions
├── types/                     # TypeScript types
├── supabase/
│   ├── migrations/            # SQL migrations
│   └── seed.sql               # Seed data
└── middleware.ts              # Auth middleware
```

## Features

### Core (open source)

- [x] Landing page with pricing overview
- [x] User authentication (signup/login/logout)
- [x] Workspaces (default workspace, switcher)
- [x] Team collaboration (invite by email, accept invite, members, revoke)
- [x] Protected dashboard layout
- [x] Projects CRUD (per workspace)
- [x] Decisions CRUD (create, read, update, delete)
- [x] Decision status workflow (proposed → approved/rejected/superseded)
- [x] Tags, external links, linked PRs, superseded-by link
- [x] Export: copy as Markdown, download .md file
- [x] Search and filtering on decisions
- [x] Database schema with RLS policies
- [x] i18n (English, Italian)

### Cloud (private)

- [x] Stripe integration (checkout Team/Business, webhooks, customer portal)
- [x] Subscription management (Free/Team/Business/Enterprise)
- [x] Decision Gate API (validate + judge for CI/CD)
- [x] GitHub integration (OAuth, repo sync, ADR commit/parse)
- [x] AI generation from free text (metered per plan)
- [x] Workspace policies (high impact, require approved, judge blocking)
- [x] Judge metered billing (usage tracking, Stripe invoicing)

### Planned

- [ ] Decision history/changelog
- [ ] Email notifications
- [ ] Additional API for integrations

## Database Schema

### Main tables

- **profiles**: User profiles (extends auth.users), includes role and locale
- **workspaces**: Owned by a user; contain projects and have members/invites
- **workspace_members**, **workspace_invitations**: Collaboration per workspace
- **projects**: Belong to a workspace (via `workspace_id`)
- **decisions**: Technical decision records (per project)
- **subscriptions**: Stripe subscription data

Additional tables support plans/limits, CI token (Decision Gate), workspace policies, Judge usage and billing. All tables have Row Level Security (RLS) enabled.

## Deployment

### Vercel (produzione con cloud)

Il build esegue automaticamente `scripts/vercel-prebuild.mjs` prima di `next build`.

1. Collega il repo **pubblico** `decernorg/decern` al progetto Vercel.
2. In **Settings → Environment Variables** aggiungi:
   - **`DECERN_PROTOCOL_CLONE_TOKEN`** — Personal Access Token (GitHub) con permesso **Contents: Read** sul repo protocol (fine-grained PAT consigliato).
   - **`DECERN_PROTOCOL_REPO_URL`** — URL HTTPS del repo protocol (es. `https://github.com/your-org/your-protocol-repo.git`).
   - **`DECERN_LICENSE_KEY`** — Licenza Business valida per abilitare il cloud in self-hosted.
   - **`NPM_TOKEN`** — token read-only per installare `@decernhq/cloud` da registry privato (se usato in CI/build).
   - **`DECERN_LLM_CREDENTIALS_ENCRYPTION_KEY`** — chiave base64 (32 byte) usata per cifrare nel DB le API key BYO LLM per la generazione decisioni.
3. Tutte le altre variabili (Supabase, Stripe, GitHub OAuth, ecc.) come in `.env.example`.
4. Deploy: a ogni build Vercel clona `protocol/` (se configurato), genera i proxy API cloud (da `@decernhq/cloud` o `cloud/` locale) e compila l’app.

Senza cloud layer disponibile, il deploy produce solo il **core open source** (nessuna route Stripe / Decision Gate / GitHub in `app/api/`).
Senza `DECERN_PROTOCOL_CLONE_TOKEN` (e senza `protocol/` locale), il layer protocol non viene clonato.

### Supabase

1. Database is in Supabase Cloud
2. Update `NEXT_PUBLIC_APP_URL` for production

### Self-hosted

1. Clone this repo
2. Set up Supabase and env vars
3. `npm run build && npm start`
4. Per modalità OSS: nessuna licenza cloud, feature cloud inattive (stubs/noops)
5. Per Business self-hosted: installa `@decernhq/cloud` + imposta `DECERN_LICENSE_KEY`

## License

MIT (core). Cloud features are proprietary.
