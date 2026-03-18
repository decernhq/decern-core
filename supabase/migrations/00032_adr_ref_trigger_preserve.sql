-- Update the trigger so it preserves adr_ref if already provided (e.g. from webhook sync).
CREATE OR REPLACE FUNCTION public.decisions_set_workspace_and_adr_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_workspace_id uuid;
  v_next_num int;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM public.projects WHERE id = NEW.project_id;
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'project_id % has no workspace', NEW.project_id;
  END IF;
  NEW.workspace_id := v_workspace_id;

  -- Only auto-generate adr_ref when not explicitly provided
  IF NEW.adr_ref IS NULL OR NEW.adr_ref = '' THEN
    SELECT coalesce(max((regexp_replace(adr_ref, '^ADR-', ''))::int), 0) + 1
    INTO v_next_num
    FROM public.decisions
    WHERE workspace_id = v_workspace_id;

    NEW.adr_ref := 'ADR-' || lpad(v_next_num::text, 3, '0');
  END IF;

  RETURN NEW;
END;
$$;
