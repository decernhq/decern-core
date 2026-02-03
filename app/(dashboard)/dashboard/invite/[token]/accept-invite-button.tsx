"use client";

import { useState } from "react";
import { acceptWorkspaceInvitationAction } from "@/app/(dashboard)/dashboard/settings/actions";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
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
    // On success, acceptWorkspaceInvitationAction redirects
  }

  return (
    <div>
      <Button onClick={handleAccept} disabled={loading}>
        {loading ? "Accettazione…" : "Accetta invito"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
