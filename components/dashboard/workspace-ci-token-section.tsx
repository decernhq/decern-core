"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  generateWorkspaceCiTokenAction,
  revokeWorkspaceCiTokenAction,
} from "@/app/(dashboard)/dashboard/actions";

export function WorkspaceCiTokenSection({
  workspaceId,
  ciTokenCreatedAt,
}: {
  workspaceId: string;
  ciTokenCreatedAt: string | null;
}) {
  const [loading, setLoading] = useState<"generate" | "revoke" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const hasToken = !!ciTokenCreatedAt;
  const createdDate = ciTokenCreatedAt
    ? new Date(ciTokenCreatedAt).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const handleGenerate = async () => {
    setError(null);
    setLoading("generate");
    try {
      const result = await generateWorkspaceCiTokenAction(workspaceId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if ("token" in result) {
        setRevealedToken(result.token);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Revocare il token CI? Dovrai generarne uno nuovo per usare il Decision Gate.")) return;
    setError(null);
    setLoading("revoke");
    try {
      const result = await revokeWorkspaceCiTokenAction(workspaceId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRevealedToken(null);
    } finally {
      setLoading(null);
    }
  };

  const handleCloseReveal = () => setRevealedToken(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Token CI (Decision Gate)</h2>
      <p className="mt-1 text-sm text-gray-500">
        Usa questo token nelle pipeline CI per verificare che una decisione sia approvata prima di procedere.
        Endpoint: <code className="rounded bg-gray-100 px-1 text-xs">GET /api/decision-gate/validate?adrRef=ADR-001</code> oppure <code className="rounded bg-gray-100 px-1 text-xs">?decisionId=uuid</code>
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {revealedToken ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Token generato: copialo ora, non sarà più visibile.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-white px-2 py-1.5 text-sm font-mono text-gray-800">
              {revealedToken}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(revealedToken)}
            >
              Copia
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCloseReveal}>
              Chiudi
            </Button>
          </div>
        </div>
      ) : hasToken ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-600">
            Token presente (generato il {createdDate})
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!!loading}
            onClick={handleGenerate}
          >
            {loading === "generate" ? "Generazione…" : "Rigenera"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={!!loading}
            onClick={handleRevoke}
          >
            {loading === "revoke" ? "Revoca…" : "Revoca"}
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <Button
            type="button"
            disabled={!!loading}
            onClick={handleGenerate}
          >
            {loading === "generate" ? "Generazione…" : "Genera token CI"}
          </Button>
        </div>
      )}
    </div>
  );
}
