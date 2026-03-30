import { existsSync } from "fs";
import { resolve } from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const localCloudDir = resolve("./cloud");
const packageCloudDir = resolve("./node_modules/@decernhq/cloud");
const resolvedCloudDir = existsSync(localCloudDir)
  ? localCloudDir
  : existsSync(packageCloudDir)
    ? packageCloudDir
    : null;
const isCloud = Boolean(resolvedCloudDir);

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" } : {}),
  transpilePackages: ["@decern/protocol", "@decernhq/cloud"],
  env: {
    NEXT_PUBLIC_IS_CLOUD: isCloud ? "true" : "false",
  },
  experimental: {
    // serverActions are stable in Next.js 14
  },
  webpack: (config) => {
    if (isCloud && resolvedCloudDir) {
      const root = resolve(".");
      const cloudMap = {
        "lib/stripe": "lib/stripe.ts",
        "lib/ci-token": "lib/ci-token.ts",
        "lib/decision-gate-policies": "lib/decision-gate-policies.ts",
        "lib/judge-billing": "lib/judge-billing.ts",
        "lib/judge-pricing": "lib/judge-pricing.ts",
        "lib/judge-usage": "lib/judge-usage.ts",
        "lib/github/client": "lib/github/client.ts",
        "lib/github/sync": "lib/github/sync.ts",
        "lib/github/adr-parser": "lib/github/adr-parser.ts",
        "lib/github/adr-formatter": "lib/github/adr-formatter.ts",
        "components/pricing-checkout-button": "components/pricing-checkout-button.tsx",
        "components/dashboard/github-connect-section": "components/dashboard/github-connect-section.tsx",
        "components/dashboard/workspace-ci-token-section": "components/dashboard/workspace-ci-token-section.tsx",
        "components/dashboard/workspace-policies-form": "components/dashboard/workspace-policies-form.tsx",
        "components/projects/github-repo-selector": "components/projects/github-repo-selector.tsx",
        "app/(dashboard)/dashboard/settings/upgrade-button": "app/(dashboard)/dashboard/settings/upgrade-button.tsx",
        "app/(dashboard)/dashboard/settings/manage-subscription-button": "app/(dashboard)/dashboard/settings/manage-subscription-button.tsx",
      };

      const cloudAliases = {};
      for (const [stub, cloud] of Object.entries(cloudMap)) {
        const cloudAbsolute = resolve(resolvedCloudDir, cloud);
        cloudAliases[`@/${stub}$`] = cloudAbsolute;
        cloudAliases[resolve(root, stub)] = cloudAbsolute;
      }

      config.resolve.alias = {
        ...cloudAliases,
        ...config.resolve.alias,
        // Fallback: cloud components import @/components/ui/button, @/lib/utils etc.
        // back into core. When cloud is in node_modules the tsconfig @/ alias
        // doesn't apply, so we add an explicit webpack alias to the project root.
        "@/": resolve(".") + "/",
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
