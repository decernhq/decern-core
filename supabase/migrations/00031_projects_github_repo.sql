-- Add GitHub repository link to projects.
ALTER TABLE public.projects
  ADD COLUMN github_repo_full_name text,
  ADD COLUMN github_default_branch text DEFAULT 'main';
