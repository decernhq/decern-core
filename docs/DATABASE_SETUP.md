# Struttura database Supabase – Decern

Guida per creare e capire lo schema del database su Supabase.

---

## Panoramica

```
auth.users (Supabase Auth)
       │
       ▼
   profiles ◄──────────────────┐
       │                      │
       │ owner_id             │ user_id
       ▼                      │
   projects                   │
       │                      │
       │ project_id           │
       ▼                      │
   decisions                  │
       │                      │
       └──────────────────────┘
                        subscriptions (Stripe)
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
| created_at  | timestamptz |                               |
| updated_at  | timestamptz |                               |

- **Trigger**: alla creazione di un utente in `auth.users` viene inserita una riga in `profiles` (e poi in `subscriptions`).

---

### 2. `public.projects`

Progetti di proprietà dell’utente. Raggruppano le decisioni.

| Colonna      | Tipo      | Note                          |
|-------------|-----------|-------------------------------|
| id          | uuid (PK)  | gen_random_uuid()             |
| name        | text       | obbligatorio                  |
| description | text       | opzionale                     |
| owner_id    | uuid (FK)  | → profiles(id), CASCADE       |
| created_at  | timestamptz |                             |
| updated_at  | timestamptz |                             |

- **RLS**: ogni utente vede/modifica solo i progetti dove `owner_id = auth.uid()`.

---

### 3. `public.decisions`

Decisioni tecniche (ADR) legate a un progetto.

| Colonna      | Tipo           | Note                          |
|-------------|----------------|-------------------------------|
| id          | uuid (PK)      | gen_random_uuid()             |
| project_id  | uuid (FK)      | → projects(id), CASCADE       |
| title       | text           | obbligatorio                  |
| status      | decision_status| proposed \| approved \| superseded \| rejected |
| context     | text           | default ''                    |
| options     | text[]         | default '{}'                  |
| decision    | text           | default ''                    |
| consequences| text           | default ''                    |
| tags        | text[]         | default '{}'                  |
| external_links | jsonb         | default '[]' – array di {url, label?} |
| created_by  | uuid (FK)      | → profiles(id), SET NULL      |
| created_at  | timestamptz    |                               |
| updated_at  | timestamptz    |                               |

- **RLS**: accesso solo alle decisioni i cui progetti hanno `owner_id = auth.uid()`.

---

### 4. `public.subscriptions`

Abbonamento Stripe per utente (free/pro).

| Colonna               | Tipo              | Note                          |
|-----------------------|-------------------|-------------------------------|
| id                    | uuid (PK)          |                               |
| user_id               | uuid (FK, unique)  | → profiles(id), CASCADE       |
| stripe_customer_id     | text (unique)      | opzionale                     |
| stripe_subscription_id | text (unique)      | opzionale                     |
| plan_id               | plan_id           | 'free' \| 'pro'               |
| status                | subscription_status| active \| canceled \| past_due \| trialing |
| current_period_end     | timestamptz       | opzionale                     |
| created_at            | timestamptz       |                               |
| updated_at            | timestamptz       |                               |

- **Trigger**: alla creazione di un `profile` viene creata una riga in `subscriptions` (piano free).
- **RLS**: ogni utente vede solo la propria subscription; gli aggiornamenti arrivano dal webhook Stripe (service role).

---

## Come creare il DB su Supabase

### Opzione A: SQL Editor (consigliata)

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard) → il tuo progetto.
2. **SQL Editor** → **New query**.
3. Esegui **in ordine** i contenuti di questi file (copia/incolla):
   - `supabase/migrations/00001_create_profiles.sql`
   - `supabase/migrations/00002_create_projects.sql`
   - `supabase/migrations/00003_create_decisions.sql`
   - `supabase/migrations/00004_create_subscriptions.sql`
4. Clicca **Run** per ogni script.

L’ordine è importante: `profiles` prima (e usa `auth.users`), poi `projects`, poi `decisions`, infine `subscriptions` (che ha il trigger su `profiles`).

---

### Opzione B: Supabase CLI

Se hai già configurato il progetto con `supabase link`:

```bash
# Dalla root del repo
npx supabase db push
```

In alternativa, dalla cartella del progetto:

```bash
supabase db push
```

Questo applica le migration nella cartella `supabase/migrations/` nell’ordine dei nomi file.

---

## Dopo la creazione

1. **Auth**: in **Authentication → Providers** abilita Email (e eventualmente OAuth).
2. **RLS**: è già abilitato su tutte le tabelle `public` con le policy descritte sopra.
3. **Utenti esistenti**: se avevi già utenti prima delle migration, non avranno righe in `profiles`/`subscriptions`. In quel caso puoi popolare a mano o con uno script che fa `INSERT` in `profiles` (e poi il trigger creerà `subscriptions` se l’hai eseguito dopo le migration).

---

## Riepilogo file migration

| File | Contenuto |
|------|-----------|
| `00001_create_profiles.sql` | Tabella `profiles`, trigger su `auth.users`, funzione `update_updated_at_column` |
| `00002_create_projects.sql` | Tabella `projects`, RLS, trigger `updated_at` |
| `00003_create_decisions.sql` | Enum `decision_status`, tabella `decisions`, RLS, trigger, indici |
| `00004_create_subscriptions.sql` | Enum `subscription_status` e `plan_id`, tabella `subscriptions`, trigger su `profiles` |

Se segui l’ordine sopra (A o B), il DB sarà strutturato come previsto da Decern.
