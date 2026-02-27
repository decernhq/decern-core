"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Error opening billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Error opening billing portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleManage} disabled={loading}>
      {loading ? "Caricamento..." : "Gestisci abbonamento"}
    </Button>
  );
}
