"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { prepareWorkspaceAction } from "@/app/(dashboard)/dashboard/actions";

export function PreparingWorkspaceView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("workspace");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await prepareWorkspaceAction();
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
        return;
      }
      const plan = searchParams.get("plan");
      router.push(plan ? `/dashboard?plan=${plan}` : "/dashboard");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg px-4">
        <p className="text-center text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <p className="text-lg text-muted-foreground">{t("preparing")}</p>
    </div>
  );
}
