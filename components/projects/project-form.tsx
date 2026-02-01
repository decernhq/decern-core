"use client";

import { useActionState } from "react";
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
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {project && <input type="hidden" name="id" value={project.id} />}

      <Input
        id="name"
        name="name"
        label="Nome progetto"
        placeholder="Es. API Backend, Mobile App..."
        defaultValue={project?.name}
        required
      />

      <div>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Descrizione
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Descrizione opzionale del progetto..."
          defaultValue={project?.description || ""}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {state.error && (
        <FormMessage message={{ type: "error", text: state.error }} />
      )}

      {state.success && (
        <FormMessage
          message={{ type: "success", text: "Progetto salvato con successo!" }}
        />
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvataggio..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
