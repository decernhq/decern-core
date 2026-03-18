const GITHUB_API = "https://api.github.com";

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
}

interface GitHubContentFile {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
}

interface GitHubCommitResponse {
  content: { sha: string; path: string } | null;
  commit: { sha: string };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function listUserRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      { headers: headers(token) }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = (await res.json()) as GitHubRepo[];
    repos.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  return repos;
}

export async function getRepoDefaultBranch(
  token: string,
  repoFullName: string
): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = (await res.json()) as GitHubRepo;
  return data.default_branch;
}

export async function listAdrFiles(
  token: string,
  repoFullName: string,
  branch?: string
): Promise<GitHubContentFile[]> {
  const ref = branch ? `?ref=${branch}` : "";
  const res = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/contents/adr${ref}`,
    { headers: headers(token) }
  );

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = (await res.json()) as GitHubContentFile[] | GitHubContentFile;
  const items = Array.isArray(data) ? data : [data];
  return items.filter(
    (f) => f.type === "file" && f.name.endsWith(".md") && f.name !== "README.md"
  );
}

export async function getFileContent(
  token: string,
  repoFullName: string,
  path: string,
  branch?: string
): Promise<{ content: string; sha: string }> {
  const ref = branch ? `?ref=${branch}` : "";
  const res = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/contents/${path}${ref}`,
    { headers: headers(token) }
  );

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = (await res.json()) as GitHubContentFile;

  if (!data.content || data.encoding !== "base64") {
    throw new Error("Unexpected file encoding");
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

export async function createOrUpdateFile(
  token: string,
  repoFullName: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string
): Promise<GitHubCommitResponse> {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
  };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;

  const res = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/contents/${path}`,
    {
      method: "PUT",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return (await res.json()) as GitHubCommitResponse;
}

export async function deleteFile(
  token: string,
  repoFullName: string,
  path: string,
  sha: string,
  message: string,
  branch?: string
): Promise<void> {
  const body: Record<string, string> = { message, sha };
  if (branch) body.branch = branch;

  const res = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/contents/${path}`,
    {
      method: "DELETE",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
}

export async function ensureAdrFolder(
  token: string,
  repoFullName: string,
  branch?: string
): Promise<void> {
  const ref = branch ? `?ref=${branch}` : "";
  const res = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/contents/adr${ref}`,
    { headers: headers(token) }
  );

  if (res.status === 404) {
    await createOrUpdateFile(
      token,
      repoFullName,
      "adr/.gitkeep",
      "",
      "chore: initialize /adr folder for ADR decisions",
      undefined,
      branch
    );
  }
}
