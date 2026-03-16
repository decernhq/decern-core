"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("decisions");
  const tc = useTranslations("common");
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
        {t("deleteDecision")}
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium text-red-800">
        {t("confirmDelete", { title: decisionTitle })}
      </p>
      <div className="flex gap-2">
        <Button variant="danger" onClick={handleDelete} disabled={isPending}>
          {isPending ? tc("deleting") : tc("yesDelete")}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          {tc("cancel")}
        </Button>
      </div>
    </div>
  );
}
