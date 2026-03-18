/**
 * GitHub repo selector – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/components/projects/github-repo-selector.tsx.
 */
"use client";

export function GitHubRepoSelector({
  defaultValue: _defaultValue,
  defaultBranch: _defaultBranch,
  isGithubConnected: _isGithubConnected,
}: {
  defaultValue?: string | null;
  defaultBranch?: string | null;
  isGithubConnected: boolean;
}) {
  return (
    <>
      <input type="hidden" name="github_repo_full_name" value="" />
      <input type="hidden" name="github_default_branch" value="main" />
    </>
  );
}
