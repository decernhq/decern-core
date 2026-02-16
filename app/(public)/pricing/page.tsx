import Link from "next/link";
import { getTranslations, getMessages } from "next-intl/server";
import { PLANS, type PlanId } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PricingCheckoutButton } from "@/components/pricing-checkout-button";
import { cn } from "@/lib/utils";

const PLAN_ORDER: PlanId[] = ["free", "team", "business", "enterprise", "governance"];

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const messages = await getMessages();
  const plansData = (messages as { plans?: Record<string, { name?: string; description?: string; features?: string[] }> })?.plans;

  const plans = PLAN_ORDER.map((id) => {
    const plan = PLANS[id];
    const pm = plansData?.[id];
    return {
      ...plan,
      name: pm?.name ?? plan.name,
      description: pm?.description ?? plan.description,
      features: pm?.features ?? plan.features,
    };
  });

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-white p-6",
              plan.id === "team"
                ? "border-brand-500 shadow-lg"
                : "border-gray-200"
            )}
          >
            {plan.id === "team" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-brand-600 px-3 py-0.5 text-xs font-medium text-white">
                  {t("mostPopular")}
                </span>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {plan.name}
              </h2>
              <p className="mt-1 text-xs text-gray-500">{plan.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">
                  {plan.price === 0 && plan.id !== "enterprise" && plan.id !== "governance"
                    ? "€0"
                    : plan.id === "enterprise" || plan.id === "governance"
                      ? "—"
                      : `€${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-500 text-sm">{t("perMonth")}</span>
                )}
              </div>
            </div>

            <ul className="mt-6 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
            {(plan.id === "free" || plan.id === "team" || plan.id === "business") && (
              <p className="mt-2 text-xs text-gray-400">* {t("byoLLM")}</p>
            )}

            <div className="mt-6">
              {plan.id === "free" ? (
                <Link href="/signup" className="block">
                  <Button variant="outline" className="w-full">
                    {t("startFree")}
                  </Button>
                </Link>
              ) : plan.id === "enterprise" ? (
                <a
                  href="mailto:support@decern.app?subject=Enterprise"
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    {t("contactUs")}
                  </Button>
                </a>
              ) : plan.id === "governance" ? (
                <a
                  href="mailto:support@decern.app?subject=Governance%20%2F%20On%20Prem"
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    {t("contactUs")}
                  </Button>
                </a>
              ) : (
                <PricingCheckoutButton
                  planId={plan.id as "team" | "business"}
                  planName={plan.name}
                  className={cn(plan.id === "team" && "bg-brand-600 hover:bg-brand-700")}
                  size="sm"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-gray-500">
        {t("questions")}{" "}
        <a
          href="mailto:support@decern.app"
          className="text-brand-600 hover:text-brand-500"
        >
          support@decern.app
        </a>
      </p>
    </main>
  );
}
