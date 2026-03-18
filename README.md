# Decern

Your team's technical decision register. Document, share and track architectural choices.

**Repository:** [github.com/decernorg/decern](https://github.com/decernorg/decern)

The app is available in **English** (default) and **Italian**. Logged-in users can set their language in **Dashboard → Settings → Language**; the choice is saved to their profile and used on all devices.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth & Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Deployment**: Vercel + Supabase Cloud

## Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, or yarn
- A Supabase account
- A Stripe account (for billing)

### 1. Install dependencies

```bash
npm install
# or
pnpm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API**
3. Copy the **Project URL**, **anon/public key**, and **service_role key**

### 3. Run database migrations

Run all migrations in order using the Supabase CLI (recommended):

```bash
npx supabase db push
```

This applies every file in `supabase/migrations/` (profiles, projects, decisions, subscriptions, workspaces, invites, plans, Decision Gate, Judge, etc.). If you prefer the SQL Editor, run each migration file in numeric order.

### 4. Set up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create two products with monthly prices: **Team** (e.g. €49/month) and **Business** (e.g. €99/month)
3. Copy both Price IDs (they start with `price_`)
4. Set up a webhook endpoint pointing to `/api/stripe/webhook`
5. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 5. Configure environment variables

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_TEAM_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 7. Test Stripe webhooks locally

Use the Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Project Structure

```
decern/
├── app/
│   ├── (public)/              # Public pages
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Login page
│   │   ├── signup/            # Signup page
│   │   ├── pricing/           # Pricing page
│   │   └── invite/[token]/    # Public invite page
│   ├── (dashboard)/           # Protected dashboard
│   │   └── dashboard/
│   │       ├── page.tsx       # Dashboard home
│   │       ├── projects/      # Projects CRUD
│   │       ├── decisions/     # Decisions CRUD
│   │       ├── workspace/     # Workspace list, members, invites, CI token
│   │       ├── invite/[token]/ # Accept invite
│   │       └── settings/      # User settings & billing
│   ├── api/
│   │   ├── stripe/            # Stripe API routes
│   │   │   ├── checkout/      # Create checkout session
│   │   │   ├── portal/        # Customer portal
│   │   │   └── webhook/       # Stripe webhooks
│   │   ├── decisions/         # e.g. generate-from-text
│   │   └── decision-gate/     # validate, judge (CI/CD)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── dashboard/             # Dashboard layout components
│   ├── projects/              # Project-specific components
│   └── decisions/             # Decision-specific components
├── lib/
│   ├── supabase/              # Supabase clients
│   ├── queries/               # Database queries
│   ├── stripe.ts              # Stripe helpers
│   └── utils.ts               # Utility functions
├── types/
│   ├── decision.ts            # Decision types
│   ├── project.ts             # Project types
│   ├── database.ts            # Supabase database types
│   └── billing.ts             # Stripe billing types
├── supabase/
│   ├── migrations/            # SQL migrations
│   └── seed.sql               # Seed data
└── middleware.ts              # Auth middleware
```

## Features

### Implemented

- [x] Landing page with pricing
- [x] User authentication (signup/login/logout)
- [x] Workspaces (default workspace, switcher, multiple on Business+)
- [x] Team collaboration (invite by email, accept invite, members, revoke)
- [x] Protected dashboard layout
- [x] Projects CRUD (per workspace)
- [x] Decisions CRUD (create, read, update, delete)
- [x] Decision status workflow (proposed → approved/rejected/superseded)
- [x] Tags, external links, linked PRs, superseded-by link
- [x] AI generation from free text (with plan limits)
- [x] Export: copy as Markdown, download .md file
- [x] Search and filtering on decisions
- [x] Database schema with RLS policies
- [x] Stripe integration (checkout Team/Business, webhooks, customer portal)
- [x] Subscription management (Free/Team/Business/Enterprise)
- [x] Settings page with billing and language
- [x] Decision Gate API (validate + judge for CI/CD)

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
- **subscriptions**: Stripe subscription data (plan_id: free, team, business, enterprise, governance)

Additional tables support plans/limits, CI token (Decision Gate), workspace policies, Judge usage and billing. All tables have Row Level Security (RLS) enabled. Run `npx supabase db push` to apply the full migration set.

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Supabase

1. Database is already in Supabase Cloud
2. Update `NEXT_PUBLIC_APP_URL` for production

### Stripe

1. Switch to live mode keys for production
2. Update webhook endpoint URL
3. Configure Customer Portal settings

## License

MIT
