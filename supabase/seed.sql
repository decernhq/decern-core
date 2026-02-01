-- Seed file for development
-- Note: This requires a user to exist first. Run after signing up a test user.

-- To use this seed:
-- 1. Sign up a user in the app
-- 2. Get the user's ID from Supabase dashboard (Authentication > Users)
-- 3. Replace 'YOUR_USER_ID' below with the actual UUID
-- 4. Run this SQL in Supabase SQL Editor

-- Example (uncomment and modify):
/*
-- Insert a sample project
insert into public.projects (id, name, description, owner_id)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Decisio App',
  'Il progetto principale per lo sviluppo di Decisio',
  'YOUR_USER_ID'
);

-- Insert sample decisions
insert into public.decisions (project_id, title, status, context, options, decision, consequences, tags, created_by)
values
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Adottare Next.js come framework frontend',
    'approved',
    'Dobbiamo scegliere un framework per il nuovo progetto SaaS. Il team ha esperienza con React e necessita di SSR per SEO.',
    ARRAY['Next.js - SSR nativo, ottimo ecosistema', 'Remix - nuovo, focus su web standards', 'Create React App - SPA tradizionale'],
    'Adottiamo Next.js 14 con App Router per le sue capacità di SSR, supporto TypeScript nativo e integrazione con Vercel.',
    'Pro: deployment facile su Vercel, ottimo DX. Contro: learning curve per App Router, dipendenza da un vendor.',
    ARRAY['frontend', 'framework', 'react'],
    'YOUR_USER_ID'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Utilizzare Supabase per auth e database',
    'approved',
    'Servono autenticazione utente e un database PostgreSQL. Budget limitato in fase iniziale.',
    ARRAY['Supabase - auth + postgres + realtime', 'Firebase - NoSQL, vendor lock-in', 'Auth0 + PlanetScale - servizi separati'],
    'Usiamo Supabase per la combinazione di auth, database PostgreSQL e tier gratuito generoso.',
    'Pro: setup rapido, RLS per sicurezza. Contro: meno maturo di Firebase, community più piccola.',
    ARRAY['backend', 'database', 'auth'],
    'YOUR_USER_ID'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Struttura delle cartelle per il monorepo',
    'proposed',
    'Con la crescita del progetto, dobbiamo decidere come organizzare il codice per mantenibilità.',
    ARRAY['Feature-based - cartelle per feature', 'Layer-based - cartelle per tipo (components, hooks, etc.)', 'Hybrid - mix dei due approcci'],
    '',
    '',
    ARRAY['architecture', 'organization'],
    'YOUR_USER_ID'
  );
*/
