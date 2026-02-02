"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import type { DbDecision, Project } from "@/types/database";
import type { ActionState } from "@/app/(dashboard)/dashboard/decisions/actions";

const DEFAULT_SUGGESTED_TAGS = [
  "frontend",
  "backend",
  "architecture",
  "api",
  "database",
  "security",
  "performance",
  "react",
  "typescript",
  "testing",
  "devops",
  "documentation",
];

/** Minimal decision for "linked decision" picker (popup) */
export type LinkedDecisionOption = { id: string; title: string; project_id: string };

interface DecisionFormProps {
  /** Modifica: decisione esistente */
  decision?: DbDecision;
  /** Duplica: apre il form di creazione con i campi precompilati da questa decisione */
  duplicateFrom?: DbDecision;
  projects: Project[];
  /** Decisioni disponibili per "Decisione collegata", filtrate per progetto nel popup (escludere la corrente in edit) */
  otherDecisions?: LinkedDecisionOption[];
  defaultProjectId?: string;
  /** Tag già usati nelle decisioni (per autocomplete) */
  suggestedTags?: string[];
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
}

const statusOptions = [
  { value: "proposed", label: "Proposta" },
  { value: "approved", label: "Approvata" },
  { value: "superseded", label: "Superata" },
  { value: "rejected", label: "Rifiutata" },
];

type ExternalLink = { url: string; label?: string };

/** Dati iniziali per il form: edit (decision) o creazione da duplicato (duplicateFrom con titolo " (copia)") */
function getInitialData(decision?: DbDecision | null, duplicateFrom?: DbDecision | null): DbDecision | null {
  if (decision) return decision;
  if (duplicateFrom) {
    return {
      ...duplicateFrom,
      title: ((duplicateFrom.title ?? "").trim() || "Copia decisione") + " (copia)",
    };
  }
  return null;
}

