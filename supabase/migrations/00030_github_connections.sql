-- GitHub OAuth connections: stores user's GitHub access token for repo operations.
CREATE TABLE public.github_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_user_id bigint NOT NULL,
  github_username text NOT NULL,
  access_token text NOT NULL,
  scope text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT github_connections_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own github connection"
  ON public.github_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own github connection"
  ON public.github_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own github connection"
  ON public.github_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own github connection"
  ON public.github_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_github_connections
  BEFORE UPDATE ON public.github_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
