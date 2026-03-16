"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Workspace } from "@/types/database";
import { renameWorkspaceAction } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function WorkspaceList({
  workspaces,
  selectedWorkspaceId,
  currentUserId,
}: {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(w: Workspace) {
    setEditingId(w.id);
    setEditName(w.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setError(null);
  }

  async function saveEdit(workspaceId: string) {
    if (!editName.trim()) return;
    setLoading(true);
    setError(null);
    const result = await renameWorkspaceAction(workspaceId, editName.trim());
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    setEditName("");
    router.refresh();
  }

  if (workspaces.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">{t("yourWorkspaces")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {t("yourWorkspacesHint")}
      </p>
      <ul className="mt-4 space-y-2">
        {workspaces.map((w) => {
          const isOwner = w.owner_id === currentUserId;
          const isSelected = w.id === selectedWorkspaceId;
          const isEditing = editingId === w.id;

          return (
            <li
              key={w.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-lg border py-2.5 px-3 transition",
                isSelected ? "border-brand-300 bg-brand-50" : "border-gray-100 bg-gray-50/50"
              )}
            >
              {isEditing ? (
                <>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(w.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    disabled={loading}
                    className="max-w-xs flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => saveEdit(w.id)}
                    disabled={loading || !editName.trim()}
                  >
                    {loading ? tc("saving") : tc("save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={loading}>
                    {tc("cancel")}
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 font-medium text-gray-900">{w.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isSelected && (
                      <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {t("inUse")}
                      </span>
                    )}
                    {isOwner ? (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {t("owner")}
                      </span>
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {t("memberRole")}
                      </span>
                    )}
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-gray-500 hover:text-gray-700"
                        onClick={() => startEdit(w)}
                      >
                        {t("renameButton")}
                      </Button>
                    )}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
