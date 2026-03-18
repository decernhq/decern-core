"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface Repo {
  full_name: string;
  name: string;
  owner: string;
  default_branch: string;
  private: boolean;
}

interface GitHubRepoSelectorProps {
  defaultValue?: string | null;
  defaultBranch?: string | null;
  isGithubConnected: boolean;
}

export function GitHubRepoSelector({
  defaultValue,
  defaultBranch,
  isGithubConnected,
}: GitHubRepoSelectorProps) {
  const t = useTranslations("projects");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(defaultValue || "");
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch || "main");

  useEffect(() => {
    if (!isGithubConnected) return;
    setLoading(true);
    fetch("/api/github/repos")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load repos");
        return res.json();
      })
      .then((data: Repo[]) => {
        setRepos(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isGithubConnected]);

  if (!isGithubConnected) {
    return (
      <div className="space-y-2">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("githubRepo")} <span className="font-normal text-gray-400">({t("optional")})</span>
        </label>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-500">{t("githubNotConnected")}</p>
          <a
            href="/dashboard/settings"
            className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 underline"
          >
            {t("goToSettings")}
          </a>
        </div>
      </div>
    );
  }

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="github_repo_search"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("githubRepo")} <span className="font-normal text-gray-400">({t("optional")})</span>
        </label>

        {loading ? (
          <p className="text-sm text-gray-500">{t("loadingRepos")}</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <input
              id="github_repo_search"
              type="text"
              placeholder={t("searchRepos")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <select
              name="github_repo_full_name"
              value={selectedRepo}
              onChange={(e) => {
                setSelectedRepo(e.target.value);
                const repo = repos.find((r) => r.full_name === e.target.value);
                if (repo) setSelectedBranch(repo.default_branch);
              }}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">{t("noRepo")}</option>
              {filtered.map((r) => (
                <option key={r.full_name} value={r.full_name}>
                  {r.full_name} {r.private ? "🔒" : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <input
        type="hidden"
        name="github_default_branch"
        value={selectedBranch}
      />
    </div>
  );
}
