"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeWorkspaceMemberAction } from "@/app/(dashboard)/dashboard/settings/actions";

export function RemoveWorkspaceMemberButton({
  workspaceId,
  userId,
  label,
  isSelf,
}: {
  workspaceId: string;
  userId: string;
  label: string;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm(isSelf ? "Vuoi uscire dal workspace?" : "Rimuovere questo membro?")) return;
    setLoading(true);
    const result = await removeWorkspaceMemberAction(workspaceId, userId);
    setLoading(false);
    if (result?.success) router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-red-200 text-red-600 hover:bg-red-50"
      onClick={handleRemove}
      disabled={loading}
    >
      {isSelf ? "Esci" : "Rimuovi"}
    </Button>
  );
}
