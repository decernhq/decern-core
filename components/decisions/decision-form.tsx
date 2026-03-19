"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import type { DbDecision, Project } from "@/types/database";
import type { ActionState } from "@/app/(dashboard)/dashboard/decisions/actions";
import { DECISION_STATUS_VALUES } from "@/lib/constants/decision-status";

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
  "auth",
  "caching",
  "deployment",
  "monitoring",
  "ci-cd",
  "storage",
  "queue",
  "infrastructure",
  "scalability",
  "migration",
  "refactoring",
  "ui",
  "ux",
  "accessibility",
  "api-design",
  "rest",
  "graphql",
  "logging",
  "observability",
  "error-handling",
  "data-model",
  "schema",
  "indexing",
  "networking",
  "latency",
  "cost",
  "compliance",
  "privacy",
  "third-party",
  "vendor",
  "design-pattern",
  "microservices",
  "monolith",
  "mobile",
  "cloud",
  "serverless",
  "containers",
  "kubernetes",
  "postgresql",
  "redis",
  "elasticsearch",
  "messaging",
  "event-driven",
  "versioning",
  "breaking-change",
];

/** Minimal decision for "linked decision" picker (popup) */
export type LinkedDecisionOption = { id: string; title: string; project_id: string };

/** Dati generati da AI per precompilare il form */
export type PrefillFromAi = {
  title?: string;
  context?: string;
  options?: string[];
  decision?: string;
  consequences?: string;
  tags?: string[];
};

interface DecisionFormProps {
  /** Modifica: decisione esistente */
  decision?: DbDecision;
  /** Duplica: apre il form di creazione con i campi precompilati da questa decisione */
  duplicateFrom?: DbDecision;
  /** Precompila i campi con l’output della generazione AI (nuova decisione) */
  prefillFromAi?: PrefillFromAi | null;
  projects: Project[];
  /** Decisioni disponibili per "Decisione collegata", filtrate per progetto nel popup (escludere la corrente in edit) */
  otherDecisions?: LinkedDecisionOption[];
  defaultProjectId?: string;
  /** Tag già usati nelle decisioni (per autocomplete) */
  suggestedTags?: string[];
  /** Se fornito, in creazione si controlla se il titolo esiste già e si mostra un warning */
  existingDecisionsForDuplicateCheck?: { id: string; title: string }[];
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
}

type ExternalLink = { url: string; label?: string };

/** Dati iniziali per il form: edit, duplicato o prefill da AI */
function getInitialData(
  decision?: DbDecision | null,
  duplicateFrom?: DbDecision | null,
  prefillFromAi?: PrefillFromAi | null
): Partial<DbDecision> | null {
  if (decision) return decision;
  if (duplicateFrom) {
    return {
      ...duplicateFrom,
      title: (duplicateFrom.title ?? "").trim() + " (copy)",
    };
  }
  if (prefillFromAi && Object.keys(prefillFromAi).length > 0) {
    return {
      status: "proposed",
      title: prefillFromAi.title ?? "",
      context: prefillFromAi.context ?? "",
      options: prefillFromAi.options ?? [],
      decision: prefillFromAi.decision ?? "",
      consequences: prefillFromAi.consequences ?? "",
      tags: prefillFromAi.tags ?? [],
    };
  }
  return null;
}

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase();
}

