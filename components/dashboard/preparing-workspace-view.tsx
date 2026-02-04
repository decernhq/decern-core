"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareWorkspaceAction } from "@/app/(dashboard)/dashboard/actions";

/**
 * Vista full-screen mostrata quando l'utente non ha ancora un workspace.
 * Mostra "Preparando il tuo workspace", crea il workspace via Server Action (che imposta il cookie), poi reindirizza alla Dashboard.
 */
export function PreparingWorkspaceView() {
  const router = useRouter();
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
      router.push("/dashboard");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg px-4">
        <p className="text-center text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm font-medium text-primary hover:underline"
        >
          Riprova
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
      <p className="text-lg text-muted-foreground">
        Preparando il tuo workspace
      </p>
    </div>
  );
}
