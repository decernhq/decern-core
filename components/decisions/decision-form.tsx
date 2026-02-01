"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import type { DbDecision, Project } from "@/types/database";
import type { ActionState } from "@/app/(dashboard)/dashboard/decisions/actions";

interface DecisionFormProps {
  decision?: DbDecision;
  projects: Project[];
  defaultProjectId?: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
}

const statusOptions = [
  { value: "proposed", label: "Proposta" },
  { value: "approved", label: "Approvata" },
  { value: "superseded", label: "Superata" },
  { value: "rejected", label: "Rifiutata" },
];

export function DecisionForm({
  decision,
  projects,
  defaultProjectId,
  action,
  submitLabel,
}: DecisionFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {decision && <input type="hidden" name="id" value={decision.id} />}

      {/* Project selector (only for new decisions) */}
      {!decision && (
        <div>
          <label
            htmlFor="project_id"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Progetto *
          </label>
          <select
            id="project_id"
            name="project_id"
            defaultValue={defaultProjectId || ""}
            required
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Seleziona un progetto...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Input
        id="title"
        name="title"
        label="Titolo *"
        placeholder="Es. Adottare Next.js come framework frontend"
        defaultValue={decision?.title}
        required
      />

      <div>
        <label
          htmlFor="status"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Stato
        </label>
        <select
          id="status"
          name="status"
          defaultValue={decision?.status || "proposed"}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="context"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Contesto
        </label>
        <textarea
          id="context"
          name="context"
          rows={3}
          placeholder="Descrivi il problema o la situazione che ha portato a questa decisione..."
          defaultValue={decision?.context}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="options"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Opzioni considerate
        </label>
        <textarea
          id="options"
          name="options"
          rows={4}
          placeholder="Una opzione per riga, es:&#10;Next.js - SSR nativo&#10;Remix - focus su web standards&#10;Create React App - SPA tradizionale"
          defaultValue={decision?.options.join("\n")}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <p className="mt-1 text-xs text-gray-500">Una opzione per riga</p>
      </div>

      <div>
        <label
          htmlFor="decision"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Decisione
        </label>
        <textarea
          id="decision"
          name="decision"
          rows={3}
          placeholder="Descrivi la decisione finale presa..."
          defaultValue={decision?.decision}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="consequences"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Conseguenze
        </label>
        <textarea
          id="consequences"
          name="consequences"
          rows={3}
          placeholder="Descrivi le conseguenze positive e negative di questa decisione..."
          defaultValue={decision?.consequences}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <Input
        id="tags"
        name="tags"
        label="Tags"
        placeholder="frontend, framework, react (separati da virgola)"
        defaultValue={decision?.tags.join(", ")}
      />

      {state.error && (
        <FormMessage message={{ type: "error", text: state.error }} />
      )}

      {state.success && (
        <FormMessage
          message={{ type: "success", text: "Decisione salvata con successo!" }}
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
