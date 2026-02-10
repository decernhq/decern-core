import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

/* ---------- helpers ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600">
      {children}
    </p>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-gray-900">{children}</strong>;
}
function BoldWhite({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-white">{children}</strong>;
}

/* ---------- page ---------- */

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("landing");

  const bold = { b: (c: React.ReactNode) => <Bold>{c}</Bold> };
  const boldWhite = { b: (c: React.ReactNode) => <BoldWhite>{c}</BoldWhite> };

  return (
    <main>
      {/* ═══════════ HERO ═══════════ */}
      <section className="landing-grid relative overflow-hidden border-b border-gray-200 bg-white px-4 pb-20 pt-16 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
        {/* subtle brand glow */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,165,233,0.08),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <Eyebrow>{t("hero.eyebrow")}</Eyebrow>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl lg:leading-[1.08]">
            {t("hero.headline")}
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            {t.rich("hero.subheadline", bold)}
          </p>

          {/* bullets */}
          <ul className="mx-auto mt-10 max-w-md space-y-2.5 text-left">
            {(["bullet1", "bullet2", "bullet3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-3">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500"
                  aria-hidden
                />
                <span className="text-gray-700">{t(`hero.${k}`)}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg">{t("hero.ctaPrimary")}</Button>
                </Link>
                <Link href="#solution">
                  <Button variant="outline" size="lg">
                    {t("hero.ctaSecondary")}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Terminal mockup */}
          <div className="mx-auto mt-16 max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-gray-950 shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-gray-900 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[11px] text-gray-500">
                terminal
              </span>
            </div>
            <div className="px-5 py-4 text-left font-mono text-[13px] leading-7 text-gray-400">
              <p>
                <span className="text-gray-500">$</span>{" "}
                <span className="text-white">npx decern-gate</span>
              </p>
              <p className="mt-2 text-gray-300">
                Changed files: <span className="text-white">1</span>
              </p>
              <p className="text-amber-400">
                Decision required: <span className="text-amber-300 font-medium">YES</span>
              </p>
              <p className="text-gray-400">
                Reason: High-impact patterns matched:{" "}
                <span className="text-gray-300">terraform/main.tf</span>
              </p>
              <p className="text-gray-400">
                Found decision refs:{" "}
                <span className="text-gray-300">6d33cc96-059a-434d-906d-18443c92b945</span>
              </p>
              <p className="mt-2 text-red-400">
                Validation result: FAIL for 6d33cc96-059a-434d-906d-18443c92b945 — not_approved
                (decision status: <span className="text-amber-400">proposed</span>)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PROBLEM ═══════════ */}
      <section id="problem" className="scroll-mt-20 bg-gray-50 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>{t("problem.eyebrow")}</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t("problem.title")}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            {t.rich("problem.intro", bold)}
          </p>

          <div className="mt-12 space-y-4">
            {(["example1", "example2", "example3"] as const).map((k) => (
              <div
                key={k}
                className="rounded-xl border border-gray-200 border-l-[3px] border-l-brand-500 bg-white p-5 pl-6"
              >
                <p className="italic text-gray-700">
                  &ldquo;{t(`problem.${k}`)}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SOLUTION — timeline ═══════════ */}
      <section
        id="solution"
        className="scroll-mt-20 border-t border-gray-200 bg-white px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-2xl">
          <Eyebrow>{t("solution.eyebrow")}</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t("solution.title")}
          </h2>

          {/* timeline */}
          <div className="relative mt-16 ml-5">
            {/* vertical line pinned to centre of badges */}
            <div
              className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-brand-400 via-brand-200 to-transparent"
              aria-hidden
            />

            <div className="space-y-14">
              {(
                [
                  [1, "step1Title", "step1Body"],
                  [2, "step2Title", "step2Body"],
                  [3, "step3Title", "step3Body"],
                  [4, "step4Title", "step4Body"],
                ] as const
              ).map(([num, titleKey, bodyKey]) => (
                <div key={num} className="relative pl-12">
                  {/* number badge — centred on the line */}
                  <span className="absolute left-0 top-0 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-sm font-bold text-brand-600">
                    {num}
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t(`solution.${titleKey}`)}
                  </h3>
                  <p className="mt-2 leading-relaxed text-gray-600">
                    {t.rich(`solution.${bodyKey}`, bold)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ WHY AI — two-column ═══════════ */}
      <section id="ai" className="scroll-mt-20 bg-gray-50 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">
          <div>
            <Eyebrow>{t("ai.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("ai.title")}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-gray-600">
              {t.rich("ai.intro", bold)}
            </p>
          </div>

          <div className="mt-10 space-y-5 lg:mt-0">
            {(["point1", "point2"] as const).map((k) => (
              <div
                key={k}
                className="rounded-2xl border border-brand-200 bg-brand-50/40 p-6"
              >
                <p className="text-lg font-medium leading-relaxed text-gray-900">
                  {t.rich(`ai.${k}`, bold)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES — bento grid, 8 items ═══════════ */}
      <section
        id="features"
        className="scroll-mt-20 border-t border-gray-200 bg-white px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("features.eyebrow")}</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("features.title")}
            </h2>
          </div>

          {/* 4 × 2 grid — first card spans 2 cols on lg */}
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* hero card */}
            <div className="landing-bento rounded-2xl border border-gray-200 bg-gray-50 p-7 sm:col-span-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                1
              </span>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">
                {t("features.f1Title")}
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                {t("features.f1Desc")}
              </p>
            </div>

            {/* cards 2-7 */}
            {(
              [
                ["f2Title", "f2Desc", 2],
                ["f3Title", "f3Desc", 3],
                ["f4Title", "f4Desc", 4],
                ["f5Title", "f5Desc", 5],
                ["f6Title", "f6Desc", 6],
                ["f7Title", "f7Desc", 7],
              ] as const
            ).map(([titleKey, descKey, num]) => (
              <div
                key={titleKey}
                className="landing-bento rounded-2xl border border-gray-200 bg-gray-50 p-6"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-xs font-semibold text-gray-700">
                  {num}
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">
                  {t(`features.${titleKey}`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {t(`features.${descKey}`)}
                </p>
              </div>
            ))}
          </div>

          {/* Card 8 — full width, highlighted */}
          <div className="landing-bento mt-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-8 text-center sm:px-12">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              8
            </span>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">
              {t("features.f8Title")}
            </h3>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-gray-600">
              {t("features.f8Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ USE CASES ═══════════ */}
      <section id="use-cases" className="scroll-mt-20 bg-gray-50 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("useCases.eyebrow")}</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("useCases.title")}
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {(
              [
                ["uc1Title", "uc1Desc", "bg-brand-500"],
                ["uc2Title", "uc2Desc", "bg-amber-500"],
                ["uc3Title", "uc3Desc", "bg-emerald-500"],
                ["uc4Title", "uc4Desc", "bg-violet-500"],
              ] as const
            ).map(([titleKey, descKey, accent]) => (
              <div
                key={titleKey}
                className="landing-bento group flex gap-5 rounded-2xl border border-gray-200 bg-white p-6"
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${accent}`}
                  aria-hidden
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {t(`useCases.${titleKey}`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {t(`useCases.${descKey}`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST ═══════════ */}
      <section className="border-t border-gray-200 bg-white px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t("trust.eyebrow")}</Eyebrow>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {t("trust.title")}
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-gray-600">
            {t("trust.claim1")}
          </p>
          <p className="mt-3 text-lg leading-relaxed text-gray-600">
            {t("trust.claim2")}
          </p>
          <p className="mt-12 text-sm text-gray-400">
            {t("trust.testimonialPlaceholder")}
          </p>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="scroll-mt-20 bg-gray-50 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t("faq.title")}
          </h2>
          <dl className="mt-12 divide-y divide-gray-200">
            {(["q1", "q2", "q3", "q4", "q5"] as const).map((qKey, i) => (
              <div key={qKey} className="py-8 first:pt-0">
                <dt className="text-base font-semibold text-gray-900">
                  {t(`faq.${qKey}`)}
                </dt>
                <dd className="mt-3 leading-relaxed text-gray-600">
                  {t(`faq.a${i + 1}`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-4 py-24 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
            {t.rich("cta.title", boldWhite)}
          </h2>
          <p className="mt-4 text-brand-200">{t("cta.subline")}</p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-white text-brand-700 hover:bg-gray-100"
                >
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-white text-brand-700 hover:bg-gray-100"
                  >
                    {t("cta.ctaPrimary")}
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    {t("cta.ctaSecondary")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
