"use client";

import { useEffect, useRef, useState } from "react";

/* ── accent per step ── */
const accents = [
  { border: "border-l-brand-500 dark:border-l-brand-400", iconBg: "bg-brand-50 dark:bg-brand-950/50", iconText: "text-brand-600 dark:text-brand-400", numBg: "bg-brand-600 dark:bg-brand-500" },
  { border: "border-l-gray-400 dark:border-l-gray-500", iconBg: "bg-gray-100 dark:bg-gray-800/60", iconText: "text-gray-600 dark:text-gray-300", numBg: "bg-gray-500 dark:bg-gray-500" },
  { border: "border-l-amber-500 dark:border-l-amber-400", iconBg: "bg-amber-50 dark:bg-amber-950/50", iconText: "text-amber-600 dark:text-amber-400", numBg: "bg-amber-600 dark:bg-amber-500" },
  { border: "border-l-violet-500 dark:border-l-violet-400", iconBg: "bg-violet-50 dark:bg-violet-950/50", iconText: "text-violet-600 dark:text-violet-400", numBg: "bg-violet-600 dark:bg-violet-500" },
];

/* ── SVG icons ── */
const icons = [
  <svg key="d" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  <svg key="p" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="5" r="2" /><circle cx="17" cy="5" r="2" /><circle cx="12" cy="19" r="2" /><path d="M7 7v5a5 5 0 005 5m5-12v5a5 5 0 01-5 5" /></svg>,
  <svg key="c" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  <svg key="j" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>,
];

export function SolutionFlowAnimation({
  steps,
  stepBodies,
  judgeLabel,
  outcomeLabel,
}: {
  steps: [string, string, string, string];
  stepBodies: [string, string, string, string];
  judgeLabel: string;
  outcomeLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    setActive(0);
    const id = setInterval(() => setActive(s => (s < 3 ? s + 1 : s)), 400);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div ref={ref} className="mx-auto max-w-xl">
      <div className="relative space-y-0">
        {steps.map((title, i) => {
          const a = accents[i]!;
          const revealed = visible && active >= i;
          const isJudge = i === 3;

          return (
            <div
              key={i}
              className={`
                relative border-l-[3px] ${a.border} pl-8 pb-10 last:pb-0
                transition-all duration-600
              `}
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {/* number circle on the line */}
              <span
                className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-4 ring-white dark:ring-gray-950 ${a.numBg}`}
              >
                {i + 1}
              </span>

              {/* card — rounded box, white background */}
              <div
                className={`
                  group rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all duration-300 hover:shadow-md
                  ${isJudge ? "ring-1 ring-violet-200 dark:ring-violet-800/50" : ""}
                `}
              >
                {/* icon + title row */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
                    <span className={a.iconText}>{icons[i]}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                  </h3>
                </div>

                {/* description */}
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {stepBodies[i]}
                </p>

                {/* judge badge */}
                {isJudge && (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/40 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 landing-judge-pulse">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                    {judgeLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* outcome */}
      <div
        className="mt-8 flex items-center justify-center gap-4"
        style={{
          opacity: visible && active >= 3 ? 1 : 0,
          transform: visible && active >= 3 ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
        }}
      >
        <span className="h-px flex-1 max-w-16 bg-gray-200 dark:bg-gray-700" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {outcomeLabel}
        </span>
        <span className="h-px flex-1 max-w-16 bg-gray-200 dark:bg-gray-700" aria-hidden />
      </div>
    </div>
  );
}
