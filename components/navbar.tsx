import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "@supabase/supabase-js";
import { websitePath } from "@/lib/website";

interface NavbarProps {
  user?: User | null;
}

export async function Navbar({ user }: NavbarProps) {
  const t = await getTranslations("nav");
  const pricingHref = websitePath("/pricing");

  return (
    <header className="border-b border-app-border bg-app-card">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="flex items-center gap-4">
          <a href={pricingHref}>
            <Button variant="ghost">{t("pricing")}</Button>
          </a>
          <Link href="/docs">
            <Button variant="ghost">{t("docs")}</Button>
          </Link>
          {user ? (
            <Link href="/dashboard">
              <Button>{t("enter")}</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">{t("logIn")}</Button>
              </Link>
              <Link href="/signup">
                <Button>{t("signUp")}</Button>
              </Link>
            </>
          )}
          </span>
        </div>
      </nav>
    </header>
  );
}
