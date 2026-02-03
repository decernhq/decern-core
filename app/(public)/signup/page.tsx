"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage, type Message } from "@/components/ui/form-message";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const nextParam = searchParams.get("next");
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | undefined>();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(undefined);

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Le password non coincidono" });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "La password deve essere di almeno 6 caratteri",
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
        data: { full_name: fullName.trim() || undefined },
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setMessage({
      type: "success",
      text: "Controlla la tua email per confermare la registrazione!",
    });
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-3xl" linkToHome={false} />
          <p className="mt-2 text-gray-600">Crea il tuo account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            id="fullName"
            type="text"
            label="Nome utente"
            placeholder="Mario Rossi"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />

          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="tu@esempio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Almeno 6 caratteri"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            id="confirmPassword"
            type="password"
            label="Conferma password"
            placeholder="Ripeti la password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <FormMessage message={message} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Registrazione in corso..." : "Registrati"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Hai già un account?{" "}
          <Link
            href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
