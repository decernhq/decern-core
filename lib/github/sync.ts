/**
 * GitHub ADR sync – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/github/sync.ts.
 */

export async function syncAdrFromRepo(
  _token: string,
  _repoFullName: string,
  _branch: string | undefined,
  _projectId: string,
  _workspaceId: string
): Promise<{ imported: number; errors: string[] }> {
  return { imported: 0, errors: [] };
}
