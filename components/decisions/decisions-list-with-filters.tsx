"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { DecisionStatus } from "@/types/decision";
import type { Project } from "@/types/database";
import {
  DECISION_STATUS_VALUES,
  STATUS_COLORS,
} from "@/lib/constants/decision-status";
import type { DecisionWithAuthor } from "@/lib/queries/decisions";
import { cn } from "@/lib/utils";
import { updateDecisionStatusAction } from "@/app/(dashboard)/dashboard/decisions/actions";

const statusColors = STATUS_COLORS;

const PAGE_SIZE = 24;
const TAGS_VISIBLE = 3;

type SortKey = "title" | "project" | "author" | "status" | "date";
type SortDirection = "asc" | "desc";

const TOGGLEABLE_COLUMN_KEYS = ["title", "project", "author", "status", "tags", "date"] as const;
type ToggleableColumnKey = (typeof TOGGLEABLE_COLUMN_KEYS)[number];
const DEFAULT_VISIBLE_COLUMNS: Record<ToggleableColumnKey, boolean> = {
  title: true,
  project: true,
  author: false,
  status: true,
  tags: true,
  date: true,
};
const COLUMN_WIDTHS: Record<ToggleableColumnKey | "adr" | "copy", string> = {
  adr: "7%",
  title: "27%",
  project: "14%",
  author: "12%",
  status: "10%",
  tags: "21%",
  date: "6%",
  copy: "3%",
};

interface DecisionsListWithFiltersProps {
  decisions: DecisionWithAuthor[];
  projects: Project[];
  availableTags: string[];
  hasProjects: boolean;
}

