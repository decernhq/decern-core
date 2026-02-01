import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  linkToHome?: boolean;
}

export function Logo({ className, linkToHome = true }: LogoProps) {
  const content = (
    <span
      className={cn(
        "text-2xl font-bold tracking-tight text-brand-600",
        className
      )}
    >
      Decisio
    </span>
  );

  if (linkToHome) {
    return <Link href="/">{content}</Link>;
  }

  return content;
}
