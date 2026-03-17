-- Rename enforce → high_impact in workspace_policies for clarity.
ALTER TABLE public.workspace_policies RENAME COLUMN enforce TO high_impact;