export function DecisionForm({
  decision,
  duplicateFrom,
  prefillFromAi,
  projects,
  otherDecisions = [],
  defaultProjectId,
  suggestedTags = [],
  existingDecisionsForDuplicateCheck = [],
  action,
  submitLabel,
}: DecisionFormProps) {
  const t = useTranslations("decisions");
  const tc = useTranslations("common");
  const ts = useTranslations("decisionStatus");
  const initialData = getInitialData(decision, duplicateFrom, prefillFromAi);
  const isEditMode = !!decision;
  const checkDuplicate = !isEditMode && existingDecisionsForDuplicateCheck.length > 0;

  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();
  const [titleValue, setTitleValue] = useState(initialData?.title ?? "");
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; title: string } | null>(null);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>(
    initialData?.external_links?.length
      ? initialData.external_links.map((l) => ({ url: l.url, label: l.label }))
      : []
  );
  const [pullRequestUrls, setPullRequestUrls] = useState<string[]>(
    Array.isArray(initialData?.pull_request_urls)
      ? initialData.pull_request_urls.filter((u): u is string => typeof u === "string" && u.trim() !== "")
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
    if (!checkDuplicate) return;
    const normalized = normalizeTitle(titleValue);
    if (!normalized) {
      setDuplicateWarning(null);
      return;
    }
    const match = existingDecisionsForDuplicateCheck.find(
      (d) => normalizeTitle(d.title) === normalized
    );
    setDuplicateWarning(match ?? null);
  }, [titleValue, checkDuplicate, existingDecisionsForDuplicateCheck]);

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
    formData.set("pull_request_urls", pullRequestUrls.filter((u) => u.trim()).join("\n"));
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

  const addPullRequest = () => setPullRequestUrls((prev) => [...prev, ""]);
  const removePullRequest = (index: number) =>
    setPullRequestUrls((prev) => prev.filter((_, i) => i !== index));
  const updatePullRequestUrl = (index: number, value: string) =>
    setPullRequestUrls((prev) =>
      prev.map((u, i) => (i === index ? value : u))
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

      {duplicateWarning && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
        >
          <svg
            className="h-5 w-5 shrink-0 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t("duplicateWarningTitle")}</p>
            <p className="mt-0.5 text-sm text-amber-800">
              {t("duplicateWarningBody")}{" "}
              <Link
                href={`/dashboard/decisions/${duplicateWarning.id}`}
                className="font-medium underline hover:no-underline"
              >
                {t("openExisting")}
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Project selector (only for new decisions, including duplicate) */}
      {!isEditMode && (
        <div>
          <label
            htmlFor="project_id"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {t("projectRequired")}
          </label>
          <select
            id="project_id"
            name="project_id"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            required
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">{t("selectProject")}</option>
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
        label={t("titleRequired")}
        placeholder={t("titlePlaceholder")}
        value={checkDuplicate ? titleValue : undefined}
        defaultValue={checkDuplicate ? undefined : initialData?.title}
        onChange={checkDuplicate ? (e) => setTitleValue(e.target.value) : undefined}
        required
      />

      <div>
        <label
          htmlFor="status"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("status")}
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initialData?.status || "proposed"}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {DECISION_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {ts(value)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="context"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("context")}
        </label>
        <textarea
          id="context"
          name="context"
          rows={3}
          placeholder={t("contextPlaceholder")}
          defaultValue={initialData?.context}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="decision"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("decisionRequired")}
        </label>
        <textarea
          id="decision"
          name="decision"
          rows={3}
          placeholder={t("decisionPlaceholder")}
          defaultValue={initialData?.decision}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {t("optionsConsidered")}
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
          >
            {t("addOption")}
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
                placeholder={t("optionPlaceholder")}
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
                aria-label={t("removeOption")}
              >
                {tc("remove")}
              </Button>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-gray-500">
              {t("noOptions")}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="consequences"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("consequences")}
        </label>
        <textarea
          id="consequences"
          name="consequences"
          rows={3}
          placeholder={t("consequencesPlaceholder")}
          defaultValue={initialData?.consequences}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("tags")}
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
                className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 hover:bg-brand-200"
                aria-label={t("removeTag", { tag })}
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
              placeholder={t("addTag")}
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
          {t("tagHint")}
        </p>
      </div>

      {/* Pull Request (multiple) */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t("pullRequest")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPullRequest}
          >
            {t("addPr")}
          </Button>
        </div>
        <div className="space-y-3">
          {pullRequestUrls.map((url, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
            >
              <input
                type="url"
                placeholder="https://github.com/org/repo/pull/123"
                value={url}
                onChange={(e) => updatePullRequestUrl(index, e.target.value)}
                className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2.5 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePullRequest(index)}
                className="flex-shrink-0 text-gray-500 hover:text-red-600"
                aria-label={t("removePr")}
              >
                {tc("remove")}
              </Button>
            </div>
          ))}
          {pullRequestUrls.length === 0 && (
            <p className="text-sm text-gray-500">
              {t("noPr")}
            </p>
          )}
        </div>
      </div>

      {/* Link esterni */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t("externalLinks")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
          >
            {t("addLink")}
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
                placeholder={t("labelOptional")}
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
                aria-label={t("removeLink")}
              >
                {tc("remove")}
              </Button>
            </div>
          ))}
          {externalLinks.length === 0 && (
            <p className="text-sm text-gray-500">
              {t("noLinks")}
            </p>
          )}
        </div>
      </div>

      {/* Sostituisce (supersede): decisione che questa sostituisce */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("supersedes")}
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
              {tc("remove")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openLinkedModal}>
              {tc("change")}
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
            {t("selectSuperseded")}
          </Button>
        )}
        {!currentProjectId && !decision && (
          <p className="mt-1 text-xs text-gray-500">
            {t("selectProjectFirst")}
          </p>
        )}
        {currentProjectId && (
          <p className="mt-1 text-xs text-gray-500">
            {t("supersedesHint")}
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
                {t("selectSupersedesModal")}
              </h2>
              {currentProjectId && (
                <p className="mt-0.5 text-sm text-gray-500">
                  {t("project")} {projects.find((p) => p.id === currentProjectId)?.name ?? ""}
                </p>
              )}
              <input
                ref={linkedSearchRef}
                type="text"
                value={linkedSearchQuery}
                onChange={(e) => setLinkedSearchQuery(e.target.value)}
                placeholder={t("searchByTitle")}
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredLinkedDecisions.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {projectDecisions.length === 0
                    ? t("noDecisionsInProject")
                    : t("noSearchResults")}
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
            <p className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
              {t("supersededNote")}
            </p>
            <div className="border-t border-gray-200 p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinkedModalOpen(false)}
                className="w-full"
              >
                {tc("cancel")}
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
