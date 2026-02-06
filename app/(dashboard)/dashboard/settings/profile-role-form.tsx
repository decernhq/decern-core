"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfileRoleAction } from "./actions";
import { USER_ROLES } from "@/lib/constants/roles";
import { Button } from "@/components/ui/button";

type Props = {
  initialRole: string | null;
};

export function ProfileRoleForm({ initialRole }: Props) {
  const t = useTranslations("profile");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
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
        const msg = result.error in { not_authenticated: 1, role_update_failed: 1 } ? tErrors(result.error as "not_authenticated" | "role_update_failed") : result.error;
        setFeedback({ type: "error", text: msg });
      } else {
        setFeedback({ type: "success", text: t("roleUpdated") });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor="profile_role" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("role")}
        </label>
        <select
          id="profile_role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isPending}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
        >
          <option value="">{t("noRole")}</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? tCommon("saving") : tCommon("save")}
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
