"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteUserToWorkspaceAction } from "@/app/(dashboard)/dashboard/settings/actions";

export function InviteWorkspaceForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteLink(null);
    setLoading(true);
    const result = await inviteUserToWorkspaceAction(workspaceId, email);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.inviteLink) {
      setInviteLink(result.inviteLink);
      setEmail("");
      router.refresh();
    }
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          {loading ? t("sending") : t("inviteButton")}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {inviteLink && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">{t("inviteCreated")}</p>
          <p className="mt-1 text-green-700">
            {t("inviteLinkDescription")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-gray-800">
              {inviteLink}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              {tc("copy")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
