import Link from "next/link";
import { PLANS, type PlanId } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const plans = Object.values(PLANS);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Prezzi semplici e trasparenti
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Scegli il piano più adatto alle tue esigenze. Passa al Pro quando sei
          pronto.
        </p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-2xl border bg-white p-8",
              plan.id === "pro"
                ? "border-brand-500 shadow-lg"
                : "border-gray-200"
            )}
          >
            {plan.id === "pro" && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-brand-600 px-4 py-1 text-sm font-medium text-white">
                  Più popolare
                </span>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {plan.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">
                  €{plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-500">/mese</span>
                )}
              </div>
            </div>

            <ul className="mt-8 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-green-500"
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

            <div className="mt-8">
              {plan.id === "free" ? (
                <Link href="/signup" className="block">
                  <Button variant="outline" className="w-full">
                    Inizia gratis
                  </Button>
                </Link>
              ) : (
                <Link href="/signup" className="block">
                  <Button className="w-full">Prova Pro</Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-gray-500">
        Hai domande? Contattaci a{" "}
        <a
          href="mailto:support@decisio.app"
          className="text-brand-600 hover:text-brand-500"
        >
          support@decisio.app
        </a>
      </p>
    </main>
  );
}