export function DecisionsListWithFilters({
  decisions,
  projects,
  availableTags,
  hasProjects,
}: DecisionsListWithFiltersProps) {
  const t = useTranslations("decisions");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("decisionStatus");
  const locale = useLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const statusOptions = useMemo(
    () => [
      { value: "" as const, label: tStatus("allStatuses") },
      ...DECISION_STATUS_VALUES.map((value) => ({ value, label: tStatus(value) })),
    ],
    [tStatus]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "">("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openTagsPopoverId, setOpenTagsPopoverId] = useState<string | null>(null);
  const [copiedAdrDecisionId, setCopiedAdrDecisionId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<ToggleableColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [sortBy, setSortBy] = useState<SortKey | null>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const toggleColumn = (key: ToggleableColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleColumnKeys = useMemo(
    () => ["adr", ...TOGGLEABLE_COLUMN_KEYS.filter((k) => visibleColumns[k]), "copy"] as const,
    [visibleColumns]
  );
  const colgroupWidths = useMemo(() => {
    const fixedTotal = visibleColumnKeys
      .filter((k) => k !== "title")
      .reduce((sum, k) => sum + parseInt(COLUMN_WIDTHS[k], 10), 0);
    const titleWidth = visibleColumnKeys.includes("title")
      ? Math.max(0, 100 - fixedTotal)
      : 0;
    return visibleColumnKeys.map((k) => ({
      key: k,
      width: k === "title" ? `${titleWidth}%` : `${COLUMN_WIDTHS[k]}`,
    }));
  }, [visibleColumnKeys]);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const tagsPopoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const filteredTagSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    return availableTags.filter(
      (tag) =>
        !selectedTags.includes(tag) &&
        (!q || tag.toLowerCase().includes(q)),
    );
  }, [availableTags, tagInput, selectedTags]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(e.target as Node)
      ) {
        setTagDropdownOpen(false);
      }
      if (
        openTagsPopoverId &&
        tagsPopoverRef.current &&
        !tagsPopoverRef.current.contains(e.target as Node)
      ) {
        setOpenTagsPopoverId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openTagsPopoverId]);

  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      const matchesSearch =
        !searchQuery.trim() ||
        decision.title
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()) ||
        (decision.context ?? "")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());

      const matchesStatus = !statusFilter || decision.status === statusFilter;

      const matchesProject =
        !projectFilter || decision.project_id === projectFilter;

      const decisionDate = new Date(decision.created_at);
      const matchesDateFrom = !dateFrom || decisionDate >= new Date(dateFrom + "T00:00:00");
      const matchesDateTo = !dateTo || decisionDate <= new Date(dateTo + "T23:59:59");

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) =>
          (decision.tags ?? [])
            .map((t) => t.toLowerCase())
            .includes(tag.toLowerCase()),
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProject &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesTags
      );
    });
  }, [
    decisions,
    searchQuery,
    statusFilter,
    projectFilter,
    dateFrom,
    dateTo,
    selectedTags,
  ]);

  const sortedDecisions = useMemo(() => {
    if (!sortBy) return filteredDecisions;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredDecisions].sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      switch (sortBy) {
        case "title":
          va = (a.title ?? "").toLowerCase();
          vb = (b.title ?? "").toLowerCase();
          return va < vb ? -dir : va > vb ? dir : 0;
        case "project":
          va = (projectMap.get(a.project_id) ?? "").toLowerCase();
          vb = (projectMap.get(b.project_id) ?? "").toLowerCase();
          return va < vb ? -dir : va > vb ? dir : 0;
        case "author":
          va = ((a.author?.full_name || a.author?.email) ?? "").toLowerCase();
          vb = ((b.author?.full_name || b.author?.email) ?? "").toLowerCase();
          return va < vb ? -dir : va > vb ? dir : 0;
        case "status":
          va = a.status;
          vb = b.status;
          return va < vb ? -dir : va > vb ? dir : 0;
        case "date":
          va = new Date(a.created_at).getTime();
          vb = new Date(b.created_at).getTime();
          return va < vb ? -dir : va > vb ? dir : 0;
        default:
          return 0;
      }
    });
  }, [filteredDecisions, sortBy, sortDirection, projectMap]);

  const totalPages = Math.max(1, Math.ceil(sortedDecisions.length / PAGE_SIZE));
  const paginatedDecisions = useMemo(
    () =>
      sortedDecisions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [sortedDecisions, currentPage],
  );

  const handleSort = (key: SortKey) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDirection(key === "date" ? "desc" : "asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortBy(null);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    const isActive = sortBy === columnKey;
    const direction = isActive ? sortDirection : null;
    return (
      <span className="ml-1 inline-flex shrink-0 text-gray-400" aria-hidden>
        {direction === "asc" ? (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        ) : direction === "desc" ? (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
      </span>
    );
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, projectFilter, dateFrom, dateTo, selectedTags]);

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
      setTagInput("");
      setTagDropdownOpen(false);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleStatusChange = async (
    decisionId: string,
    newStatus: DecisionStatus
  ) => {
    setUpdatingStatusId(decisionId);
    const result = await updateDecisionStatusAction(decisionId, newStatus);
    setUpdatingStatusId(null);
    if (!result?.error) {
      router.refresh();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setProjectFilter("");
    setDateFrom("");
    setDateTo("");
    setSelectedTags([]);
    setTagInput("");
    setTagDropdownOpen(false);
  };

  const hasActiveFilters =
    searchQuery.trim() ||
    statusFilter ||
    projectFilter ||
    dateFrom ||
    dateTo ||
    selectedTags.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          aria-label={t("searchAria")}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={t("clearSearch")}
          >
            ×
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("filters")}</span>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">{t("allProjects")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter((e.target.value || "") as DecisionStatus | "")
            }
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label htmlFor="date-from" className="text-xs text-gray-500">
              {t("dateFrom")}
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="date-to" className="text-xs text-gray-500">
              {t("dateTo")}
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">{t("tags")}</span>
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-sm text-brand-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full p-0.5 hover:bg-brand-200"
                  aria-label={t("removeTag", { tag })}
                >
                  ×
                </button>
              </span>
            ))}
            <div className="relative min-w-[160px]">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setTagDropdownOpen(true);
                }}
                onFocus={() => setTagDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredTagSuggestions.length > 0) {
                    e.preventDefault();
                    addTag(filteredTagSuggestions[0]);
                  }
                }}
                placeholder={t("tagPlaceholder")}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {tagDropdownOpen && (
                <div
                  ref={tagDropdownRef}
                  className="absolute left-0 top-full z-10 mt-1 max-h-48 w-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                >
                  {filteredTagSuggestions.length > 0 ? (
                    filteredTagSuggestions.slice(0, 15).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800"
                        onClick={() => addTag(tag)}
                      >
                        {tag}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-gray-500">
                      {availableTags.length === 0
                        ? t("noTagsAvailable")
                        : t("noTagsMatch")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-gray-600"
            >
              {t("clearFilters")}
            </Button>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            {t("columnsVisibility")}
          </p>
          <div className="flex flex-wrap gap-2">
            {TOGGLEABLE_COLUMN_KEYS.map((key) => {
              const isChecked = visibleColumns[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleColumn(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
                    isChecked
                      ? "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100"
                      : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                  )}
                  aria-pressed={isChecked}
                  aria-label={key === "tags" ? t("tags") : t(`${key}Col`)}
                >
                  {isChecked && (
                    <svg className="h-4 w-4 shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {key === "tags" ? t("tags") : t(`${key}Col`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {filteredDecisions.length === decisions.length ? (
          <>{t("ofCount", { count: decisions.length, total: decisions.length })}</>
        ) : (
          <>
            {t("ofCount", { count: filteredDecisions.length, total: decisions.length })}
          </>
        )}
        {totalPages > 1 && (
          <> · {t("pageOf", { current: currentPage, total: totalPages })}</>
        )}
      </p>

      {/* Table */}
      {filteredDecisions.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <colgroup>
                {colgroupWidths.map(({ key, width }) => (
                  <col key={key} style={{ width }} />
                ))}
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumnKeys.includes("adr") && (
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500" scope="col">
                      ADR REF
                    </th>
                  )}
                  {visibleColumnKeys.includes("title") && (
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500" scope="col">
                      <button
                        type="button"
                        onClick={() => handleSort("title")}
                        className="inline-flex items-center hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0"
                      >
                        {t("titleCol")}
                        <SortIcon columnKey="title" />
                      </button>
                    </th>
                  )}
                  {visibleColumnKeys.includes("project") && (
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500" scope="col">
                      <button
                        type="button"
                        onClick={() => handleSort("project")}
                        className="inline-flex items-center hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0"
                      >
                        {t("projectCol")}
                        <SortIcon columnKey="project" />
                      </button>
                    </th>
                  )}
                  {visibleColumnKeys.includes("author") && (
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500" scope="col">
                      <button
                        type="button"
                        onClick={() => handleSort("author")}
                        className="inline-flex items-center hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0"
                      >
                        {t("authorCol")}
                        <SortIcon columnKey="author" />
                      </button>
                    </th>
                  )}
                  {visibleColumnKeys.includes("status") && (
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500" scope="col">
                      <button
                        type="button"
                        onClick={() => handleSort("status")}
                        className="inline-flex items-center hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0"
                      >
                        {t("statusCol")}
                        <SortIcon columnKey="status" />
                      </button>
                    </th>
                  )}
                  {visibleColumnKeys.includes("tags") && (
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500" scope="col">
                      {t("tags")}
                    </th>
                  )}
                  {visibleColumnKeys.includes("date") && (
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500" scope="col">
                      <button
                        type="button"
                        onClick={() => handleSort("date")}
                        className="inline-flex items-center hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0"
                      >
                        {t("dateCol")}
                        <SortIcon columnKey="date" />
                      </button>
                    </th>
                  )}
                  {visibleColumnKeys.includes("copy") && (
                    <th className="w-10 shrink-0 px-2 py-2 text-right text-xs font-medium tracking-wider text-gray-500" scope="col">
                      <span className="sr-only">{t("copyAdrNumber")}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedDecisions.map((decision) => {
                  const tags = decision.tags ?? [];
                  const visibleTags = tags.slice(0, TAGS_VISIBLE);
                  const hasMoreTags = tags.length > TAGS_VISIBLE;
                  const isTagsPopoverOpen = openTagsPopoverId === decision.id;
                  return (
                    <tr key={decision.id} className="hover:bg-gray-50">
                      {visibleColumnKeys.includes("adr") && (
                        <td className="whitespace-nowrap px-3 py-2">
                          {decision.adr_ref ? (
                            <span className="font-mono text-sm text-gray-600" title={decision.adr_ref}>
                              {decision.adr_ref}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      {visibleColumnKeys.includes("title") && (
                        <td className="px-3 py-2">
                          <Link
                            href={`/dashboard/decisions/${decision.id}`}
                            className="block min-w-0 break-words font-medium text-gray-900 hover:text-brand-600"
                            title={decision.title}
                          >
                            {decision.title}
                          </Link>
                          <div className="mt-0.5 line-clamp-2 min-w-0 overflow-hidden text-ellipsis text-xs text-gray-500" title={decision.context ?? undefined}>
                            {decision.context}
                          </div>
                        </td>
                      )}
                      {visibleColumnKeys.includes("project") && (
                        <td className="min-w-0 max-w-0 overflow-hidden px-3 py-2">
                          <Link
                            href={`/dashboard/projects/${decision.project_id}`}
                            className="block min-w-0 truncate text-sm text-gray-600 hover:text-brand-600"
                            title={projectMap.get(decision.project_id) ?? undefined}
                          >
                            {projectMap.get(decision.project_id) || "—"}
                          </Link>
                        </td>
                      )}
                      {visibleColumnKeys.includes("author") && (
                        <td className="overflow-hidden px-3 py-2">
                          <span
                            className="block min-w-0 max-w-[20ch] truncate text-sm text-gray-600"
                            title={decision.author ? (decision.author.full_name || decision.author.email) : undefined}
                          >
                            {decision.author ? (decision.author.full_name || decision.author.email) : "—"}
                          </span>
                        </td>
                      )}
                      {visibleColumnKeys.includes("status") && (
                        <td className="min-w-[7rem] shrink-0 px-3 py-2">
                          <select
                            value={decision.status}
                            onChange={(e) =>
                              handleStatusChange(
                                decision.id,
                                e.target.value as DecisionStatus,
                              )
                            }
                            disabled={updatingStatusId === decision.id}
                            className={cn(
                              "w-full min-w-0 cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-0 whitespace-nowrap appearance-none",
                              statusColors[decision.status],
                              "border-transparent hover:opacity-90",
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {statusOptions
                              .filter((opt) => opt.value !== "")
                              .map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  className="bg-white text-gray-900"
                                >
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        </td>
                      )}
                      {visibleColumnKeys.includes("tags") && (
                        <td className="px-3 py-2">
                          <div className="relative flex flex-wrap items-center gap-1" ref={isTagsPopoverOpen ? tagsPopoverRef : undefined}>
                            {visibleTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex max-w-full shrink-0 truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                              >
                                {tag}
                              </span>
                            ))}
                            {hasMoreTags && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setOpenTagsPopoverId((id) => (id === decision.id ? null : decision.id));
                                }}
                                className="inline-flex shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                title={t("showAllTags", { count: tags.length })}
                                aria-label={t("showAllTags", { count: tags.length })}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7a1.994 1.994 0 01-.586-1.414V7a2 2 0 012-2z" />
                                </svg>
                              </button>
                            )}
                            {isTagsPopoverOpen && hasMoreTags && (
                              <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                                <p className="mb-1.5 px-2 text-xs font-medium text-gray-500">{t("allTags")}</p>
                                <div className="flex flex-wrap gap-1 px-2">
                                  {tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumnKeys.includes("date") && (
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                          {new Date(decision.created_at).toLocaleDateString(dateLocale)}
                        </td>
                      )}
                      {visibleColumnKeys.includes("copy") && (
                        <td className="w-10 shrink-0 overflow-visible px-2 py-2 text-right">
                          {decision.adr_ref ? (
                            <Tooltip label={copiedAdrDecisionId === decision.id ? t("copyAdrNumberCopied") : t("copyAdrNumber")}>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(decision.adr_ref!);
                                  setCopiedAdrDecisionId(decision.id);
                                  window.setTimeout(() => setCopiedAdrDecisionId(null), 2000);
                                }}
                                className="inline-flex rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label={copiedAdrDecisionId === decision.id ? t("copyAdrNumberCopied") : t("copyAdrNumber")}
                              >
                                {copiedAdrDecisionId === decision.id ? (
                                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </Tooltip>
                          ) : (
                            <span className="inline-block p-1.5 text-gray-300" aria-hidden>-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-b-xl border border-t-0 border-gray-200 bg-gray-50/50 px-3 py-2">
              <p className="text-xs text-gray-500">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedDecisions.length)} di {sortedDecisions.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2 text-xs"
                >
                  {tCommon("previous")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2 text-xs"
                >
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            {decisions.length === 0
              ? t("noDecisionsCreate")
              : t("noResultsFilters")}
          </p>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={clearFilters}
            >
              {t("clearFilters")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
