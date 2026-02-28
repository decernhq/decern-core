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
    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
      {children}
    </p>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>;
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
    <main className="overflow-x-hidden">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 pb-20 pt-16 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
        {/* Grid layer: visible at top, fades out toward bottom */}
        <div className="pointer-events-none absolute inset-0 landing-grid-pattern landing-hero-grid-fade" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,165,233,0.08),transparent)] dark:bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,165,233,0.15),transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-4xl text-center">
          <FadeIn delay={0} duration={600}>
            <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
          </FadeIn>

          <FadeIn delay={80} duration={700}>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-7xl lg:leading-[1.08]">
              {t("hero.headline")}
            </h1>
          </FadeIn>

          <FadeIn delay={180} duration={700}>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400 sm:text-xl">
              {t.rich("hero.subheadline", bold)}
            </p>
          </FadeIn>

          <FadeIn delay={280} duration={600}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
          </FadeIn>

          <FadeIn delay={400} duration={800}>
            <div className="landing-terminal mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-950 shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-gray-900 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-[11px] text-gray-500">terminal</span>
              </div>
              <div className="px-6 py-5 text-left font-mono text-[13px] leading-7 text-gray-400">
                <p><span className="text-gray-500">$</span> <span className="text-white">npx decern-gate</span></p>
                <p className="mt-2 text-amber-400">Policy: decision required — <span className="text-amber-300 font-medium">YES</span></p>
                <p className="text-gray-400">Reason: High-impact patterns matched: <span className="text-gray-300">package.json, terraform/main.tf</span></p>
                <p className="text-gray-400">Matched (high-impact): <span className="text-gray-300">package.json, terraform/main.tf</span></p>
                <p className="mt-2 text-gray-400">References: found 1 ref(s) (decision ID or ADR) — <span className="text-gray-300">ADR-001</span></p>
                <p className="mt-2 text-emerald-400">Decision ADR-001: status Approved.</p>
                <p className="text-gray-400">Linked PR: yes</p>
                <p className="mt-2 text-gray-500">Judge: checking diff against decision ADR-001...</p>
                <p className="text-gray-500">Judge: building diff...</p>
                <p className="text-gray-500">Judge: analyzing diff (this may take a moment)...</p>
                <p className="mt-2 text-red-400 font-medium">
                  Gate: blocked — judge: The diff modifies Terraform infrastructure and
                  package.json dependencies; ADR-001 only approves the new API contract.
                  These changes are out of scope.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ PROBLEM ═══════════ */}
      <section id="problem" className="scroll-mt-20 bg-gray-50 dark:bg-gray-900 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <Eyebrow>{t("problem.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("problem.title")}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              {t.rich("problem.intro", bold)}
            </p>
          </FadeIn>

          <div className="mt-12 space-y-4">
            {(["example1", "example2", "example3"] as const).map((k, i) => (
              <FadeIn key={k} delay={i * 120} direction="left" distance={16}>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 border-l-[3px] border-l-brand-500 dark:border-l-brand-400 bg-white dark:bg-gray-800/50 p-5 pl-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <p className="italic text-gray-700 dark:text-gray-300">
                    &ldquo;{t(`problem.${k}`)}&rdquo;
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
        className="scroll-mt-20 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <Eyebrow>{t("solution.eyebrow")}</Eyebrow>
            <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              {t.rich("solution.adrIntro", {
                ...bold,
                a: (chunks: React.ReactNode) => (
                  <a
                    href={t("solution.adrLinkUrl")}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("solution.adrLinkLabel")}
                    className="font-medium text-brand-600 dark:text-brand-400 underline decoration-brand-400/50 hover:decoration-brand-500 dark:hover:decoration-brand-400"
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

      {/* ═══════════ YOUR MODEL — Judge / LLM ═══════════ */}
      <section id="judge" className="scroll-mt-20 bg-gray-50 dark:bg-gray-900 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">
          <FadeIn direction="left" distance={20}>
            <div className="mt-10 space-y-5 lg:mt-0">
              {(["point1", "point2"] as const).map((k) => (
                <div
                  key={k}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <p className="text-lg font-medium leading-relaxed text-gray-900 dark:text-gray-100">
                    {t(`judge.${k}`)}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn direction="right" distance={20} delay={200}>
            <div>
              <Eyebrow>{t("judge.eyebrow")}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {t("judge.title")}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                {t("judge.intro")}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ FEATURES — bento grid ═══════════ */}
      <section
        id="features"
        className="scroll-mt-20 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-24 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("features.eyebrow")}</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("features.title")}
            </h2>
          </FadeIn>

          {/* 6 features in 2 columns, reading order: 1,2 | 3,4 | 5,6 */}
          <div className="mt-16 grid gap-5 sm:grid-cols-2">
            {(
              [
                ["f1Title", "f1Desc", 1, "border-brand-200 dark:border-brand-700/50", "bg-brand-50/50 dark:bg-brand-950/30", "bg-brand-600 dark:bg-brand-500", "text-brand-700 dark:text-brand-300", HiDocumentText],
                ["f2Title", "f2Desc", 2, "border-sky-200 dark:border-sky-800/50", "bg-sky-50/60 dark:bg-sky-950/30", "bg-sky-600 dark:bg-sky-500", "text-sky-700 dark:text-sky-300", HiLink],
                ["f3Title", "f3Desc", 3, "border-amber-200 dark:border-amber-800/50", "bg-amber-50/50 dark:bg-amber-950/30", "bg-amber-600 dark:bg-amber-500", "text-amber-700 dark:text-amber-300", HiCommandLine],
                ["f4Title", "f4Desc", 4, "border-emerald-200 dark:border-emerald-800/50", "bg-emerald-50/50 dark:bg-emerald-950/30", "bg-emerald-600 dark:bg-emerald-500", "text-emerald-700 dark:text-emerald-300", HiShieldCheck],
                ["f5Title", "f5Desc", 5, "border-indigo-200 dark:border-indigo-800/50", "bg-indigo-50/50 dark:bg-indigo-950/30", "bg-indigo-600 dark:bg-indigo-500", "text-indigo-700 dark:text-indigo-300", HiEye],
                ["f6Title", "f6Desc", 6, "border-rose-200 dark:border-rose-800/50", "bg-rose-50/50 dark:bg-rose-950/30", "bg-rose-600 dark:bg-rose-500", "text-rose-700 dark:text-rose-300", HiUserGroup],
              ] as const
            ).map(([titleKey, descKey, num, borderCls, bgCls, badgeCls, numTextCls, Icon], i) => (
              <FadeIn key={titleKey} delay={80 * i}>
                <div className={`landing-bento h-full rounded-2xl border ${borderCls} ${bgCls} p-6`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${badgeCls} text-white`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-white/60 dark:bg-black/20 text-[10px] font-bold ${numTextCls}`}>{num}</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">{t(`features.${titleKey}`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{t(`features.${descKey}`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ USE CASES ═══════════ */}
      <section id="use-cases" className="scroll-mt-20 bg-gray-50 dark:bg-gray-900 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("useCases.eyebrow")}</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("useCases.title")}
            </h2>
          </FadeIn>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {(
              [
                ["uc1Title", "uc1Desc", "bg-brand-500"],
                ["uc2Title", "uc2Desc", "bg-amber-500"],
                ["uc3Title", "uc3Desc", "bg-emerald-500"],
                ["uc4Title", "uc4Desc", "bg-violet-500"],
              ] as const
            ).map(([titleKey, descKey, accent], i) => (
              <FadeIn key={titleKey} delay={i * 100}>
                <div className="landing-bento group flex h-full gap-5 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50 p-6">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${accent}`} aria-hidden />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t(`useCases.${titleKey}`)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{t(`useCases.${descKey}`)}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="scroll-mt-20 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("faq.title")}
            </h2>
          </FadeIn>
          <dl className="mt-12 divide-y divide-gray-200 dark:divide-gray-700/60">
            {(["q1", "q2", "q3", "q4", "q5", "q6"] as const).map((qKey, i) => (
              <FadeIn key={qKey} delay={i * 80}>
                <div className="py-8 first:pt-0">
                  <dt className="text-base font-semibold text-gray-900 dark:text-gray-100">{t(`faq.${qKey}`)}</dt>
                  <dd className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">{t(`faq.a${i + 1}`)}</dd>
                </div>
              </FadeIn>
            ))}
          </dl>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="landing-cta-bg relative overflow-hidden px-4 py-24 sm:py-28">
        <div className="landing-cta-blob landing-cta-blob-1 absolute -left-[20%] top-1/4" aria-hidden />
        <div className="landing-cta-blob landing-cta-blob-2 absolute -right-[15%] bottom-1/4" aria-hidden />
        <div className="landing-cta-blob landing-cta-blob-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="landing-cta-shine pointer-events-none absolute inset-0" aria-hidden />
        <div className="landing-cta-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.18),transparent_60%)]" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="landing-cta-title text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
            {t.rich("cta.title", boldWhite)}
          </h2>
          <p className="landing-cta-subline mt-5 text-brand-200/95 sm:text-lg">{t("cta.subline")}</p>
          <div className="landing-cta-buttons mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-brand-700 hover:bg-gray-100">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-brand-700 hover:bg-gray-100">{t("cta.ctaPrimary")}</Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">{t("cta.ctaSecondary")}</Button>
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
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">{t("footer.pricing")}</Link>
            <a href="mailto:support@decern.app" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">{t("footer.contact")}</a>
            {user ? (
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">{t("footer.dashboard")}</Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">{t("footer.logIn")}</Link>
                <Link href="/signup" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">{t("footer.signUp")}</Link>
              </>
            )}
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("footer.copyright")}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t("footer.builtBy")}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
