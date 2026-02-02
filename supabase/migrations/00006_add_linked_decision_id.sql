-- Optional link to a previous/related decision (reference only, no "supersedes" semantics)
alter table public.decisions
  add column linked_decision_id uuid references public.decisions(id) on delete set null;

create index decisions_linked_decision_id_idx on public.decisions(linked_decision_id);
