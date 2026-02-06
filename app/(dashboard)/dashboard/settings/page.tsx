import { createClient } from "@/lib/supabase/server";
import { getEffectivePlanId } from "@/lib/billing";
import { getTranslations, getLocale, getMessages } from "next-intl/server";
import { UpgradeButton } from "./upgrade-button";
import { ManageSubscriptionButton } from "./manage-subscription-button";
import { ProfileNameForm } from "./profile-name-form";
import { ProfileRoleForm } from "./profile-role-form";
import { ProfileLocaleForm } from "./profile-locale-form";
import type { PlanId } from "@/types/billing";
import { PLANS } from "@/types/billing";

export default async function SettingsPage() {
  const supabase = await createClient();
  const t = await getTranslations("settings");
  const tCommon = await getTranslations("common");
  const tPricing = await getTranslations("pricing");
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, locale")
    .eq("id", user?.id ?? "")
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  const effectivePlanId = getEffectivePlanId(subscription?.plan_id) as PlanId;
  const currentPlan = PLANS[effectivePlanId] || PLANS.free;
  const isPaid = effectivePlanId === "pro" || effectivePlanId === "ultra";
  const isEnterprise = effectivePlanId === "enterprise";
  const planOverride = process.env.PLAN_OVERRIDE?.trim().toLowerCase();
  const isOverridden = ["free", "pro", "ultra", "enterprise"].includes(planOverride ?? "");

  const tPlans = await getTranslations("plans");
  const planName = tPlans(`${effectivePlanId}.name`);
  const messages = await getMessages();
  const planData = (messages?.plans as Record<string, { features?: string[] }>)?.[effectivePlanId];
  const featuresList = Array.isArray(planData?.features) ? planData.features : currentPlan.features;

  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>

      {/* Account section */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t("account")}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <ProfileNameForm initialFullName={profile?.full_name ?? null} />
          </div>
          <div>
            <ProfileRoleForm initialRole={profile?.role ?? null} />
          </div>
          <div>
            <ProfileLocaleForm initialLocale={profile?.locale ?? null} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{tCommon("email")}</p>
            <p className="mt-1 text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{tCommon("userId")}</p>
            <p className="mt-1 font-mono text-sm text-gray-600">{user?.id}</p>
          </div>
        </div>
      </div>

      {/* Billing section */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t("subscription")}</h2>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{t("plan", { name: planName })}</p>
              <p className="text-sm text-gray-500">
                {currentPlan.price > 0
                  ? `€${currentPlan.price}${tPricing("perMonth")}`
                  : isEnterprise
                    ? tPricing("custom")
                    : tPricing("free")}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                isPaid || isEnterprise
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {isPaid ? tPricing("active") : isEnterprise ? "Enterprise" : tPricing("free")}
            </span>
          </div>

          {isOverridden && (
            <p className="mt-2 text-xs text-amber-700">
              {t("planOverride", { value: planOverride ?? "" })}
            </p>
          )}

          {subscription?.current_period_end && !isOverridden && (
            <p className="mt-3 text-sm text-gray-500">
              {t("renewal")}{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {isPaid ? (
              <ManageSubscriptionButton />
            ) : isEnterprise ? (
              <p className="text-sm text-gray-500">{t("contactSupport")}</p>
            ) : (
              <>
                <UpgradeButton planId="pro" />
                <UpgradeButton planId="ultra" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Plan features */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t("planFeatures")}</h2>
        <ul className="mt-4 space-y-2">
          {featuresList.map((feature) => (
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
