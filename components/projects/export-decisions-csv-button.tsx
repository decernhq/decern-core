"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface ExportDecisionsCsvButtonProps {
  /** When set, export only this project's decisions */
  projectId?: string;
}

export function ExportDecisionsCsvButton({ projectId }: ExportDecisionsCsvButtonProps) {
  const t = useTranslations("projects");
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const url = projectId
        ? `/api/decisions/export/csv?projectId=${encodeURIComponent(projectId)}`
        : "/api/decisions/export/csv";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? "decisions.csv";
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? t("exportDecisionsCsvDownloading") : t("exportDecisionsCsv")}
    </Button>
  );
}
