"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import type { Project } from "@/types/database";
import type { ActionState } from "@/app/(dashboard)/dashboard/projects/actions";

interface ProjectFormProps {
  project?: Project;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
}

export function ProjectForm({ project, action, submitLabel }: ProjectFormProps) {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {project && <input type="hidden" name="id" value={project.id} />}

      <Input
        id="name"
        name="name"
        label={t("name")}
        placeholder={t("namePlaceholder")}
        defaultValue={project?.name}
        required
      />

      <div>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder={t("descriptionPlaceholder")}
          defaultValue={project?.description || ""}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {state?.error && (
        <FormMessage message={{ type: "error", text: state.error }} />
      )}

      {state?.success && (
        <FormMessage
          message={{ type: "success", text: t("saved") }}
        />
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? tc("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
