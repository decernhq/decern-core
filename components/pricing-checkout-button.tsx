/**
 * Pricing checkout button – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/components/pricing-checkout-button.tsx.
 */
"use client";

import { Button } from "@/components/ui/button";

export function PricingCheckoutButton({
  planName,
  className,
  size,
}: {
  planId: "team" | "business";
  planName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Button className={className} size={size} disabled>
      {planName}
    </Button>
  );
}
