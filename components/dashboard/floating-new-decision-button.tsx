"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function FloatingNewDecisionButton() {
  const t = useTranslations("dashboard");
  const label = t("newDecision");
  return (
    <Link
      href="/dashboard/decisions/new"
      className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center overflow-hidden rounded-full bg-brand-600 text-white shadow-lg transition-all duration-200 hover:w-[11rem] hover:bg-brand-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      aria-label={label}
    >
      <span className="flex h-14 w-12 shrink-0 items-center justify-center">
        <svg
          className="pl-2 h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="whitespace-nowrap pr-4 text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}
