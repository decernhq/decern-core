import { existsSync } from "fs";
import { resolve } from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const cloudDir = resolve("./cloud");
const selfHostedEnv = process.env.NEXT_PUBLIC_SELF_HOSTED === "true";
const isCloud = !selfHostedEnv && existsSync(cloudDir);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_IS_CLOUD: isCloud ? "true" : "false",
  },
  experimental: {
    // serverActions are stable in Next.js 14
  },
  webpack: (config) => {
    if (isCloud) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Lib aliases – cloud implementations override stubs
        "@/lib/stripe$": resolve(cloudDir, "lib/stripe.ts"),
        "@/lib/ci-token$": resolve(cloudDir, "lib/ci-token.ts"),
        "@/lib/decision-gate-policies$": resolve(cloudDir, "lib/decision-gate-policies.ts"),
        "@/lib/judge-billing$": resolve(cloudDir, "lib/judge-billing.ts"),
        "@/lib/judge-pricing$": resolve(cloudDir, "lib/judge-pricing.ts"),
        "@/lib/judge-usage$": resolve(cloudDir, "lib/judge-usage.ts"),
        "@/lib/github/client$": resolve(cloudDir, "lib/github/client.ts"),
        "@/lib/github/sync$": resolve(cloudDir, "lib/github/sync.ts"),
        "@/lib/github/adr-parser$": resolve(cloudDir, "lib/github/adr-parser.ts"),
        "@/lib/github/adr-formatter$": resolve(cloudDir, "lib/github/adr-formatter.ts"),
        // Component aliases
        "@/components/pricing-checkout-button$": resolve(cloudDir, "components/pricing-checkout-button.tsx"),
        "@/components/dashboard/github-connect-section$": resolve(cloudDir, "components/dashboard/github-connect-section.tsx"),
        "@/components/dashboard/workspace-ci-token-section$": resolve(cloudDir, "components/dashboard/workspace-ci-token-section.tsx"),
        "@/components/dashboard/workspace-policies-form$": resolve(cloudDir, "components/dashboard/workspace-policies-form.tsx"),
        "@/components/projects/github-repo-selector$": resolve(cloudDir, "components/projects/github-repo-selector.tsx"),
        // Page component aliases
        "@/app/(dashboard)/dashboard/settings/upgrade-button$": resolve(cloudDir, "app/(dashboard)/dashboard/settings/upgrade-button.tsx"),
        "@/app/(dashboard)/dashboard/settings/manage-subscription-button$": resolve(cloudDir, "app/(dashboard)/dashboard/settings/manage-subscription-button.tsx"),
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
