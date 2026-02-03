"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { revokeInvitationAction } from "@/app/(dashboard)/dashboard/projects/actions";

export function RevokeInvitationButton({
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
    const result = await revokeInvitationAction(invitationId);
    setLoading(false);
    if (result?.success) router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-red-600 border-red-200 hover:bg-red-50"
      onClick={handleRevoke}
      disabled={loading}
    >
      Revoca
    </Button>
  );
}
