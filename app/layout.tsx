import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Decern - Technical Decision Records",
  description: "Il registro delle decisioni tecniche del tuo team",
};

const themeScript = `
(function(){var k='theme';var t=localStorage.getItem(k)||'light';document.documentElement.classList.toggle('dark',t==='dark');})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} suppressHydrationWarning />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
