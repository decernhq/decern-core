/**
 * GitHub API client – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/github/client.ts.
 */

export async function listUserRepos(_token: string): Promise<any[]> {
  return [];
}

export async function getRepoDefaultBranch(
  _token: string,
  _repoFullName: string
): Promise<string> {
  return "main";
}

export async function listAdrFiles(
  _token: string,
  _repoFullName: string,
  _branch?: string
): Promise<any[]> {
  return [];
}

export async function getFileContent(
  _token: string,
  _repoFullName: string,
  _path: string,
  _branch?: string
): Promise<{ content: string; sha: string }> {
  throw new Error("GitHub integration is not available in self-hosted mode");
}

export async function createOrUpdateFile(
  _token: string,
  _repoFullName: string,
  _path: string,
  _content: string,
  _message: string,
  _sha?: string,
  _branch?: string
): Promise<void> {
  // noop in self-hosted mode
}

export async function deleteFile(
  _token: string,
  _repoFullName: string,
  _path: string,
  _sha: string,
  _message: string,
  _branch?: string
): Promise<void> {
  // noop in self-hosted mode
}

export async function getRef(
  _token: string,
  _repoFullName: string,
  _ref: string,
): Promise<string> {
  return "";
}

export async function createBranch(
  _token: string,
  _repoFullName: string,
  _branchName: string,
  _fromSha: string,
): Promise<void> {
  // noop in self-hosted mode
}

export async function createPullRequest(
  _token: string,
  _repoFullName: string,
  _opts: { title: string; body: string; head: string; base: string },
): Promise<{ number: number; html_url: string }> {
  throw new Error("GitHub integration is not available in self-hosted mode");
}

export async function ensureAdrFolder(
  _token: string,
  _repoFullName: string,
  _branch?: string
): Promise<void> {
  // noop in self-hosted mode
}
