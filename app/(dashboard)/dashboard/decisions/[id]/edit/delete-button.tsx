"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteDecisionAction } from "../../actions";

interface DeleteDecisionButtonProps {
  decisionId: string;
  decisionTitle: string;
}

export function DeleteDecisionButton({
  decisionId,
  decisionTitle,
}: DeleteDecisionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteDecisionAction(decisionId);
    });
  };

  if (!showConfirm) {
    return (
      <Button
        variant="danger"
        className="mt-4"
        onClick={() => setShowConfirm(true)}
      >
        Elimina decisione
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium text-red-800">
        Sei sicuro di voler eliminare &quot;{decisionTitle}&quot;?
      </p>
      <div className="flex gap-2">
        <Button variant="danger" onClick={handleDelete} disabled={isPending}>
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
