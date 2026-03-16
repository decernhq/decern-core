"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState<"generate" | "revoke" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const hasToken = !!ciTokenCreatedAt;
  const createdDate = ciTokenCreatedAt
    ? new Date(ciTokenCreatedAt).toLocaleDateString(undefined, {
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
    if (!confirm(t("confirmRevokeCiToken"))) return;
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
      <h2 className="text-lg font-semibold text-gray-900">{t("ciTokenTitle")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {t("ciTokenDescription")}{" "}
        Endpoint: <code className="rounded bg-gray-100 px-1 text-xs">GET /api/decision-gate/validate?adrRef=ADR-001</code> oppure <code className="rounded bg-gray-100 px-1 text-xs">?decisionId=uuid</code>
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {revealedToken ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">{t("tokenGenerated")}</p>
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
              {tc("copy")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCloseReveal}>
              {tc("close")}
            </Button>
          </div>
        </div>
      ) : hasToken ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-600">
            {t("tokenPresent", { date: createdDate ?? "" })}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!!loading}
            onClick={handleGenerate}
          >
            {loading === "generate" ? t("generating") : t("regenerate")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={!!loading}
            onClick={handleRevoke}
          >
            {loading === "revoke" ? t("revoking") : t("revoke")}
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <Button
            type="button"
            disabled={!!loading}
            onClick={handleGenerate}
          >
            {loading === "generate" ? t("generating") : t("generateCiToken")}
          </Button>
        </div>
      )}
    </div>
  );
}
