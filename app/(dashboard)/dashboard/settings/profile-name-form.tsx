"use client";

import { useState, useTransition } from "react";
import { updateProfileNameAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initialFullName: string | null;
};

export function ProfileNameForm({ initialFullName }: Props) {
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("full_name", fullName);
      const result = await updateProfileNameAction({}, formData);
      if (result.error) {
        setFeedback({ type: "error", text: result.error });
      } else {
        setFeedback({ type: "success", text: "Nome aggiornato." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <Input
          id="full_name"
          name="full_name"
          type="text"
          label="Nome utente"
          placeholder="Mario Rossi"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isPending}
          autoComplete="name"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvataggio..." : "Salva"}
      </Button>
      {feedback && (
        <p
          className={`w-full text-sm ${feedback.type === "error" ? "text-red-600" : "text-green-600"}`}
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}
