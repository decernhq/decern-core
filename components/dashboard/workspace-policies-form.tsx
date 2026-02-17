"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateWorkspacePoliciesAction } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type WorkspacePoliciesInitial = {
  require_linked_pr: boolean;
  require_approved: boolean;
  enforce: boolean;
  judge_blocking: boolean;
  judge_tolerance_percent: number | null;
};

type Props = {
  workspaceId: string;
  initial: WorkspacePoliciesInitial;
};

export function WorkspacePoliciesForm({ workspaceId, initial }: Props) {
  const t = useTranslations("workspace");
  const tCommon = useTranslations("common");
  const [requireLinkedPR, setRequireLinkedPR] = useState(initial.require_linked_pr);
  const [requireApproved, setRequireApproved] = useState(initial.require_approved);
  const [enforce, setEnforce] = useState(initial.enforce);
  const [judgeBlocking, setJudgeBlocking] = useState(initial.judge_blocking);
  const [toleranceRaw, setToleranceRaw] = useState(
    initial.judge_tolerance_percent != null ? String(initial.judge_tolerance_percent) : ""
  );
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const num = toleranceRaw.trim() === "" ? null : parseInt(toleranceRaw, 10);
    const judge_tolerance_percent =
      num != null && !Number.isNaN(num) && num >= 0 && num <= 100 ? num : null;

    startTransition(async () => {
      const result = await updateWorkspacePoliciesAction(workspaceId, {
        require_linked_pr: requireLinkedPR,
        require_approved: requireApproved,
        enforce,
        judge_blocking: judgeBlocking,
        judge_tolerance_percent,
      });
      if (result?.error) {
        setFeedback({ type: "error", text: result.error });
      } else {
        setFeedback({ type: "success", text: t("policiesSaved") });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={requireLinkedPR}
            onChange={(e) => setRequireLinkedPR(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-gray-700">{t("requireLinkedPR")}</span>
        </label>
        <p className="w-full text-xs text-gray-500 sm:ml-6">{t("requireLinkedPRHint")}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={requireApproved}
            onChange={(e) => setRequireApproved(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-gray-700">{t("requireApproved")}</span>
        </label>
        <p className="w-full text-xs text-gray-500 sm:ml-6">{t("requireApprovedHint")}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enforce}
            onChange={(e) => setEnforce(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-gray-700">{t("enforce")}</span>
        </label>
        <p className="w-full text-xs text-gray-500 sm:ml-6">{t("enforceHint")}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={judgeBlocking}
            onChange={(e) => setJudgeBlocking(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-gray-700">{t("judgeBlocking")}</span>
        </label>
        <p className="w-full text-xs text-gray-500 sm:ml-6">{t("judgeBlockingHint")}</p>
      </div>

      <div>
        <Input
          id="judge_tolerance_percent"
          type="number"
          min={0}
          max={100}
          placeholder="—"
          value={toleranceRaw}
          onChange={(e) => setToleranceRaw(e.target.value)}
          disabled={isPending}
          label={t("judgeTolerancePercent")}
          className="w-24"
        />
        <p className={cn("mt-1.5 text-xs text-gray-500")}>{t("judgeToleranceHint")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? tCommon("saving") : tCommon("save")}
        </Button>
        {feedback && (
          <p
            className={cn(
              "text-sm",
              feedback.type === "error" ? "text-red-600" : "text-green-600"
            )}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </form>
  );
}
