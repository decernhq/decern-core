import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/types/billing";
import { UpgradeButton } from "./upgrade-button";
import { ManageSubscriptionButton } from "./manage-subscription-button";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  const currentPlan = PLANS[subscription?.plan_id as keyof typeof PLANS] || PLANS.free;
  const isPro = subscription?.plan_id === "pro";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
      <p className="mt-1 text-sm text-gray-600">
        Gestisci il tuo account e abbonamento.
      </p>

      {/* Account section */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Account</h2>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="mt-1 text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">ID utente</p>
            <p className="mt-1 font-mono text-sm text-gray-600">{user?.id}</p>
          </div>
        </div>
      </div>

      {/* Billing section */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Abbonamento</h2>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Piano {currentPlan.name}</p>
              <p className="text-sm text-gray-500">
                {isPro
                  ? `€${currentPlan.price}/mese`
                  : "Gratuito"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                isPro
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {isPro ? "Attivo" : "Free"}
            </span>
          </div>

          {subscription?.current_period_end && (
            <p className="mt-3 text-sm text-gray-500">
              Rinnovo:{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(
                "it-IT",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            </p>
          )}

          <div className="mt-6">
            {isPro ? (
              <ManageSubscriptionButton />
            ) : (
              <UpgradeButton />
            )}
          </div>
        </div>
      </div>

      {/* Plan features */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Funzionalità del piano
        </h2>
        <ul className="mt-4 space-y-2">
          {currentPlan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <svg
                className="h-4 w-4 text-green-500"
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
      </div>
    </div>
  );
}
