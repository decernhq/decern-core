import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import {
  HiCommandLine,
  HiShieldCheck,
  HiEye,
} from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { SolutionFlowAnimation } from "@/components/landing/solution-flow-animation";
import { FadeIn } from "@/components/landing/fade-in";

/* ---------- helpers ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-brand-500 dark:text-brand-400">
      {children}
    </p>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">
      {children}
    </strong>
  );
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
  const plansT = await getTranslations("plans");

  const bold = { b: (c: React.ReactNode) => <Bold>{c}</Bold> };
  const boldWhite = {
    b: (c: React.ReactNode) => <BoldWhite>{c}</BoldWhite>,
  };

  return (
    <main className="overflow-x-hidden bg-white dark:bg-gray-950">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:pb-28 sm:pt-20 lg:pb-20">
        <div
          className="pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-brand-400/20 blur-[110px] dark:bg-brand-500/20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-violet-400/15 blur-[110px] dark:bg-violet-500/20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 landing-grid-pattern landing-hero-grid-fade"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.03fr] lg:items-center">
            <div>
              <FadeIn delay={0} duration={600}>
                <span className="inline-flex items-center rounded-full border border-brand-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 shadow-sm backdrop-blur dark:border-brand-700/40 dark:bg-gray-900/60 dark:text-brand-300">
                  {t("hero.eyebrow")}
                </span>
              </FadeIn>

              <FadeIn delay={90} duration={700}>
                <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-[4.2rem] lg:leading-[1.05]">
                  <span className="landing-gradient-text">
                    {t("hero.headline")}
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={170} duration={700}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-300 sm:text-xl">
                  {t.rich("hero.subheadline", bold)}
                </p>
              </FadeIn>

              <FadeIn delay={250} duration={650}>
                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  {user ? (
                    <Link href="/dashboard">
                      <Button
                        size="lg"
                        className="h-12 rounded-xl px-7 shadow-lg shadow-brand-500/20"
                      >
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup">
                        <Button
                          size="lg"
                          className="h-12 rounded-xl px-7 shadow-lg shadow-brand-500/20"
                        >
                          {t("hero.ctaPrimary")}
                        </Button>
                      </Link>
                      <a href="mailto:support@decern.app?subject=Decern%20Demo">
                        <Button variant="outline" size="lg" className="h-12 rounded-xl px-7">
                          {t("hero.ctaSecondary")}
                        </Button>
                      </a>
                    </>
                  )}
                </div>
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  {t.rich("hero.ctaMicrocopy", { br: () => <br /> })}
                </p>
              </FadeIn>
            </div>

            {/* Terminal demo */}
            <FadeIn delay={320} duration={850} direction="right" distance={28}>
              <div className="relative">
                <div
                  className="pointer-events-none absolute -inset-5 rounded-[28px] bg-gradient-to-br from-brand-500/15 via-violet-400/5 to-transparent blur-2xl"
                  aria-hidden
                />

                <div className="landing-terminal relative overflow-hidden rounded-2xl border border-gray-200/70 bg-gray-950 shadow-[0_30px_90px_-34px_rgba(15,23,42,0.7)] dark:border-white/10">
                  <div className="flex items-center justify-between border-b border-white/[0.08] bg-gray-900/90 px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                      <span className="ml-3 font-mono text-[11px] text-gray-500">
                        decern-gate
                      </span>
                    </div>
                  </div>

                  <div className="px-5 py-4 font-mono text-[13px] leading-7 text-gray-400 sm:px-6">
                    <p>
                      <span className="text-gray-600">$</span>{" "}
                      <span className="text-white">npx decern-gate</span>
                    </p>
                    <p className="mt-2 text-amber-400">
                      Policy: decision required —{" "}
                      <span className="font-medium text-amber-300">YES</span>
                    </p>
                    <p>
                      Matched:{" "}
                      <span className="text-gray-300">
                        package.json, terraform/main.tf
                      </span>
                    </p>
                    <p className="mt-2">
                      Ref: ADR-001 —{" "}
                      <span className="text-emerald-400">Approved</span>
                    </p>
                    <p className="mt-2 text-gray-600">
                      Judge: analyzing scope alignment...
                    </p>
                    <p className="mt-2 font-medium text-red-400">
                      Blocked — changes are out of decision scope.
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ INTEGRATIONS ═══ */}
      <section className="border-y border-gray-200/70 bg-gray-50/70 px-4 py-10 dark:border-gray-800/80 dark:bg-gray-900/40">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            {t("integrations.label")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-semibold text-gray-400 dark:text-gray-500">
            {(["i1", "i2", "i3", "i4", "i5"] as const).map((k) => (
              <span key={k}>{t(`integrations.${k}`)}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VALUE: WITHOUT / WITH ═══ */}
      <section id="value" className="scroll-mt-20 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow>{t("value.eyebrow")}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {t.rich("value.title", { br: () => <br /> })}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                {t("value.subtitle")}
              </p>
            </div>
          </FadeIn>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <FadeIn>
              <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-700/50 dark:bg-gray-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  {t("value.painTitle")}
                </p>
                <div className="mt-5 space-y-3">
                  {(["pain1", "pain2", "pain3"] as const).map((k) => (
                    <p
                      key={k}
                      className="rounded-lg border-l-2 border-rose-400 bg-gray-50/80 py-3 pl-4 pr-3 text-sm leading-relaxed text-gray-600 dark:bg-gray-900/40 dark:text-gray-300"
                    >
                      {t(`value.${k}`)}
                    </p>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <div className="h-full rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-6 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  {t("value.gainTitle")}
                </p>
                <div className="mt-5 space-y-3">
                  {(["gain1", "gain2", "gain3"] as const).map((k) => (
                    <p
                      key={k}
                      className="rounded-lg border-l-2 border-emerald-400 bg-white/80 py-3 pl-4 pr-3 text-sm leading-relaxed text-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
                    >
                      {t(`value.${k}`)}
                    </p>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section
        id="solution"
        className="scroll-mt-20 border-y border-gray-200/70 bg-gray-50/70 px-4 py-24 dark:border-gray-800/80 dark:bg-gray-900/40 sm:py-28"
      >
        <div className="mx-auto max-w-3xl">
          <FadeIn className="text-center">
            <Eyebrow>{t("solution.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t.rich("solution.title", { br: () => <br /> })}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t("solution.subtitle")}
            </p>
          </FadeIn>

          <div className="mt-14">
            <SolutionFlowAnimation
              steps={[
                t("solution.step1Title"),
                t("solution.step2Title"),
                t("solution.step3Title"),
                t("solution.step4Title"),
              ]}
              stepBodies={[
                t("solution.flowStep1Desc"),
                t("solution.flowStep2Desc"),
                t("solution.flowStep3Desc"),
                t("solution.flowStep4Desc"),
              ]}
              judgeLabel={t("solution.flowJudgeLabel")}
              outcomeLabel={t("solution.flowOutcome")}
            />
          </div>
        </div>
      </section>

      {/* ═══ BUYERS ═══ */}
      <section id="buyers" className="scroll-mt-20 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center">
            <Eyebrow>{t("buyers.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("buyers.title")}
            </h2>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {(
              [
                ["b1Role", "b1Pain", "b1Outcome"],
                ["b2Role", "b2Pain", "b2Outcome"],
                ["b3Role", "b3Pain", "b3Outcome"],
                ["b4Role", "b4Pain", "b4Outcome"],
              ] as const
            ).map(([role, pain, outcome], i) => (
              <FadeIn key={role} delay={80 * i}>
                <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-900/60">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {t(`buyers.${role}`)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {t(`buyers.${pain}`)}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-brand-700 dark:text-brand-300">
                    {t(`buyers.${outcome}`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST ═══ */}
      <section
        id="trust"
        className="scroll-mt-20 border-y border-gray-200/70 bg-gray-50/70 px-4 py-24 dark:border-gray-800/80 dark:bg-gray-900/40 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center">
            <Eyebrow>{t("trust.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("trust.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t("trust.intro")}
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {(["t1", "t2", "t3"] as const).map((k, i) => (
              <FadeIn key={k} delay={80 * i}>
                <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-900/60">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {t(`trust.${k}Title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {t(`trust.${k}Desc`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3 HERO FEATURES ═══ */}
      <section id="features" className="scroll-mt-20 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center">
            <Eyebrow>{t("features.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t.rich("features.title", { mbr: () => <br className="sm:hidden" /> })}
            </h2>
          </FadeIn>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {(
              [
                [HiCommandLine, "bg-amber-100 dark:bg-amber-900/40", "text-amber-600 dark:text-amber-400", "feat1Title", "feat1Desc"],
                [HiShieldCheck, "bg-emerald-100 dark:bg-emerald-900/40", "text-emerald-600 dark:text-emerald-400", "feat2Title", "feat2Desc"],
                [HiEye, "bg-indigo-100 dark:bg-indigo-900/40", "text-indigo-600 dark:text-indigo-400", "feat3Title", "feat3Desc"],
              ] as const
            ).map(([Icon, iconBg, iconText, titleKey, descKey], i) => (
              <FadeIn key={titleKey} delay={80 * i}>
                <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-900/60">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${iconText}`} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                    {t(`features.${titleKey}`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {t(`features.${descKey}`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING TEASER ═══ */}
      <section
        id="pricing-teaser"
        className="scroll-mt-20 border-y border-gray-200/70 bg-gray-50/70 px-4 py-24 dark:border-gray-800/80 dark:bg-gray-900/40 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center">
            <Eyebrow>{t("pricingTeaser.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("pricingTeaser.title")}
            </h2>
          </FadeIn>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {(
              [
                ["free", "freeDesc"],
                ["team", "teamDesc"],
                ["business", "businessDesc"],
              ] as const
            ).map(([plan, descKey], i) => (
              <FadeIn key={plan} delay={80 * i}>
                <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-900/60">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {plansT(`${plan}.name`)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {plansT(`${plan}.description`)}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {t(`pricingTeaser.${descKey}`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/pricing">
              <Button size="lg">{t("pricingTeaser.ctaPrimary")}</Button>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="scroll-mt-20 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("faq.title")}
            </h2>
          </FadeIn>

          <div className="mt-12 space-y-3">
            {(["q1", "q2", "q3", "q4"] as const).map((qKey, i) => (
              <FadeIn key={qKey} delay={50 * i}>
                <details className="landing-faq group rounded-xl border border-gray-200/80 bg-white transition-all hover:shadow-sm open:shadow-sm dark:border-gray-700/50 dark:bg-gray-900/60">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-gray-900 select-none [&::-webkit-details-marker]:hidden dark:text-gray-100">
                    <span>{t(`faq.${qKey}`)}</span>
                    <svg
                      className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-45"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5 leading-relaxed text-gray-500 dark:text-gray-400">
                    {t(`faq.a${i + 1}`)}
                  </div>
                </details>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="landing-cta-bg relative overflow-hidden px-4 py-28 sm:py-36">
        <div className="landing-cta-horizon" aria-hidden />
        <div className="landing-cta-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="landing-cta-blob landing-cta-blob-1 absolute -left-[20%] top-1/4" aria-hidden />
        <div className="landing-cta-blob landing-cta-blob-2 absolute -right-[15%] bottom-1/4" aria-hidden />
        <div
          className="landing-cta-blob landing-cta-blob-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        />
        <div className="landing-cta-shine pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="landing-cta-glow pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="landing-cta-title text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t.rich("cta.title", {
              ...boldWhite,
              br: () => <br />,
            })}
          </h2>
          <p className="landing-cta-subline mt-6 text-lg text-gray-400 sm:text-xl">
            {t.rich("cta.subline", { br: () => <br /> })}
          </p>
          <div className="landing-cta-buttons mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/10"
                >
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/10"
                  >
                    {t("cta.ctaPrimary")}
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    {t("cta.ctaSecondary")}
                  </Button>
                </Link>
              </>
            )}
          </div>
          <p className="landing-cta-subline mt-4 text-sm text-gray-500">
            {t.rich("cta.microcopy", { br: () => <br /> })}
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-12 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            <Link
              href="/pricing"
              className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {t("footer.pricing")}
            </Link>
            <a
              href="mailto:support@decern.app"
              className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {t("footer.contact")}
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                {t("footer.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {t("footer.logIn")}
                </Link>
                <Link
                  href="/signup"
                  className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {t("footer.signUp")}
                </Link>
              </>
            )}
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("footer.copyright")}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t("footer.builtBy")}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
