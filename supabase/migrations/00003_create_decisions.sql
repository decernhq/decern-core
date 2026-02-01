-- Create decision status enum
create type decision_status as enum ('proposed', 'approved', 'superseded', 'rejected');

-- Create decisions table
-- Stores technical decision records (ADRs)

create table public.decisions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  status decision_status default 'proposed' not null,
  context text not null default '',
  options text[] default '{}',
  decision text not null default '',
  consequences text not null default '',
  tags text[] default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.decisions enable row level security;

-- Decisions policies
-- Users can view decisions from their own projects
create policy "Users can view decisions from own projects"
  on public.decisions for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = decisions.project_id
      and projects.owner_id = auth.uid()
    )
  );

-- Users can create decisions in their own projects
create policy "Users can create decisions in own projects"
  on public.decisions for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_id
      and projects.owner_id = auth.uid()
    )
  );

-- Users can update decisions in their own projects
create policy "Users can update decisions in own projects"
  on public.decisions for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = decisions.project_id
      and projects.owner_id = auth.uid()
    )
  );

-- Users can delete decisions in their own projects
create policy "Users can delete decisions in own projects"
  on public.decisions for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = decisions.project_id
      and projects.owner_id = auth.uid()
    )
  );

-- Trigger for updated_at
create trigger update_decisions_updated_at
  before update on public.decisions
  for each row execute procedure public.update_updated_at_column();

-- Indexes for faster queries
create index decisions_project_id_idx on public.decisions(project_id);
create index decisions_status_idx on public.decisions(status);
create index decisions_created_by_idx on public.decisions(created_by);
