# Struttura database Supabase – Decern

Guida per creare e capire lo schema del database su Supabase.

---

## Panoramica

```
auth.users (Supabase Auth)
       │
       ▼
   profiles ◄─────────────────────────────┐
       │                                 │ user_id
       │ owner_id                        │
       ▼                                 │
   workspaces ◄────────── workspace_members
       │                  workspace_invitations
       │ workspace_id     workspace_policies, workspace_ci_tokens
       ▼
   projects
       │ project_id
       ▼
   decisions
       │
       └─────────────────────────────────┘
                        subscriptions (Stripe: plan_id free | team | business | enterprise | governance)
```

---

## Tabelle e relazioni

### 1. `public.profiles`

Estende gli utenti di Supabase Auth. Una riga per ogni utente che fa signup.

| Colonna      | Tipo      | Note                          |
|-------------|-----------|-------------------------------|
| id          | uuid (PK)  | = `auth.users.id`, CASCADE    |
| email       | text       |                               |
| full_name   | text       | opzionale                     |
| avatar_url  | text       | opzionale                     |
| role        | text       | opzionale (migration 00010)    |
| locale      | text       | default 'en' (migration 00018) |
| created_at  | timestamptz |                               |
| updated_at  | timestamptz |                               |

- **Trigger**: alla creazione di un utente in `auth.users` viene inserita una riga in `profiles` (e poi in `subscriptions`).

---

### 2. `public.workspaces`

Workspace di proprietà di un utente. Contengono progetti e hanno membri/inviti.

| Colonna      | Tipo      | Note                          |
|-------------|-----------|-------------------------------|
| id          | uuid (PK)  | gen_random_uuid()             |
| name        | text       | obbligatorio, default 'Mio workspace' |
| owner_id    | uuid (FK)  | → profiles(id), CASCADE       |
| created_at  | timestamptz |                             |
| updated_at  | timestamptz |                             |

- **RLS**: l’owner vede/gestisce il workspace; i membri (tabella `workspace_members`) possono vedere. Tabelle correlate: `workspace_members`, `workspace_invitations`, `workspace_policies`, `workspace_ci_tokens` (per Decision Gate).

---

### 3. `public.projects`

Progetti appartenenti a un workspace. Raggruppano le decisioni.

| Colonna       | Tipo      | Note                          |
|--------------|-----------|-------------------------------|
| id           | uuid (PK)  | gen_random_uuid()             |
| name         | text       | obbligatorio                  |
| description  | text       | opzionale                     |
| workspace_id | uuid (FK)  | → workspaces(id), CASCADE     |
| owner_id     | uuid (FK)  | → profiles(id), CASCADE (legacy/backfill) |
| created_at   | timestamptz |                             |
| updated_at   | timestamptz |                             |

- **RLS**: accesso ai progetti del workspace se l’utente è owner del workspace o membro (`can_view_workspace_members`).

---

### 4. `public.decisions`

Decisioni tecniche (ADR) legate a un progetto.

| Colonna         | Tipo           | Note                          |
|-----------------|----------------|-------------------------------|
| id              | uuid (PK)      | gen_random_uuid()             |
| project_id      | uuid (FK)      | → projects(id), CASCADE       |
| title           | text           | obbligatorio                  |
| status          | decision_status| proposed \| approved \| superseded \| rejected |
| context         | text           | default ''                    |
| options         | text[]         | default '{}'                  |
| decision        | text           | default ''                    |
| consequences    | text           | default ''                    |
| tags            | text[]         | default '{}'                  |
| external_links  | jsonb          | default '[]' – array di {url, label?} |
| pull_request_urls| text[]         | URL PR associate              |
| linked_decision_id | uuid (FK)   | → decisions(id), relazione “superata da” |
| adr_ref         | text           | riferimento ADR (es. ADR-001) per workspace |
| created_by      | uuid (FK)      | → profiles(id), SET NULL      |
| created_at      | timestamptz    |                               |
| updated_at      | timestamptz    |                               |

- **RLS**: accesso alle decisioni i cui progetti appartengono a un workspace visibile all’utente (`can_view_workspace_members`).

---

### 5. `public.subscriptions`

Abbonamento Stripe per utente.

| Colonna                | Tipo              | Note                          |
|------------------------|-------------------|-------------------------------|
| id                     | uuid (PK)         |                               |
| user_id                | uuid (FK, unique) | → profiles(id), CASCADE       |
| stripe_customer_id      | text (unique)     | opzionale                     |
| stripe_subscription_id  | text (unique)     | opzionale                     |
| plan_id                | plan_id          | 'free' \| 'team' \| 'business' \| 'enterprise' \| 'governance' |
| status                 | subscription_status | active \| canceled \| past_due \| trialing |
| current_period_end      | timestamptz      | opzionale                     |
| created_at             | timestamptz      |                               |
| updated_at             | timestamptz      |                               |

- **Trigger**: alla creazione di un `profile` viene creata una riga in `subscriptions` (piano free).
- **RLS**: ogni utente vede solo la propria subscription; gli aggiornamenti arrivano dal webhook Stripe (service role).

---

## Come creare il DB su Supabase

### Opzione A: Supabase CLI (consigliata)

Dalla root del repo, con il progetto collegato (`supabase link`):

```bash
npx supabase db push
```

Applica tutte le migration in `supabase/migrations/` nell’ordine numerico dei file (profiles, projects, decisions, subscriptions, workspaces e inviti, piani e limiti, Decision Gate, Judge, ecc.).

---

### Opzione B: SQL Editor

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard) → il tuo progetto.
2. **SQL Editor** → **New query**.
3. Esegui **in ordine** ogni file in `supabase/migrations/` (00001, 00002, …). L’ordine è importante per dipendenze e trigger.

---

## Dopo la creazione

1. **Auth**: in **Authentication → Providers** abilita Email (e eventualmente OAuth).
2. **RLS**: è già abilitato su tutte le tabelle `public` con le policy descritte sopra.
3. **Utenti esistenti**: se avevi già utenti prima delle migration, non avranno righe in `profiles`/`subscriptions`. In quel caso puoi popolare a mano o con uno script che fa `INSERT` in `profiles` (e poi il trigger creerà `subscriptions` se l’hai eseguito dopo le migration).

---

## Riepilogo file migration (principali)

| File | Contenuto |
|------|-----------|
| `00001_create_profiles.sql` | Tabella `profiles`, trigger su `auth.users`, `update_updated_at_column` |
| `00002_create_projects.sql` | Tabella `projects`, RLS, trigger `updated_at` |
| `00003_create_decisions.sql` | Enum `decision_status`, tabella `decisions`, RLS, trigger, indici |
| `00004_create_subscriptions.sql` | Enum `subscription_status` e `plan_id`, tabella `subscriptions`, trigger su `profiles` |
| … | Link esterni, PR, decisione collegata, project_members, workspace e inviti, plan_id (team/business/…), limiti, CI token, Judge, policy workspace, ecc. |

Eseguire **tutte** le migration in ordine (ad esempio con `npx supabase db push`) per avere lo schema completo previsto da Decern.
