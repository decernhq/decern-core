# Decern — User & Integration Guide

The complete guide for PMs, developers, and DevOps engineers using Decern to document, enforce, and automate architectural decisions.

---

## Table of Contents

1. [What is Decern?](#1-what-is-decern)
2. [What are ADRs?](#2-what-are-adrs)
3. [Core Concepts](#3-core-concepts)
4. [Getting Started](#4-getting-started)
5. [Workspaces](#5-workspaces)
6. [Projects](#6-projects)
7. [Decisions (ADRs)](#7-decisions-adrs)
8. [AI-Powered Decision Generation](#8-ai-powered-decision-generation)
9. [Team Collaboration](#9-team-collaboration)
10. [Workspace Policies](#10-workspace-policies)
11. [Decision Gate — CI/CD Integration](#11-decision-gate--cicd-integration)
12. [Setting Up GitHub Actions](#12-setting-up-github-actions)
13. [The Judge — LLM Code Review](#13-the-judge--llm-code-review)
14. [Plans & Billing](#14-plans--billing)
15. [Settings & Profile](#15-settings--profile)
16. [Export & Sharing](#16-export--sharing)
17. [FAQ](#17-faq)

---

## 1. What is Decern?

Decern is a **technical decision register** for engineering teams. It provides a centralized place to document the *why* behind every architectural and technical choice your team makes.

Think of it as a living knowledge base of decisions — organized by project, tracked through a status workflow, enforceable in CI/CD, and searchable by anyone on the team.

**Who is it for?**

- **Developers** who want to understand *why* the codebase is the way it is.
- **Tech leads & architects** who need to document and enforce standards.
- **Engineering managers & PMs** who want visibility into technical choices.
- **DevOps engineers** who want to gate deployments against documented decisions.

**What problems does it solve?**

- "Why did we choose PostgreSQL over MongoDB?" — It's in the decision record.
- "Is this change aligned with our architecture?" — The CI gate checks automatically.
- "What decisions did we make last quarter?" — Filter by date, project, status, or tag.
- "A new team member needs context." — All decisions are documented and searchable.

---

## 2. What are ADRs?

**ADR** stands for **Architecture Decision Record**. It is a lightweight documentation format popularized by Michael Nygard in his blog post ["Documenting Architecture Decisions" (2011)](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions).

An ADR captures a single architectural decision along with its context and consequences. The format is intentionally simple:

| Section | Purpose |
|---------|---------|
| **Title** | A short, descriptive name for the decision. |
| **Status** | Where the decision is in its lifecycle: Proposed, Approved, Rejected, or Superseded. |
| **Context** | The problem, the forces at play, and why a decision is needed. |
| **Options Considered** | The alternatives that were evaluated. |
| **Decision** | What was decided and why. |
| **Consequences** | The positive and negative outcomes of this decision. |

**Why ADRs matter:**

- They capture the *reasoning* behind decisions, not just the outcome.
- They create a searchable audit trail of architectural evolution.
- They prevent "architecture amnesia" — forgetting why things were built a certain way.
- They align distributed teams around shared understanding.

Decern implements the ADR format natively and extends it with tags, external links, linked pull requests, decision superseding, and — uniquely — CI/CD enforcement via the Decision Gate.

### ADR References

Every decision in Decern is automatically assigned an **ADR reference** within its workspace: `ADR-001`, `ADR-002`, `ADR-003`, and so on. This reference is auto-incremented and unique per workspace. You will use these references in commit messages and PR descriptions to link code changes to decisions.

---

## 3. Core Concepts

Before diving into features, here are the key concepts in Decern:

```
Workspace
  └── Project
        └── Decision (ADR)
```

| Concept | Description |
|---------|-------------|
| **Workspace** | The top-level container. A workspace groups projects and members. Each team or organization typically has one workspace (Business plans can have multiple). |
| **Project** | A logical grouping within a workspace (e.g. "Backend API", "Mobile App", "Infrastructure"). Projects organize your decisions. |
| **Decision** | A single ADR record. It belongs to a project and follows the status workflow: Proposed → Approved / Rejected / Superseded. |
| **Decision Gate** | The CI/CD integration layer. It validates that decisions exist and (optionally) uses an LLM to judge whether code changes align with them. |
| **Plan** | Your subscription tier (Free, Team, Business, Enterprise). Plans determine limits and available features. |

---

## 4. Getting Started

### 4.1 Sign Up

1. Go to your Decern instance (e.g. `https://decern.dev`) and click **Sign up**.
2. Enter your **full name**, **role** (e.g. Developer, Tech Lead, Architect), **email**, and **password**.
3. Check your inbox for a **confirmation email** and click the link to verify your account.
4. After confirming, log in with your credentials.

### 4.2 Your First Workspace

On your first login, Decern automatically creates a **default workspace** for you. You'll see a brief "Preparing your workspace" screen, then you're taken to the dashboard.

Your workspace is where all your projects, decisions, and team members live.

### 4.3 Create Your First Project

1. From the **Dashboard**, click **New Project** (or go to **Projects** in the sidebar → **New Project**).
2. Enter a **name** (e.g. "Backend API") and an optional **description**.
3. Click **Create**.

### 4.4 Create Your First Decision

1. Go to **Decisions** in the sidebar → click **New Decision**.
2. You'll see two options:
   - **Generate with AI**: paste free-form text (meeting notes, Slack messages, etc.) and let the AI create a structured ADR for you.
   - **Write manually**: fill in the ADR fields yourself.
3. Fill in the fields:
   - **Project**: select the project this decision belongs to.
   - **Title**: a short, descriptive name (e.g. "Use PostgreSQL for the primary database").
   - **Context**: what problem are you solving?
   - **Options Considered**: what alternatives did you evaluate?
   - **Decision**: what did you decide and why?
   - **Consequences**: what are the trade-offs?
   - **Tags**: add labels for categorization (e.g. `database`, `infrastructure`).
   - **Pull Requests**: link related PRs.
   - **External Links**: link to RFCs, documentation, discussions.
   - **Supersedes**: if this decision replaces a previous one, link it here.
4. The decision is created with status **Proposed**.

### 4.5 Dashboard Overview

Your dashboard shows at a glance:

- **Statistics**: total projects, total decisions, and counts by status (Proposed, Approved, Superseded, Rejected).
- **Quick actions**: New Project, New Decision, View All Decisions.
- **Recent decisions**: the latest decisions with status badges.
- **Projects**: your most recent projects with decision counts.
- **Getting started guide**: if you have no projects yet, a 3-step onboarding guide is shown.

---

## 5. Workspaces

A **workspace** is the highest-level organizational unit in Decern. It contains your projects, decisions, and team members.

### Accessing Workspace Settings

Go to **Workspace** in the sidebar. Here you can:

- View and manage all your workspaces.
- Rename workspaces (owners only).
- Create new workspaces (Business plan and above).
- Manage team members and invitations.
- Generate and manage CI tokens.
- Configure workspace policies.

### Switching Between Workspaces

Use the **workspace dropdown** at the top of the sidebar to switch between workspaces. The selected workspace determines which projects and decisions you see throughout the app.

### Creating Additional Workspaces

- **Free and Team plans**: limited to 1 workspace.
- **Business plan**: unlimited workspaces.
- To create a new workspace, go to **Workspace** and use the creation form (visible only on eligible plans).

### Renaming a Workspace

Only the workspace **owner** can rename it. Click the **Rename** button next to any workspace you own, edit the name inline, and press **Enter** or click **Save**.

---

## 6. Projects

Projects group related decisions within a workspace. For example, you might have projects called "Backend API", "Frontend App", "Infrastructure", and "Mobile".

### Creating a Project

1. Go to **Projects** → **New Project**.
2. Enter a **name** and optional **description**.
3. Click **Create**.

**Limits by plan:**

| Plan | Projects |
|------|----------|
| Free | 1 |
| Team | Unlimited |
| Business | Unlimited |
| Enterprise | Unlimited |

### Viewing a Project

Click on a project card to see its detail page, which shows the project name, description, and a table of all decisions belonging to that project.

### Editing & Deleting a Project

From the project detail page, use the **Edit** or **Delete** buttons. Deleting a project also deletes all its decisions.

---

## 7. Decisions (ADRs)

Decisions are the heart of Decern. Each decision is a structured ADR record.

### Decision Fields

| Field | Description |
|-------|-------------|
| **Title** | Short, descriptive name. |
| **ADR Ref** | Auto-assigned per workspace (`ADR-001`, `ADR-002`, …). Shown in the decision list and used in CI integration. |
| **Status** | `Proposed` → `Approved` / `Rejected` / `Superseded`. |
| **Project** | The project this decision belongs to (required). |
| **Context** | The problem and forces that led to this decision. |
| **Options Considered** | A list of alternatives evaluated. You can add/remove items dynamically. |
| **Decision** | What was decided and why. |
| **Consequences** | Positive and negative trade-offs. |
| **Tags** | Labels for categorization (autocomplete suggests existing tags in your workspace). |
| **Pull Requests** | One or more PR URLs linked to this decision. |
| **External Links** | URLs with optional labels (RFCs, docs, discussions, etc.). |
| **Supersedes** | Link to a previous decision that this one replaces. |

### Status Workflow

```
Proposed ──────▶ Approved
    │
    ├──────────▶ Rejected
    │
    └──────────▶ Superseded (links to the replacing decision)
```

- **Proposed**: the default status for new decisions. It signals "this is under discussion".
- **Approved**: the decision has been accepted and should be followed.
- **Rejected**: the decision was considered but not adopted.
- **Superseded**: the decision has been replaced by a newer one (the `Supersedes` link points to the replacement).

You can change a decision's status from:

- The **decision list** (inline dropdown per row).
- The **decision detail page** (status button).

### Browsing Decisions

Go to **Decisions** in the sidebar. The decisions list supports:

- **Search**: by title or context text.
- **Filter by project**: show only decisions in a specific project.
- **Filter by status**: Proposed, Approved, Rejected, Superseded.
- **Filter by date range**: from/to dates.
- **Filter by tags**: multi-select tag filter.
- **Sorting**: by title, project, author, status, or date (ascending/descending).
- **Pagination**: 24 decisions per page.

Each row shows: ADR ref, title, project, author, status, tags, and date. You can copy the ADR ref to clipboard directly from the list.

### Creating a Decision

1. Click **New Decision** (from the sidebar, the dashboard, or the floating action button).
2. Choose **AI generation** or **manual entry** (see [Section 8](#8-ai-powered-decision-generation)).
3. Fill in the fields and click **Create**.

You can also create a decision pre-scoped to a project by using the "New Decision" button on a project's detail page.

### Editing a Decision

1. Open the decision detail page.
2. Click **Edit**.
3. Modify any field and click **Save**.

### Duplicating a Decision

From the decision list, click the **Duplicate** icon on any row. This opens the "New Decision" form with all fields pre-filled from the original (the title gets a "(copy)" suffix). Useful for creating variations or "superseding" decisions.

### Deleting a Decision

From the decision edit page, click **Delete** and confirm.

### Superseding a Decision

When a decision becomes outdated:

1. Create a new decision (or duplicate the old one).
2. In the new decision, set the **Supersedes** field to the old decision.
3. Set the old decision's status to **Superseded**.

The old decision will show a "Superseded by" link pointing to the new one.

---

## 8. AI-Powered Decision Generation

Decern can automatically generate a structured ADR from free-form text using AI (OpenAI GPT-4o-mini).

### How to Use

1. Go to **Decisions** → **New Decision**.
2. Select **Generate with AI**.
3. Paste your text — this can be meeting notes, a Slack conversation, an email thread, or any unstructured description of a decision.
4. Click **Generate**.
5. The AI extracts: **title**, **context**, **options considered**, **decision**, **consequences**, and **tags**.
6. Review and edit the generated fields in the form.
7. Click **Create** to save.

### Tag Intelligence

- The AI prefers reusing **existing tags** from your workspace for consistency.
- Generic tags (like "technology" or "software") are automatically filtered out.

### Usage Limits

AI generation has monthly limits based on your plan:

| Plan | Generations / month |
|------|---------------------|
| Free | 10 |
| Team | 500 |
| Business | 1,500 |
| Enterprise | Unlimited |

The count resets at the beginning of each calendar month. If you reach the limit, you can still create decisions manually.

---

## 9. Team Collaboration

### Inviting Team Members

1. Go to **Workspace** in the sidebar.
2. In the **Members & Invites** section, enter the team member's email address.
3. Click **Invite**.
4. An **invite link** is generated — copy it and share it with your colleague (via email, Slack, etc.).
5. The invite is valid for **7 days**.

### Accepting an Invite

When someone receives an invite link:

1. If they don't have an account, the link takes them to a page where they can **sign up** or **log in**.
2. After authentication, they're redirected to accept the invitation.
3. If the invite email matches their account email, they join the workspace immediately.

### Managing Members

- The workspace **owner** can see all members and **remove** any member.
- Regular members can only **leave** the workspace (remove themselves).
- The owner can view and **revoke** pending invitations.

### Member Limits

| Plan | Members per workspace |
|------|-----------------------|
| Free | 1 (owner only) |
| Team | 10 |
| Business | 20 |
| Enterprise | Unlimited |

---

## 10. Workspace Policies

Workspace policies control how the **Decision Gate** behaves in your CI/CD pipeline. Only the workspace **owner** can configure policies.

Go to **Workspace** → **Policies** section.

### Available Policies

| Policy | Plans | Default | Description |
|--------|-------|---------|-------------|
| **High Impact** | Team, Business+ | On | When enabled, the Decision Gate runs in **blocking** mode: CI will fail if a high-impact change doesn't reference an approved decision. When disabled, the gate runs in **observation** mode (reports but never blocks). |
| **Require Linked PR** | Business+ only | Off | Requires that the referenced decision has at least one linked pull request. |
| **Require Approved** | Business+ only | On | Requires that the referenced decision has status `Approved` (not just `Proposed`). |
| **Judge Blocking** | Team, Business+ | On | When enabled, the LLM Judge can **block** CI if it determines the code doesn't align with the decision. When disabled, the Judge is **advisory** (reports but never blocks). |
| **Judge Tolerance (%)** | Team, Business+ | 80% | The minimum confidence score (0–100%) the Judge must return for the gate to pass. Lower values are more lenient. Leave empty for the default (80%). |

### How Policies Affect CI

| Plan | High Impact ON | High Impact OFF |
|------|----------------|-----------------|
| **Free** | Always observation (never blocks) | Always observation |
| **Team** | Blocking: decision must be `Approved` | Observation: CI always passes |
| **Business+** | Blocking: applies Require Linked PR + Require Approved policies | Observation: CI always passes |

**Note**: On the Free plan, the gate always runs in observation mode regardless of policy settings. This lets you try the Decision Gate without risk.

---

## 11. Decision Gate — CI/CD Integration

The **Decision Gate** is Decern's CI/CD integration. It ensures that high-impact code changes are backed by documented, approved decisions.

### How It Works

1. A developer opens a pull request that touches high-impact files.
2. The CI pipeline runs `decern-gate` (the CLI tool).
3. The CLI detects which files changed and whether they match **high-impact patterns**.
4. If high-impact files are detected, the CLI looks for a **decision reference** (`ADR-001`, `decern:<uuid>`, etc.) in the PR title, PR body, or commit messages.
5. The CLI calls the Decern **Validate** API to check:
   - Does the decision exist?
   - Is it approved (if required)?
   - Does it have a linked PR (if required)?
6. Optionally, the CLI calls the **Judge** API to have an LLM verify the code diff aligns with the decision.
7. Based on the results and workspace policies, the CI step passes or fails.

### What Are High-Impact Files?

The CLI has built-in patterns to detect files that typically require architectural decisions. These include:

| Category | Example patterns |
|----------|-----------------|
| **Database migrations** | `supabase/migrations/`, `prisma/migrations/`, `alembic/`, `flyway/`, `db/migrations/`, `schema.prisma` |
| **Infrastructure** | `terraform/`, `pulumi/`, `helm/`, `k8s/`, `Dockerfile`, `docker-compose.yml`, `*.tf`, `values.yaml` |
| **CI/CD configs** | `.github/workflows/`, `.circleci/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml` |
| **Security & auth** | `auth/`, `iam/`, `rbac/`, `oauth/`, `security/`, `CODEOWNERS` |
| **API contracts** | `proto/`, `openapi.yaml`, `swagger.yaml`, `schema.graphql` |
| **Dependencies** | `package.json`, `go.mod`, `Cargo.toml`, `requirements.txt`, `pyproject.toml`, `pnpm-lock.yaml` |
| **App config** | `.env`, `.env.*`, `vercel.json`, `next.config.*`, `tsconfig.json` |

You can add **custom patterns** via the `DECERN_GATE_EXTRA_PATTERNS` environment variable (see below).

### Referencing Decisions in Code Changes

To link a code change to a decision, include one of these patterns in your **PR title**, **PR body (description)**, or **commit message**:

| Format | Example | Notes |
|--------|---------|-------|
| `ADR-XXX` | `ADR-001` | Recommended. Matches the ADR ref shown in Decern. |
| `decern:<uuid>` | `decern:550e8400-e29b-41d4-a716-446655440000` | Uses the decision UUID. |
| `DECERN-XXX` | `DECERN-001` | Alternative format. |
| Decision URL | `https://decern.dev/dashboard/decisions/550e8400-...` | A Decern URL containing `/decisions/<uuid>`. |

**Examples:**

```
# In a commit message
git commit -m "feat: migrate users table to new schema

ADR-003"
```

```
# In a PR title
feat: adopt GraphQL for frontend API (ADR-007)
```

```
# In a PR description
This PR implements the caching layer as documented in ADR-012.
Ref: decern:550e8400-e29b-41d4-a716-446655440000
```

### Installing the CLI

```bash
npm install -D decern-gate
```

The CLI is typically installed as a dev dependency in your project.

### Running the Gate

```bash
npx decern-gate
```

The CLI automatically:
1. Determines the diff between base and head commits.
2. Checks files against high-impact patterns.
3. Extracts decision references from PR metadata or commit messages.
4. Calls the Validate API.
5. (If enabled) Calls the Judge API.

### CI Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DECERN_BASE_URL` | **Yes** | Your Decern instance URL (e.g. `https://decern.dev`). No trailing slash. |
| `DECERN_CI_TOKEN` | **Yes** | Workspace CI token (generated from Dashboard → Workspace → CI Token). |
| `CI_BASE_SHA` | No | Base commit SHA (e.g. PR target branch). If not set, the CLI uses `origin/main`. |
| `CI_HEAD_SHA` | No | Head commit SHA. If not set, the CLI uses `HEAD`. |
| `CI_PR_TITLE` | No | PR title — used to extract decision references. |
| `CI_PR_BODY` | No | PR description — used to extract decision references. |
| `CI_COMMIT_MESSAGE` | No | Commit message — used as fallback if PR vars are not set. |
| `DECERN_GATE_EXTRA_PATTERNS` | No | Comma-separated custom high-impact patterns. Paths with `/` use substring match; basenames use exact match. Example: `my-config.yaml,internal/critical/` |
| `DECERN_GATE_TIMEOUT_MS` | No | API timeout in milliseconds (default: 5000). |
| `DECERN_GATE_JUDGE_ENABLED` | No | Set to `true` or `1` to enable the Judge step after validation. |
| `DECERN_JUDGE_LLM_BASE_URL` | No | BYO LLM base URL (e.g. `https://api.openai.com/v1`). |
| `DECERN_JUDGE_LLM_API_KEY` | No | BYO LLM API key. |
| `DECERN_JUDGE_LLM_MODEL` | No | BYO LLM model name (e.g. `gpt-4o-mini`). |

### Generating a CI Token

1. Go to **Workspace** in the sidebar.
2. Find the **CI Token (Decision Gate)** section.
3. Click **Generate**. The token is shown **once** — copy it immediately.
4. Store the token as a secret in your CI system (e.g. GitHub Secrets).
5. Only the workspace **owner** can generate or revoke tokens.

To regenerate: click **Regenerate** (invalidates the old token).
To revoke: click **Revoke** (no token will be active).

---

## 12. Setting Up GitHub Actions

Here is a complete example of integrating Decern Gate into a GitHub Actions workflow.

### Step 1: Add Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `DECERN_BASE_URL` | Your Decern instance URL (e.g. `https://decern.dev`) |
| `DECERN_CI_TOKEN` | The CI token from your workspace |

### Step 2: Create the Workflow

Create `.github/workflows/decern-gate.yml`:

```yaml
name: Decern Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  decision-gate:
    name: Decision Gate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install decern-gate
        run: npm install -g decern-gate

      - name: Run Decision Gate
        env:
          DECERN_BASE_URL: ${{ secrets.DECERN_BASE_URL }}
          DECERN_CI_TOKEN: ${{ secrets.DECERN_CI_TOKEN }}
          CI_BASE_SHA: ${{ github.event.pull_request.base.sha }}
          CI_HEAD_SHA: ${{ github.event.pull_request.head.sha }}
          CI_PR_TITLE: ${{ github.event.pull_request.title }}
          CI_PR_BODY: ${{ github.event.pull_request.body }}
        run: npx decern-gate
```

### Step 3: Workflow with Judge Enabled

To also run the LLM Judge (checks if the code diff aligns with the decision):

```yaml
      - name: Run Decision Gate + Judge
        env:
          DECERN_BASE_URL: ${{ secrets.DECERN_BASE_URL }}
          DECERN_CI_TOKEN: ${{ secrets.DECERN_CI_TOKEN }}
          CI_BASE_SHA: ${{ github.event.pull_request.base.sha }}
          CI_HEAD_SHA: ${{ github.event.pull_request.head.sha }}
          CI_PR_TITLE: ${{ github.event.pull_request.title }}
          CI_PR_BODY: ${{ github.event.pull_request.body }}
          DECERN_GATE_JUDGE_ENABLED: "true"
          # BYO LLM (optional — omit to use Decern's server-side LLM)
          DECERN_JUDGE_LLM_BASE_URL: https://api.openai.com/v1
          DECERN_JUDGE_LLM_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          DECERN_JUDGE_LLM_MODEL: gpt-4o-mini
        run: npx decern-gate
```

### Step 4: Workflow with Custom Patterns

If your project has custom high-impact files:

```yaml
        env:
          # ... other vars ...
          DECERN_GATE_EXTRA_PATTERNS: "config/feature-flags.yaml,internal/billing/"
```

### Step 5: Push-Based Workflows (No PR)

For push-triggered workflows (where PR metadata isn't available), the CLI falls back to reading the **last commit message**. Reference the ADR there:

```yaml
on:
  push:
    branches: [main]

# ... steps ...
      - name: Run Decision Gate
        env:
          DECERN_BASE_URL: ${{ secrets.DECERN_BASE_URL }}
          DECERN_CI_TOKEN: ${{ secrets.DECERN_CI_TOKEN }}
        run: npx decern-gate
```

And in your commit:

```bash
git commit -m "chore: update Terraform provider versions

ADR-015"
```

### How the Gate Decides: Flowchart

```
PR opened / Push to branch
        │
        ▼
  Detect changed files
        │
        ▼
  Any high-impact patterns?
        │
    No ──┼──▶ ✅ Gate: passed (no decision needed)
        │
    Yes ─┤
        │
        ▼
  Extract ADR ref from PR title / body / commit
        │
    Not found ──▶ ❌ Gate: blocked (decision required but not referenced)
        │
    Found ──┤
        │
        ▼
  Call Validate API
        │
    ├── 401 → ❌ Invalid token
    ├── 404 → ❌ Decision not found
    ├── 422 (not_approved) → ❌ Decision not approved
    ├── 422 (linked_pr_required) → ❌ No linked PR
    ├── 200 (observation: true) → ✅ Passed (observation mode)
    └── 200 (observation: false) → decision valid in blocking mode
        │
        ▼
  Judge enabled?
        │
    No ──┼──▶ ✅ Gate: passed
        │
    Yes ─┤
        │
        ▼
  Call Judge API with diff
        │
    ├── allowed: true → ✅ Gate: passed
    ├── allowed: false + advisory: true → ✅ Passed with warning
    └── allowed: false + advisory: false → ❌ Gate: blocked by judge
```

---

## 13. The Judge — LLM Code Review

The **Judge** is an optional second step after validation. It uses a Large Language Model (LLM) to evaluate whether your code changes actually align with the referenced decision.

### How It Works

1. The CLI collects the git diff (`git diff base...head`), excluding binaries, images, and files larger than 1 MB.
2. The diff (capped at 2 MB) is sent to `POST /api/decision-gate/judge` along with the decision reference.
3. The Decern server loads the full decision content (title, context, options, decision, consequences).
4. It builds a prompt: "Given this decision, does this code diff align with it?"
5. The LLM responds with a **score** (0–100%), a **reason**, and optional **advisory notes**.
6. The score is compared to the **threshold** (default 80%, configurable via workspace policies).
7. The result is returned: `allowed: true/false`, `confidence`, `advisory`.

### BYO LLM (Bring Your Own)

You can configure the CLI to use your own LLM provider. This means the LLM call is made directly from the Decern server to your provider — Decern never stores your API key.

**Supported providers:**

| Provider | How to configure |
|----------|-----------------|
| **OpenAI** | `DECERN_JUDGE_LLM_BASE_URL=https://api.openai.com/v1` |
| **Anthropic** | `DECERN_JUDGE_LLM_BASE_URL=https://api.anthropic.com` (native Messages API) |
| **Together AI** | `DECERN_JUDGE_LLM_BASE_URL=https://api.together.xyz/v1` |
| **OpenRouter** | `DECERN_JUDGE_LLM_BASE_URL=https://openrouter.ai/api/v1` |
| **Any OpenAI-compatible** | Set `DECERN_JUDGE_LLM_BASE_URL` to the provider's base URL |

Set these env vars in CI:

```bash
DECERN_JUDGE_LLM_BASE_URL=https://api.openai.com/v1
DECERN_JUDGE_LLM_API_KEY=sk-...
DECERN_JUDGE_LLM_MODEL=gpt-4o-mini
```

### Server Fallback (Fair-Use)

If you don't configure a BYO LLM, the Decern server can use its own OpenAI key as a fair-use fallback. Team and Business plans are subject to a monthly fair-use cap; when the cap is reached, the Judge response becomes advisory (`allowed: false, advisory: true`) and the LLM is not called.

### Judge Per Plan

| Plan | Judge behavior |
|------|---------------|
| **Free** | Always **advisory** — the Judge reports results but never blocks CI. |
| **Team** | Can **block** CI when `Judge Blocking` is enabled in workspace policies. |
| **Business+** | Can **block** CI when `Judge Blocking` is enabled. |

### Confidence and Tolerance

The Judge returns a confidence score (0–100%). The workspace **Judge Tolerance (%)** setting determines the pass threshold:

- **Score ≥ threshold** → `allowed: true` (pass).
- **Score < threshold** → `allowed: false` (block or advisory depending on plan/policy).
- Default threshold: **80%**.
- Example: if tolerance is set to 90% and the Judge returns 85%, the gate blocks.

When the score is between the threshold and 100%, the response includes an **advisory message** (e.g. "Error handling could better match the decision.") — the gate passes but shows a warning.

---

## 14. Plans & Billing

### Plan Comparison

| Feature | Free | Team (€49/mo) | Business (€99/mo) | Enterprise |
|---------|------|---------------|-------------------|------------|
| **Workspaces** | 1 | 1 | Unlimited | Unlimited |
| **Projects** | 1 | Unlimited | Unlimited | Unlimited |
| **Members per workspace** | 1 | 10 | 20 | Unlimited |
| **Decisions** | Unlimited | Unlimited | Unlimited | Unlimited |
| **AI generations/month** | 10 | 500 | 1,500 | Unlimited |
| **Decision Gate** | Observation only | Blocking (high impact) | Full policy control | Full |
| **Judge** | Advisory only (BYO) | Can block, server fair-use cap | Can block, server fair-use cap | Can block |
| **Policies** | — | High Impact, Judge | All policies | All policies |

### Upgrading

1. Go to **Settings** → **Subscription** section.
2. Click **Upgrade to Team** or **Upgrade to Business**.
3. You'll be redirected to **Stripe Checkout** to complete payment.
4. After payment, your plan is updated immediately.

You can also upgrade from:
- The **Pricing** page (`/pricing`).
- The **Upgrade** button in the sidebar (visible on Free and Team plans).

### Managing Your Subscription

For paid plans, go to **Settings** → click **Manage Subscription**. This opens the **Stripe Customer Portal** where you can:

- Change your plan (upgrade or downgrade).
- Update your payment method.
- View invoices.
- Cancel your subscription.

### Enterprise

For Enterprise plans, contact `support@decern.dev`. Enterprise includes custom limits, dedicated support, and tailored configurations.

---

## 15. Settings & Profile

Go to **Settings** in the sidebar.

### Account

- **Full Name**: your display name (shown to team members).
- **Role**: your role (Developer, Tech Lead, Architect, Engineering Manager, Product Manager, DevOps, etc.).
- **Language**: English or Italian. The language preference is saved to your profile and used across all devices.
- **Email**: read-only (set during signup).
- **User ID**: your unique identifier (for support purposes).

### Subscription

- **Current plan**: shows your plan name and price.
- **Renewal date**: next billing date (paid plans).
- **Manage Subscription**: opens Stripe Customer Portal (paid plans).
- **Upgrade buttons**: shown for Free and Team plans.
- **Plan features**: a summary of what's included in your plan.

---

## 16. Export & Sharing

### Copy as Markdown

From any decision's detail page, click **Copy as Markdown**. The full ADR is copied to your clipboard in Markdown format, ready to paste into a wiki, README, or document.

The Markdown includes: title, status, project, context, options, decision, consequences, external links, PRs, tags, and dates.

### Download as .md File

From the decision detail page, click **Download .md**. A Markdown file is downloaded with a filename derived from the decision title (e.g. `use-postgresql-for-primary-database.md`).

### Copy ADR Reference

From the decisions list, click the copy icon next to any ADR ref (`ADR-001`). The reference is copied to your clipboard — useful for pasting into commit messages or PR descriptions.

---

## 17. FAQ

**Q: Do I need a paid plan to use the Decision Gate?**
A: No. The Free plan includes the Decision Gate in observation mode — it reports results but never blocks your CI. This lets you try it risk-free and see how it works with your workflow. Upgrade to Team or Business to enable blocking mode.

**Q: What happens if I don't reference a decision in my PR?**
A: If the changed files match high-impact patterns and no decision reference is found, the gate will block (on paid plans with blocking enabled) or warn (on Free/observation mode).

**Q: Can I use the Decision Gate without the Judge?**
A: Yes. The Judge is optional and disabled by default. Set `DECERN_GATE_JUDGE_ENABLED=true` in your CI to enable it. Without the Judge, only the Validate step runs (checks decision existence and status).

**Q: What LLM providers work with the Judge?**
A: Any OpenAI-compatible API (OpenAI, Together AI, OpenRouter, Groq, etc.) and Anthropic (native Messages API). Set the `DECERN_JUDGE_LLM_BASE_URL` to your provider's base URL.

**Q: What happens if the LLM is down or times out?**
A: The Judge uses a **fail-closed** approach: if the LLM call fails, the response is `allowed: false`. On advisory mode (Free plan or Judge Blocking off), this won't block your CI. On blocking mode, it will fail the gate — this is intentional to prevent unreviewed changes from passing.

**Q: Can I customize which files are considered "high impact"?**
A: Yes. Use `DECERN_GATE_EXTRA_PATTERNS` in your CI environment to add custom patterns. For example: `DECERN_GATE_EXTRA_PATTERNS="config/feature-flags.yaml,internal/billing/"`. Paths with `/` use substring matching; basenames use exact matching.

**Q: How do I reference a decision in a commit message?**
A: Add the ADR reference anywhere in the commit message. The simplest way:

```
feat: implement caching layer

ADR-012
```

Supported formats: `ADR-001`, `decern:<uuid>`, `DECERN-001`, or a full Decern decision URL.

**Q: What is the ADR ref format?**
A: Decern automatically assigns `ADR-001`, `ADR-002`, `ADR-003`, etc. to each decision within a workspace. The number auto-increments. This ref is visible in the decisions list and on the detail page.

**Q: Can I use Decern with GitLab CI, CircleCI, or other CI systems?**
A: Yes. `decern-gate` is a standard npm package that works anywhere Node.js is available. The environment variables (`DECERN_BASE_URL`, `DECERN_CI_TOKEN`, etc.) work the same across all CI systems. Here's a GitLab CI example:

```yaml
decision-gate:
  stage: validate
  image: node:20
  script:
    - npm install -g decern-gate
    - npx decern-gate
  variables:
    DECERN_BASE_URL: $DECERN_BASE_URL
    DECERN_CI_TOKEN: $DECERN_CI_TOKEN
    CI_COMMIT_MESSAGE: $CI_COMMIT_MESSAGE
```

**Q: What if my team is on the Free plan and I want to test everything?**
A: The Free plan includes: 1 workspace, 1 project, unlimited decisions, 10 AI generations/month, observation-mode Decision Gate, and advisory-mode Judge (BYO LLM). This is enough to fully evaluate the product before upgrading.

**Q: Where can I find the decision UUID?**
A: Open any decision in Decern. The UUID is in the browser URL: `/dashboard/decisions/<uuid>`. You can also use the ADR ref (e.g. `ADR-001`) instead of the UUID in all CI integrations.
