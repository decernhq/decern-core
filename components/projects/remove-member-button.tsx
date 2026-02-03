"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeMemberAction } from "@/app/(dashboard)/dashboard/projects/actions";

export function RemoveMemberButton({
  projectId,
  userId,
  label,
  isSelf,
}: {
  projectId: string;
  userId: string;
  label: string;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm(isSelf ? "Vuoi uscire dal progetto?" : "Rimuovere questo membro?")) return;
    setLoading(true);
    const result = await removeMemberAction(projectId, userId);
    setLoading(false);
    if (result?.success) router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-red-600 border-red-200 hover:bg-red-50"
      onClick={handleRemove}
      disabled={loading}
    >
      {isSelf ? "Esci" : "Rimuovi"}
    </Button>
  );
}
