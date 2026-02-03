"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { revokeWorkspaceInvitationAction } from "@/app/(dashboard)/dashboard/settings/actions";

export function RevokeWorkspaceInvitationButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm(`Revocare l'invito per ${email}?`)) return;
    setLoading(true);
    const result = await revokeWorkspaceInvitationAction(invitationId);
    setLoading(false);
    if (result?.success) router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-red-200 text-red-600 hover:bg-red-50"
      onClick={handleRevoke}
      disabled={loading}
    >
      Revoca
    </Button>
  );
}
