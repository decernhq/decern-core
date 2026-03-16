"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DecisionForm } from "@/components/decisions/decision-form";
import type { Project } from "@/types/database";
import type { LinkedDecisionOption } from "@/components/decisions/decision-form";
import type { DbDecision } from "@/types/database";
import type { ActionState } from "@/app/(dashboard)/dashboard/decisions/actions";

type GenerateFromTextResponse = {
  title: string;
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  tags: string[];
};

interface NewDecisionFlowProps {
  projects: Project[];
  otherDecisions: LinkedDecisionOption[];
  suggestedTags: string[];
  existingDecisionsForDuplicateCheck: { id: string; title: string }[];
  defaultProjectId?: string;
  duplicateFrom?: DbDecision | null;
  createDecisionAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}

export function NewDecisionFlow({
  projects,
  otherDecisions,
  suggestedTags,
  existingDecisionsForDuplicateCheck,
  defaultProjectId,
  duplicateFrom,
  createDecisionAction,
}: NewDecisionFlowProps) {
  const t = useTranslations("decisions");
  const [step, setStep] = useState<"ai" | "form">(duplicateFrom ? "form" : "ai");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [prefillFromAi, setPrefillFromAi] = useState<GenerateFromTextResponse | null>(null);

  const handleGenerate = async () => {
    const text = pasteText.trim();
    if (!text) return;
    setAiError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/decisions/generate-from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, existingTags: suggestedTags }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? t("generationError"));
        setLoading(false);
        return;
      }
      setPrefillFromAi(data as GenerateFromTextResponse);
      setStep("form");
    } catch {
      setAiError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "form") {
    const duplicateCheckList =
      duplicateFrom?.id != null
        ? existingDecisionsForDuplicateCheck.filter((d) => d.id !== duplicateFrom.id)
        : existingDecisionsForDuplicateCheck;
    return (
      <DecisionForm
        projects={projects}
        duplicateFrom={duplicateFrom ?? undefined}
        prefillFromAi={prefillFromAi}
        otherDecisions={otherDecisions}
        defaultProjectId={defaultProjectId}
        suggestedTags={suggestedTags}
        existingDecisionsForDuplicateCheck={duplicateCheckList}
        action={createDecisionAction}
        submitLabel={t("createDecision")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="paste-text"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("pasteTextLabel")}
        </label>
        <textarea
          id="paste-text"
          rows={8}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={t("pastePlaceholder")}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={loading}
        />
      </div>

      {aiError && (
        <p className="text-sm text-red-600">{aiError}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !pasteText.trim()}
          className="gap-2"
        >
          {loading ? (
            t("generatingAi")
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              {t("generateWithAi")}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("form")}
          disabled={loading}
        >
          {t("generateManually")}
        </Button>
      </div>
    </div>
  );
}
