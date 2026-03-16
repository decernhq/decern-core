"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createWorkspaceAction } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const t = useTranslations("workspace");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("name", name.trim() || t("defaultWorkspaceName"));
    const result = await createWorkspaceAction({}, formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder={t("workspaceName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading} className="min-w-[10rem] shrink-0">
          {loading ? t("creating") : t("createWorkspace")}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
