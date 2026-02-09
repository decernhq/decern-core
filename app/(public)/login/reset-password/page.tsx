"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage, type Message } from "@/components/ui/form-message";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
      if (!session) {
        setMessage({
          type: "error",
          text: t("resetLinkInvalid"),
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(undefined);

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: t("passwordsDoNotMatch") });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: t("passwordMinLength") });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setMessage({ type: "success", text: t("passwordUpdated") });
    setLoading(false);
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-3xl" linkToHome={false} />
          <p className="mt-2 text-gray-600">{t("resetPasswordTitle")}</p>
          <p className="mt-1 text-sm text-gray-500">{t("resetPasswordSubtitle")}</p>
        </div>

        {!ready ? (
          <div className="space-y-4">
            <FormMessage message={message} />
            <p className="text-center text-sm text-gray-600">
              <Link href="/login/forgot-password" className="font-medium text-brand-600 hover:text-brand-500">
                {t("requestNewResetLink")}
              </Link>
            </p>
            <p className="text-center text-sm">
              <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">
                {t("backToLogin")}
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="password"
              type="password"
              label={t("newPassword")}
              placeholder={t("newPasswordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              id="confirmPassword"
              type="password"
              label={t("confirmNewPassword")}
              placeholder={t("confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />

            <FormMessage message={message} />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("updatingPassword") : t("updatePassword")}
            </Button>
          </form>
        )}

        {ready && (
          <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">
              {t("backToLogin")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
