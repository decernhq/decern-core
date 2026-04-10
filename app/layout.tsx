import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_COOKIE_NAME, type Theme } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Decern - Technical Decision Records",
  description: "Your team's technical decision register. Document, share and track architectural choices.",
};

const themeScript = `
(function(){var k='theme';var t=localStorage.getItem(k)||'dark';document.documentElement.classList.toggle('dark',t==='dark');if(!document.cookie.match(/(?:^|;\\s*)theme=/)){document.cookie='theme='+t+';path=/;max-age=31536000;SameSite=Lax';}})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const serverTheme: Theme = themeCookie === "light" ? "light" : "dark";

  return (
    <html lang={locale} className={serverTheme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} suppressHydrationWarning />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
