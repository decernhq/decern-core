/**
 * Pricing checkout button – stub for self-hosted / open-source mode.
 * No self-service checkout; enterprise requires contact.
 */
"use client";

import { Button } from "@/components/ui/button";

export function PricingCheckoutButton({
  planName,
  className,
  size,
}: {
  planId?: string;
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
