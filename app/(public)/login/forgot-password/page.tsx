"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage, type Message } from "@/components/ui/form-message";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(undefined);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectTo ?? undefined,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setMessage({ type: "success", text: t("resetLinkSent") });
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-3xl" linkToHome={false} />
          <p className="mt-2 text-gray-600">{t("forgotPasswordTitle")}</p>
          <p className="mt-1 text-sm text-gray-500">{t("forgotPasswordSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label={tCommon("email")}
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <FormMessage message={message} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("sendingResetLink") : t("sendResetLink")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
