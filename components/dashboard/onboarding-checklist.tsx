"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface OnboardingStep {
  key: string;
  done: boolean;
  href: string;
}

interface OnboardingChecklistProps {
  hasProjects: boolean;
  hasDecisions: boolean;
  hasCiToken: boolean;
  hasGithub: boolean;
  isCloud: boolean;
}

const DISMISSED_KEY = "decern_onboarding_dismissed";

export function OnboardingChecklist({
  hasProjects,
  hasDecisions,
  hasCiToken,
  hasGithub,
  isCloud,
}: OnboardingChecklistProps) {
  const t = useTranslations("dashboard.onboarding");
  const [dismissed, setDismissed] = useState(true); // default true to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  const steps: OnboardingStep[] = [
    { key: "createProject", done: hasProjects, href: "/dashboard/projects/new" },
    { key: "createDecision", done: hasDecisions, href: "/dashboard/decisions/new" },
    { key: "setupGate", done: hasCiToken, href: "/dashboard/workspace" },
    ...(isCloud
      ? [{ key: "connectGithub", done: hasGithub, href: "/dashboard/settings" }]
      : []),
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-brand-900 dark:text-brand-100">
            {t("title")}
          </h2>
          <p className="mt-0.5 text-sm text-brand-700 dark:text-brand-300">
            {t("progress", { completed, total: steps.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-200"
        >
          {t("dismiss")}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-brand-200 dark:bg-brand-800">
        <div
          className="h-1.5 rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              href={step.done ? "#" : step.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                step.done
                  ? "cursor-default text-brand-500 dark:text-brand-500"
                  : "text-brand-900 hover:bg-brand-100 dark:text-brand-100 dark:hover:bg-brand-900"
              }`}
            >
              {step.done ? (
                <svg className="h-5 w-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-brand-300 dark:border-brand-600" />
              )}
              <div>
                <span className={step.done ? "line-through" : "font-medium"}>
                  {t(step.key as "createProject" | "createDecision" | "setupGate" | "connectGithub")}
                </span>
                <p className="text-xs text-brand-600 dark:text-brand-400">
                  {t(`${step.key}Hint` as "createProjectHint" | "createDecisionHint" | "setupGateHint" | "connectGithubHint")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
