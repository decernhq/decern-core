-- Add workspace_id and adr_ref (ADR-001, ADR-002, ...) to decisions.
-- adr_ref is unique per workspace so validate can be called with ?decisionId=ADR-001.

alter table public.decisions
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Backfill workspace_id from project
update public.decisions d
set workspace_id = p.workspace_id
from public.projects p
where p.id = d.project_id and d.workspace_id is null;

alter table public.decisions
  alter column workspace_id set not null;

-- Add adr_ref; backfill existing rows with ADR-001, ADR-002 per workspace (by created_at)
alter table public.decisions
  add column if not exists adr_ref text;

with numbered as (
  select
    d.id,
    'ADR-' || lpad(row_number() over (partition by p.workspace_id order by d.created_at, d.id)::text, 3, '0') as ref
  from public.decisions d
  join public.projects p on p.id = d.project_id
)
update public.decisions
set adr_ref = numbered.ref
from numbered
where decisions.id = numbered.id;

-- Now enforce not null (trigger sets adr_ref on future inserts)
alter table public.decisions
  alter column adr_ref set not null;

create unique index if not exists decisions_workspace_adr_ref_key
  on public.decisions (workspace_id, adr_ref);

create index if not exists decisions_adr_ref_idx on public.decisions(adr_ref);
create index if not exists decisions_workspace_id_idx on public.decisions(workspace_id);

comment on column public.decisions.adr_ref is 'Short ref per workspace, e.g. ADR-001, used in CI validate endpoint.';

-- Trigger: on insert set workspace_id from project and next adr_ref in workspace
create or replace function public.decisions_set_workspace_and_adr_ref()
returns trigger
language plpgsql
as $$
declare
  v_workspace_id uuid;
  v_next_num int;
begin
  select workspace_id into v_workspace_id from public.projects where id = NEW.project_id;
  if v_workspace_id is null then
    raise exception 'project_id % has no workspace', NEW.project_id;
  end if;
  NEW.workspace_id := v_workspace_id;

  select coalesce(max((regexp_replace(adr_ref, '^ADR-', ''))::int), 0) + 1
  into v_next_num
  from public.decisions
  where workspace_id = v_workspace_id;

  NEW.adr_ref := 'ADR-' || lpad(v_next_num::text, 3, '0');
  return NEW;
end;
$$;

drop trigger if exists decisions_set_workspace_and_adr_ref_trigger on public.decisions;
create trigger decisions_set_workspace_and_adr_ref_trigger
  before insert on public.decisions
  for each row execute procedure public.decisions_set_workspace_and_adr_ref();
