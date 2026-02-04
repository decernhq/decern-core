import Link from "next/link";
import { PLANS, type PlanId } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PricingCheckoutButton } from "@/components/pricing-checkout-button";
import { cn } from "@/lib/utils";

const PLAN_ORDER: PlanId[] = ["free", "pro", "ultra", "enterprise"];

export default function PricingPage() {
  const plans = PLAN_ORDER.map((id) => PLANS[id]);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Prezzi semplici e trasparenti
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Scegli il piano più adatto: da Free per provare fino a Ultra per i team.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-white p-6",
              plan.id === "pro"
                ? "border-brand-500 shadow-lg"
                : "border-gray-200"
            )}
          >
            {plan.id === "pro" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-brand-600 px-3 py-0.5 text-xs font-medium text-white">
                  Più popolare
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
                  {plan.price === 0 && plan.id !== "enterprise"
                    ? "€0"
                    : plan.id === "enterprise"
                      ? "—"
                      : `€${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-500 text-sm">/mese</span>
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

            <div className="mt-6">
              {plan.id === "free" ? (
                <Link href="/signup" className="block">
                  <Button variant="outline" className="w-full">
                    Inizia gratis
                  </Button>
                </Link>
              ) : plan.id === "enterprise" ? (
                <a
                  href="mailto:support@decern.app?subject=Enterprise"
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    Contattaci
                  </Button>
                </a>
              ) : (
                <PricingCheckoutButton
                  planId={plan.id as "pro" | "ultra"}
                  planName={plan.name}
                  className={cn(plan.id === "pro" && "bg-brand-600 hover:bg-brand-700")}
                  size="sm"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-gray-500">
        Hai domande?{" "}
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
