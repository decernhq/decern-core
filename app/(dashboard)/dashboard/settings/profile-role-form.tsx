"use client";

import { useState, useTransition } from "react";
import { updateProfileRoleAction } from "./actions";
import { USER_ROLES } from "@/lib/constants/roles";
import { Button } from "@/components/ui/button";

type Props = {
  initialRole: string | null;
};

export function ProfileRoleForm({ initialRole }: Props) {
  const [role, setRole] = useState(initialRole ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("role", role);
      const result = await updateProfileRoleAction({}, formData);
      if (result?.error) {
        setFeedback({ type: "error", text: result.error });
      } else {
        setFeedback({ type: "success", text: "Ruolo aggiornato." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor="profile_role" className="mb-1.5 block text-sm font-medium text-gray-700">
          Ruolo
        </label>
        <select
          id="profile_role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isPending}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
        >
          <option value="">Nessun ruolo</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvataggio…" : "Salva"}
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
