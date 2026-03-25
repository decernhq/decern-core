"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DecisionStatus } from "@/types/decision";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateDecisionStatusAction } from "@/app/(dashboard)/dashboard/decisions/actions";

interface DecisionDetailStatusSelectProps {
  decisionId: string;
  currentStatus: DecisionStatus;
  canApprove?: boolean;
}

export function DecisionDetailStatusSelect({
  decisionId,
  currentStatus,
  canApprove = true,
}: DecisionDetailStatusSelectProps) {
  const router = useRouter();
  const t = useTranslations("decisions");
  const tc = useTranslations("common");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApproved = currentStatus === "approved";
  const targetStatus: DecisionStatus = isApproved ? "proposed" : "approved";

  const handleClick = async () => {
    setError(null);
    setUpdating(true);
    const result = await updateDecisionStatusAction(decisionId, targetStatus);
    if (result?.error) {
      setError(result?.error);
      setUpdating(false);
      return;
    }
    router.refresh();
    setUpdating(false);
  };

  return (
    <div className="flex h-10 flex-col justify-center">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={updating || !canApprove}
        className={cn(
          "h-10",
          isApproved
            ? "border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
            : "border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
        )}
      >
        {updating
          ? tc("saving")
          : isApproved
            ? t("removeFromApproved")
            : t("moveToApproved")}
      </Button>
      {!canApprove && <p className="mt-1 text-xs text-amber-700">{t("approvalRestricted")}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
