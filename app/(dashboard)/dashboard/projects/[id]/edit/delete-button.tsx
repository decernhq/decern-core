"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProjectAction } from "../../actions";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({
  projectId,
  projectName,
}: DeleteProjectButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProjectAction(projectId);
    });
  };

  if (!showConfirm) {
    return (
      <Button
        variant="danger"
        className="mt-4"
        onClick={() => setShowConfirm(true)}
      >
        Elimina progetto
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium text-red-800">
        Sei sicuro di voler eliminare &quot;{projectName}&quot;?
      </p>
      <div className="flex gap-2">
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? "Eliminazione..." : "Sì, elimina"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          Annulla
        </Button>
      </div>
    </div>
  );
}
