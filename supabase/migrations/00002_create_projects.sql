-- Create projects table
-- Projects group related decisions together

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.projects enable row level security;

-- Projects policies
-- Users can view their own projects
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

-- Users can create projects
create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

-- Users can update their own projects
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

-- Users can delete their own projects
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- Trigger for updated_at
create trigger update_projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at_column();

-- Index for faster queries
create index projects_owner_id_idx on public.projects(owner_id);
