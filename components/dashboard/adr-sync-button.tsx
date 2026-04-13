"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function AdrSyncButton({
  workspaceId,
  repositoryIdentifier,
  labels,
}: {
  workspaceId: string;
  repositoryIdentifier: string;
  labels: { sync: string; syncing: string; synced: string; cliHint: string };
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const isGitHub = repositoryIdentifier.startsWith("github.com/");

  const run = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/adrs/sync-from-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, repositoryIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(data.error || `HTTP ${res.status}`);
        return;
      }
      setState("done");
      setMessage(`${data.synced} synced, ${data.deleted} removed`);
      router.refresh();
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Unknown error");
    }
  }, [workspaceId, repositoryIdentifier, router]);

  if (!isGitHub) {
    return (
      <span className="text-xs text-app-text-muted" title={labels.cliHint}>
        {labels.cliHint}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={state === "loading"}
        className="rounded-md border border-app-border px-2.5 py-1 text-xs font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text disabled:opacity-50"
      >
        {state === "loading" ? labels.syncing : labels.sync}
      </button>
      {state === "done" && <span className="text-xs text-green-600 dark:text-green-400">{message}</span>}
      {state === "error" && <span className="text-xs text-red-600 dark:text-red-400">{message}</span>}
    </span>
  );
}
