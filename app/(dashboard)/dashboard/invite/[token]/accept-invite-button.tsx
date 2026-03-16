"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { acceptWorkspaceInvitationAction } from "@/app/(dashboard)/dashboard/settings/actions";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const t = useTranslations("invite");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setLoading(true);
    const result = await acceptWorkspaceInvitationAction(token);
    setLoading(false);
    if (result?.error) {
      setError(result?.error);
    }
  }

  return (
    <div>
      <Button onClick={handleAccept} disabled={loading}>
        {loading ? t("accepting") : t("accept")}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
