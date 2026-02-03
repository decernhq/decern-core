import Link from "next/link";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "@supabase/supabase-js";

interface NavbarProps {
  user?: User | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="border-b border-app-border bg-app-card">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="flex items-center gap-4">
          <Link href="/pricing">
            <Button variant="ghost">Prezzi</Button>
          </Link>
          {user ? (
            <Link href="/dashboard">
              <Button>Entra</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
          </span>
        </div>
      </nav>
    </header>
  );
}
