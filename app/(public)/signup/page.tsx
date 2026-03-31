"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage, type Message } from "@/components/ui/form-message";
import { USER_ROLES } from "@/lib/constants/roles";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const planParam = searchParams.get("plan");
  const nextParam = searchParams.get("next") ?? (planParam ? `/dashboard?plan=${planParam}` : null);
  const supabase = createClient();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | undefined>();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(undefined);

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: t("passwordsDoNotMatch") });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: t("passwordMinLength"),
      });
      setLoading(false);
      return;
    }

    const redirectUrl =
      nextParam && nextParam.startsWith("/")
        ? `${window.location.origin}${nextParam}`
        : `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim() || undefined,
          role: role.trim() || undefined,
        },
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setMessage({
      type: "success",
      text: t("checkEmail"),
    });
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-3xl" linkToHome={false} />
          <p className="mt-2 text-gray-600">{t("createAccount")}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            id="fullName"
            type="text"
            label={t("fullName")}
            placeholder={t("fullNamePlaceholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />

          <div className="w-full">
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("role")}
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">{t("selectRoleOptional")}</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <Input
            id="email"
            type="email"
            label={tCommon("email")}
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="password"
            type="password"
            label={tCommon("password")}
            placeholder={t("passwordPlaceholderSignup")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            id="confirmPassword"
            type="password"
            label={t("confirmPassword")}
            placeholder={t("confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <FormMessage message={message} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingUp") : t("signUpButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t("alreadyHaveAccount")}{" "}
          <Link
            href={planParam ? `/login?plan=${planParam}` : nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
