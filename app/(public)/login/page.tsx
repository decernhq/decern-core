"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage, type Message } from "@/components/ui/form-message";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const next = searchParams.get("next") ?? (planParam ? `/dashboard?plan=${planParam}` : null);
  const supabase = createClient();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | undefined>();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(undefined);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    router.push(safeNext);
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-3xl" linkToHome={false} />
          <p className="mt-2 text-gray-600">{t("loginSubtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex justify-end">
            <Link
              href="/login/forgot-password"
              className="text-sm font-medium text-brand-600 hover:text-brand-500"
            >
              {t("forgotPassword")}
            </Link>
          </div>

          <FormMessage message={message} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t("noAccount")}{" "}
          <Link href={planParam ? `/signup?plan=${planParam}` : "/signup"} className="font-medium text-brand-600 hover:text-brand-500">
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
