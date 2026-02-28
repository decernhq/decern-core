import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import {
  HiDocumentText,
  HiLink,
  HiCommandLine,
  HiShieldCheck,
  HiEye,
  HiUserGroup,
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

/* ---------- feature data ---------- */

const featureRows = [
  {
    titleKey: "f1Title",
    descKey: "f1Desc",
    Icon: HiDocumentText,
    iconBg: "bg-brand-100 dark:bg-brand-900/40",
    iconText: "text-brand-600 dark:text-brand-400",
  },
  {
    titleKey: "f2Title",
    descKey: "f2Desc",
    Icon: HiLink,
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    iconText: "text-sky-600 dark:text-sky-400",
  },
  {
    titleKey: "f3Title",
    descKey: "f3Desc",
    Icon: HiCommandLine,
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  {
    titleKey: "f4Title",
    descKey: "f4Desc",
    Icon: HiShieldCheck,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
  {
    titleKey: "f5Title",
    descKey: "f5Desc",
    Icon: HiEye,
    iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    iconText: "text-indigo-600 dark:text-indigo-400",
  },
  {
    titleKey: "f6Title",
    descKey: "f6Desc",
    Icon: HiUserGroup,
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconText: "text-rose-600 dark:text-rose-400",
  },
] as const;

const problemAccents = ["bg-brand-500", "bg-amber-500", "bg-rose-500"];

/* ---------- page ---------- */

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("landing");

  const bold = { b: (c: React.ReactNode) => <Bold>{c}</Bold> };
  const boldWhite = {
    b: (c: React.ReactNode) => <BoldWhite>{c}</BoldWhite>,
  };

  return (
    <main className="overflow-x-hidden">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-950 px-4 pb-24 pt-20 sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-36">
        <div
          className="pointer-events-none absolute inset-0 landing-grid-pattern landing-hero-grid-fade"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.12),transparent)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <FadeIn delay={0} duration={600}>
            <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
          </FadeIn>

          <FadeIn delay={80} duration={700}>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl lg:leading-[1.05]">
              <span className="landing-gradient-text">
                {t("hero.headline")}
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={180} duration={700}>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-gray-500 dark:text-gray-400 sm:text-xl">
              {t.rich("hero.subheadline", bold)}
            </p>
          </FadeIn>

          <FadeIn delay={280} duration={600}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {user ? (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-shadow"
                  >
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-shadow"
                    >
                      {t("hero.ctaPrimary")}
                    </Button>
                  </Link>
                  <Link href="#solution">
                    <Button variant="outline" size="lg">
                      {t("hero.ctaSecondary")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </FadeIn>

          <FadeIn delay={400} duration={800}>
            <div className="relative mx-auto mt-20 max-w-2xl">
              <div
                className="pointer-events-none absolute -inset-8 rounded-3xl bg-brand-500/[0.04] blur-2xl dark:bg-brand-400/[0.07]"
                aria-hidden
              />
              <div className="landing-terminal relative overflow-hidden rounded-xl border border-gray-800/80 bg-gray-950 shadow-2xl ring-1 ring-white/[0.05]">
                <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-gray-900/80 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 font-mono text-[11px] text-gray-500">
                    terminal
                  </span>
                </div>
                <div className="px-6 py-5 text-left font-mono text-[13px] leading-7 text-gray-400">
                  <p>
                    <span className="text-gray-500">$</span>{" "}
                    <span className="text-white">npx decern-gate</span>
                  </p>
                  <p className="mt-2 text-amber-400">
                    Policy: decision required —{" "}
                    <span className="text-amber-300 font-medium">YES</span>
                  </p>
                  <p className="text-gray-400">
                    Reason: High-impact patterns matched:{" "}
                    <span className="text-gray-300">
                      package.json, terraform/main.tf
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Matched (high-impact):{" "}
                    <span className="text-gray-300">
                      package.json, terraform/main.tf
                    </span>
                  </p>
                  <p className="mt-2 text-gray-400">
                    References: found 1 ref(s) (decision ID or ADR) —{" "}
                    <span className="text-gray-300">ADR-001</span>
                  </p>
                  <p className="mt-2 text-emerald-400">
                    Decision ADR-001: status Approved.
                  </p>
                  <p className="text-gray-400">Linked PR: yes</p>
                  <p className="mt-2 text-gray-500">
                    Judge: checking diff against decision ADR-001...
                  </p>
                  <p className="text-gray-500">Judge: building diff...</p>
                  <p className="text-gray-500">
                    Judge: analyzing diff (this may take a moment)...
                  </p>
                  <p className="mt-2 text-red-400 font-medium">
                    Gate: blocked — judge: The diff modifies Terraform
                    infrastructure and package.json dependencies; ADR-001 only
                    approves the new API contract. These changes are out of
                    scope.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ PROBLEM ═══════════ */}
      <section
        id="problem"
        className="scroll-mt-20 bg-gray-50/70 dark:bg-gray-900/50 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>{t("problem.eyebrow")}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {t("problem.title")}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-500 dark:text-gray-400">
                {t.rich("problem.intro", bold)}
              </p>
            </div>
          </FadeIn>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {(["example1", "example2", "example3"] as const).map((k, i) => (
              <FadeIn key={k} delay={i * 120}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/40 bg-white dark:bg-gray-900/60 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  <div
                    className={`absolute inset-x-0 top-0 h-0.5 ${problemAccents[i]}`}
                    aria-hidden
                  />
                  <span
                    className="block text-4xl leading-none text-gray-200 dark:text-gray-700 select-none"
                    aria-hidden
                  >
                    &ldquo;
                  </span>
                  <p className="-mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
                    {t(`problem.${k}`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ THE SOLUTION — ADR intro + 4 steps ═══════════ */}
      <section
        id="solution"
        className="scroll-mt-20 bg-white dark:bg-gray-950 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <Eyebrow>{t("solution.eyebrow")}</Eyebrow>
            <p className="mt-4 text-lg leading-relaxed text-gray-500 dark:text-gray-400">
              {t.rich("solution.adrIntro", {
                ...bold,
                a: (chunks: React.ReactNode) => (
                  <a
                    href={t("solution.adrLinkUrl")}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("solution.adrLinkLabel")}
                    className="font-medium text-brand-600 dark:text-brand-400 underline decoration-brand-300/50 underline-offset-2 hover:decoration-brand-500 dark:hover:decoration-brand-400 transition-colors"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </FadeIn>

          <FadeIn className="mt-14 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {t("solution.title")}
            </h2>
          </FadeIn>

          <div className="mt-16">
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

      {/* ═══════════ JUDGE — BYO LLM ═══════════ */}
      <section
        id="judge"
        className="scroll-mt-20 bg-violet-50/30 dark:bg-violet-950/10 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">
          <FadeIn direction="left" distance={20}>
            <div className="space-y-4 lg:mt-0">
              {(["point1", "point2"] as const).map((k) => (
                <div
                  key={k}
                  className="rounded-2xl border border-violet-200/60 dark:border-violet-700/30 bg-white dark:bg-gray-900/60 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <p className="text-[15px] font-medium leading-relaxed text-gray-700 dark:text-gray-200">
                    {t(`judge.${k}`)}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn direction="right" distance={20} delay={200}>
            <div className="mt-10 lg:mt-0">
              <Eyebrow>{t("judge.eyebrow")}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {t("judge.title")}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-500 dark:text-gray-400">
                {t("judge.intro")}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section
        id="features"
        className="scroll-mt-20 bg-gray-50/70 dark:bg-gray-900/50 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("features.eyebrow")}</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("features.title")}
            </h2>
          </FadeIn>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featureRows.map(
              ({ titleKey, descKey, Icon, iconBg, iconText }, i) => (
                <FadeIn key={titleKey} delay={80 * i}>
                  <div className="group h-full rounded-2xl border border-gray-200/80 dark:border-gray-700/40 bg-white dark:bg-gray-900/60 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
                    >
                      <Icon className={`h-5 w-5 ${iconText}`} />
                    </span>
                    <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">
                      {t(`features.${titleKey}`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      {t(`features.${descKey}`)}
                    </p>
                  </div>
                </FadeIn>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ USE CASES ═══════════ */}
      <section
        id="use-cases"
        className="scroll-mt-20 bg-white dark:bg-gray-950 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("useCases.eyebrow")}</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("useCases.title")}
            </h2>
          </FadeIn>

          <div className="mt-16 grid gap-5 sm:grid-cols-2">
            {(
              [
                ["uc1Title", "uc1Desc", "bg-brand-500"],
                ["uc2Title", "uc2Desc", "bg-amber-500"],
                ["uc3Title", "uc3Desc", "bg-emerald-500"],
                ["uc4Title", "uc4Desc", "bg-violet-500"],
              ] as const
            ).map(([titleKey, descKey, accent], i) => (
              <FadeIn key={titleKey} delay={i * 100}>
                <div className="group h-full rounded-2xl border border-gray-200/80 dark:border-gray-700/40 bg-gray-50/70 dark:bg-gray-900/60 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${accent}`}
                    aria-hidden
                  />
                  <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
                    {t(`useCases.${titleKey}`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {t(`useCases.${descKey}`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section
        id="faq"
        className="scroll-mt-20 bg-gray-50/70 dark:bg-gray-900/50 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("faq.title")}
            </h2>
          </FadeIn>

          <div className="mt-12 space-y-3">
            {(["q1", "q2", "q3", "q4", "q5", "q6"] as const).map(
              (qKey, i) => (
                <FadeIn key={qKey} delay={i * 60}>
                  <details className="landing-faq group rounded-xl border border-gray-200/80 dark:border-gray-700/40 bg-white dark:bg-gray-900/60 transition-shadow hover:shadow-sm">
                    <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-base font-semibold text-gray-900 dark:text-gray-100 select-none [&::-webkit-details-marker]:hidden list-none">
                      <span>{t(`faq.${qKey}`)}</span>
                      <svg
                        className="ml-4 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-45"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v12m6-6H6"
                        />
                      </svg>
                    </summary>
                    <div className="px-6 pb-5 leading-relaxed text-gray-500 dark:text-gray-400">
                      {t(`faq.a${i + 1}`)}
                    </div>
                  </details>
                </FadeIn>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="landing-cta-bg relative overflow-hidden px-4 py-24 sm:py-28">
        <div
          className="landing-cta-blob landing-cta-blob-1 absolute -left-[20%] top-1/4"
          aria-hidden
        />
        <div
          className="landing-cta-blob landing-cta-blob-2 absolute -right-[15%] bottom-1/4"
          aria-hidden
        />
        <div
          className="landing-cta-blob landing-cta-blob-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        />
        <div
          className="landing-cta-shine pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div
          className="landing-cta-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.18),transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="landing-cta-title text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
            {t.rich("cta.title", boldWhite)}
          </h2>
          <p className="landing-cta-subline mt-5 text-brand-200/95 sm:text-lg">
            {t("cta.subline")}
          </p>
          <div className="landing-cta-buttons mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
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

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            <Link
              href="/pricing"
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              {t("footer.pricing")}
            </Link>
            <a
              href="mailto:support@decern.app"
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              {t("footer.contact")}
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                {t("footer.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                >
                  {t("footer.logIn")}
                </Link>
                <Link
                  href="/signup"
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
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
