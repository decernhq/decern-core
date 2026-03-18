"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { disconnectGitHubAction } from "@/app/(dashboard)/dashboard/settings/actions";

export function GitHubConnectSection({
  githubUsername,
}: {
  githubUsername: string | null;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(() => {
    if (searchParams.get("github_connected") === "true") return t("githubConnectedSuccess");
    const err = searchParams.get("github_error");
    if (err) return `GitHub error: ${err}`;
    return null;
  });

  const handleDisconnect = async () => {
    setLoading(true);
    setFeedback(null);
    const result = await disconnectGitHubAction();
    setLoading(false);
    if (result?.error) {
      setFeedback(result.error);
    } else {
      setFeedback(t("githubDisconnected"));
      router.refresh();
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">{t("github")}</h2>
      <p className="mt-1 text-sm text-gray-500">{t("githubHint")}</p>

      {feedback && (
        <p className={`mt-2 text-sm ${feedback.includes("error") || feedback.includes("Error") ? "text-red-600" : "text-green-600"}`}>
          {feedback}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        {githubUsername ? (
          <>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                {t("githubConnected", { username: githubUsername })}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={loading}
            >
              {t("githubDisconnect")}
            </Button>
            <a href="/api/github/auth">
              <Button type="button" variant="outline" size="sm">
                {t("githubReconnect")}
              </Button>
            </a>
          </>
        ) : (
          <a href="/api/github/auth">
            <Button type="button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              {t("githubConnect")}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
