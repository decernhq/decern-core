"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("projects");
  const tc = useTranslations("common");
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
        {t("deleteProject")}
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium text-red-800">
        {t("confirmDelete", { name: projectName })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={isPending}
        >
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