export function DecisionForm({
  decision,
  duplicateFrom,
  projects,
  otherDecisions = [],
  defaultProjectId,
  suggestedTags = [],
  action,
  submitLabel,
}: DecisionFormProps) {
  const initialData = getInitialData(decision, duplicateFrom);
  const isEditMode = !!decision;

  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>(
    initialData?.external_links?.length
      ? initialData.external_links.map((l) => ({ url: l.url, label: l.label }))
      : []
  );
  const [options, setOptions] = useState<string[]>(
    initialData?.options?.length ? [...initialData.options] : []
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialData?.project_id ?? defaultProjectId ?? ""
  );
  const [selectedLinkedDecision, setSelectedLinkedDecision] = useState<{
    id: string;
    title: string;
  } | null>(() => {
    if (!initialData?.linked_decision_id) return null;
    const found = otherDecisions.find((d) => d.id === initialData.linked_decision_id);
    return found ? { id: found.id, title: found.title } : null;
  });
  const [linkedModalOpen, setLinkedModalOpen] = useState(false);
  const [linkedSearchQuery, setLinkedSearchQuery] = useState("");
  const linkedSearchRef = useRef<HTMLInputElement>(null);

  const allSuggestedTags = Array.from(
    new Set([...DEFAULT_SUGGESTED_TAGS, ...suggestedTags].map((t) => t.toLowerCase()))
  ).sort();
  const filteredTagSuggestions = tagInput.trim()
    ? allSuggestedTags.filter((t) =>
        t.includes(tagInput.trim().toLowerCase()) && !tags.includes(t)
      )
    : allSuggestedTags.filter((t) => !tags.includes(t));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(e.target as Node)
      ) {
        setTagSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentProjectId = decision ? decision.project_id : selectedProjectId;
  const projectDecisions = otherDecisions.filter(
    (d) => d.project_id === currentProjectId
  );
  const filteredLinkedDecisions = linkedSearchQuery.trim()
    ? projectDecisions.filter((d) =>
        d.title.toLowerCase().includes(linkedSearchQuery.trim().toLowerCase())
      )
    : projectDecisions;

  const openLinkedModal = () => {
    setLinkedSearchQuery("");
    setLinkedModalOpen(true);
    setTimeout(() => linkedSearchRef.current?.focus(), 100);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const serialized = externalLinks
      .filter((l) => l.url.trim())
      .map((l) => (l.label?.trim() ? `${l.label.trim()} | ${l.url.trim()}` : l.url.trim()))
      .join("\n");
    formData.set("external_links", serialized);
    formData.set("options", options.filter((o) => o.trim()).join("\n"));
    formData.set("tags", tags.join(", "));
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);
    });
  };

  const addLink = () => setExternalLinks((prev) => [...prev, { url: "" }]);
  const removeLink = (index: number) =>
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  const updateLink = (index: number, field: "url" | "label", value: string) =>
    setExternalLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );

  const addOption = () => setOptions((prev) => [...prev, ""]);
  const removeOption = (index: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== index));
  const updateOption = (index: number, value: string) =>
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? value : o))
    );

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
    setTagSuggestionsOpen(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (index: number) =>
    setTags((prev) => prev.filter((_, i) => i !== index));

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTagSuggestions.length > 0) {
        addTag(filteredTagSuggestions[0]);
      } else if (tagInput.trim()) {
        addTag(tagInput.trim());
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isEditMode && decision && <input type="hidden" name="id" value={decision.id} />}

      {/* Project selector (only for new decisions, including duplicate) */}
      {!isEditMode && (
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
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
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
        defaultValue={initialData?.title}
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
          defaultValue={initialData?.status || "proposed"}
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
          defaultValue={initialData?.context}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="decision"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Decisione*
        </label>
        <textarea
          id="decision"
          name="decision"
          rows={3}
          placeholder="Descrivi la decisione finale presa..."
          defaultValue={initialData?.decision}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Opzioni considerate
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
          >
            + Aggiungi opzione
          </Button>
        </div>
        <div className="space-y-3">
          {options.map((option, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                {index + 1}
              </span>
              <input
                type="text"
                placeholder="Es. Next.js - SSR nativo, ottimo ecosistema"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
                className="flex-shrink-0 text-gray-500 hover:text-red-600"
                aria-label="Rimuovi opzione"
              >
                Rimuovi
              </Button>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-gray-500">
              Nessuna opzione. Clicca &quot;Aggiungi opzione&quot; per elencare le alternative valutate.
            </p>
          )}
        </div>
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
          defaultValue={initialData?.consequences}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Tags
        </label>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-sm text-brand-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-brand-200"
                aria-label={`Rimuovi tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <div className="relative min-w-[140px] flex-1">
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setTagSuggestionsOpen(true);
              }}
              onFocus={() => setTagSuggestionsOpen(true)}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Aggiungi tag..."
              className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 py-1 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
            />
            {tagSuggestionsOpen && filteredTagSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {filteredTagSuggestions.slice(0, 10).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800"
                    onClick={() => addTag(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Scrivi e scegli dai suggerimenti o premi Invio per aggiungere.
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Link esterni</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
          >
            + Aggiungi link
          </Button>
        </div>
        <div className="space-y-3">
          {externalLinks.map((link, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
            >
              <input
                type="text"
                placeholder="Etichetta (opzionale)"
                value={link.label ?? ""}
                onChange={(e) => updateLink(index, "label", e.target.value)}
                className="h-9 w-40 flex-shrink-0 rounded border border-gray-300 bg-white px-2.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
              />
              <input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(index, "url", e.target.value)}
                className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2.5 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLink(index)}
                className="flex-shrink-0 text-gray-500 hover:text-red-600"
                aria-label="Rimuovi link"
              >
                Rimuovi
              </Button>
            </div>
          ))}
          {externalLinks.length === 0 && (
            <p className="text-sm text-gray-500">
              Nessun link. Clicca &quot;Aggiungi link&quot; per inserire riferimenti esterni (RFC, documentazione, ecc.).
            </p>
          )}
        </div>
      </div>

      {/* Decisione collegata (in fondo): popup ricerca decisioni del progetto */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Decisione collegata
        </label>
        <input
          type="hidden"
          name="linked_decision_id"
          value={selectedLinkedDecision?.id ?? ""}
        />
        {selectedLinkedDecision ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
            <span className="flex-1 text-sm text-gray-700">
              {selectedLinkedDecision.title}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLinkedDecision(null)}
              className="text-gray-500 hover:text-red-600"
            >
              Rimuovi
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openLinkedModal}>
              Cambia
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openLinkedModal}
            disabled={!currentProjectId}
            className="w-full justify-center sm:w-auto"
          >
            Cerca decisione del progetto
          </Button>
        )}
        {!currentProjectId && !decision && (
          <p className="mt-1 text-xs text-gray-500">
            Seleziona prima un progetto per cercare una decisione collegata.
          </p>
        )}
        {currentProjectId && (
          <p className="mt-1 text-xs text-gray-500">
            Link opzionale a una decisione precedente o correlata (solo decisioni dello stesso progetto).
          </p>
        )}
      </div>

      {linkedModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setLinkedModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="linked-modal-title"
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 p-4">
              <h2 id="linked-modal-title" className="text-lg font-semibold text-gray-900">
                Cerca decisione del progetto
              </h2>
              {currentProjectId && (
                <p className="mt-0.5 text-sm text-gray-500">
                  Progetto: {projects.find((p) => p.id === currentProjectId)?.name ?? ""}
                </p>
              )}
              <input
                ref={linkedSearchRef}
                type="text"
                value={linkedSearchQuery}
                onChange={(e) => setLinkedSearchQuery(e.target.value)}
                placeholder="Cerca per titolo..."
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredLinkedDecisions.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {projectDecisions.length === 0
                    ? "Nessuna decisione in questo progetto."
                    : "Nessun risultato per la ricerca."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {filteredLinkedDecisions.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLinkedDecision({ id: d.id, title: d.title });
                          setLinkedModalOpen(false);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800"
                      >
                        {d.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-gray-200 p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinkedModalOpen(false)}
                className="w-full"
              >
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}

      {state?.error && (
        <FormMessage message={{ type: "error", text: state.error }} />
      )}

      {state?.success && (
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
