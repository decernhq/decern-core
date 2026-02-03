"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DecisionStatus } from "@/types/decision";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateDecisionStatusAction } from "@/app/(dashboard)/dashboard/decisions/actions";

interface DecisionDetailStatusSelectProps {
  decisionId: string;
  currentStatus: DecisionStatus;
}

export function DecisionDetailStatusSelect({
  decisionId,
  currentStatus,
}: DecisionDetailStatusSelectProps) {
  const router = useRouter();
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
        disabled={updating}
        className={cn(
          "h-10",
          isApproved
            ? "border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
            : "border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
        )}
      >
        {updating
          ? "Salvataggio..."
          : isApproved
            ? "Rimuovi da approvato"
            : "Sposta in approvato"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
