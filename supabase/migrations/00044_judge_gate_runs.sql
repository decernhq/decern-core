-- Per-PR Judge gate run history. Written by judge route (service role) on each call.
-- Used by /dashboard/gate-runs to show alignment stats and recent runs.

create table if not exists public.judge_gate_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  decision_id uuid references public.decisions(id) on delete set null,
  decision_adr_ref text,
  decision_title text,
  pr_title text,
  pr_url text,
  base_sha text,
  head_sha text,
  allowed boolean not null,
  advisory boolean not null default false,
  confidence_percent smallint check (confidence_percent is null or (confidence_percent >= 0 and confidence_percent <= 100)),
  reason text,
  advisory_message text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.judge_gate_runs is 'History of Judge gate runs per workspace. One row per /api/decision-gate/judge call. Used by dashboard analytics.';
comment on column public.judge_gate_runs.decision_title is 'Snapshot of decision title at run time, kept even if decision is renamed/deleted.';
comment on column public.judge_gate_runs.advisory is 'True when run was advisory (Free plan or judge_blocking off): not blocking, recorded for visibility.';
comment on column public.judge_gate_runs.confidence_percent is 'Judge confidence 0-100 (null when judge did not return a score).';

create index if not exists judge_gate_runs_workspace_created_idx
  on public.judge_gate_runs (workspace_id, created_at desc);

alter table public.judge_gate_runs enable row level security;

-- Read: any workspace owner or member
create policy "Workspace members can view gate runs"
  on public.judge_gate_runs for select
  using (public.can_view_workspace_members(workspace_id, auth.uid()));

-- No insert/update/delete from client. Service role bypasses RLS.
