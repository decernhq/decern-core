"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PricingCheckoutButtonProps = {
  planId: "team" | "business";
  planName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
};

export function PricingCheckoutButton({
  planId,
  planName,
  className,
  size = "sm",
  variant = "primary",
}: PricingCheckoutButtonProps) {
  const router = useRouter();
  const t = useTranslations("pricing");
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Error during upgrade");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Error during upgrade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={cn("w-full", className)}
      size={size}
      variant={variant}
    >
      {loading ? t("choosePlan", { planName: "..." }) : t("choosePlan", { planName })}
    </Button>
  );
}
