import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Decern
        </h1>
        <p className="mt-6 text-xl leading-8 text-gray-600">
          {t("tagline")}
          <br />
          {t("taglineSub")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          {user ? (
            <Link href="/dashboard">
              <Button size="lg">{tNav("enter")}</Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button size="lg">{tNav("signUp")}</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  {tNav("logIn")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="mx-auto mt-24 max-w-5xl px-4">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">{t("feature1Title")}</h3>
            <p className="mt-2 text-sm text-gray-600">{t("feature1Desc")}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">{t("feature2Title")}</h3>
            <p className="mt-2 text-sm text-gray-600">{t("feature2Desc")}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">{t("feature3Title")}</h3>
            <p className="mt-2 text-sm text-gray-600">{t("feature3Desc")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
