"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfileLocaleAction } from "./actions";
import { Button } from "@/components/ui/button";

const LOCALES = [
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
] as const;

type Props = {
  initialLocale: string | null;
};

export function ProfileLocaleForm({ initialLocale }: Props) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [locale, setLocale] = useState(initialLocale || "en");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("locale", locale);
      const result = await updateProfileLocaleAction({}, formData);
      if (result?.error) {
        const msg = result.error === "not_authenticated" ? tErrors("not_authenticated") : result.error;
        setFeedback({ type: "error", text: msg });
      } else {
        setFeedback({ type: "success", text: "Language updated. Reloading..." });
        window.location.reload();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="locale" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("language")}
          </label>
          <select
            id="locale"
            name="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            disabled={isPending}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          >
            {LOCALES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={isPending} className="h-10 shrink-0">
          {isPending ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
      <p className="text-xs text-gray-500">{t("languageHint")}</p>
      {feedback && (
        <p
          className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-green-600"}`}
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}
