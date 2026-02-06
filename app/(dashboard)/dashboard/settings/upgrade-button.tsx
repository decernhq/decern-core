"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UpgradeButtonProps = {
  planId?: "team" | "business";
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function UpgradeButton({ planId = "team", className, size }: UpgradeButtonProps) {
  const t = useTranslations("buttons");
  const tErrors = useTranslations("errors");
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || tErrors("upgrade_failed"));
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert(tErrors("upgrade_failed"));
    } finally {
      setLoading(false);
    }
  };

  const label = planId === "business" ? t("upgradeToBusiness") : t("upgradeToTeam");

  return (
    <Button onClick={handleUpgrade} disabled={loading} className={cn(className)} size={size}>
      {loading ? t("upgradeLoading") : label}
    </Button>
  );
}
