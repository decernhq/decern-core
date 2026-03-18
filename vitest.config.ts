import { defineConfig } from "vitest/config";
import { existsSync } from "fs";
import path from "path";

const cloudDir = path.resolve(__dirname, "cloud");
const isCloud = existsSync(cloudDir);

const cloudAliases = isCloud
  ? {
      "@/lib/stripe": path.resolve(cloudDir, "lib/stripe.ts"),
      "@/lib/ci-token": path.resolve(cloudDir, "lib/ci-token.ts"),
      "@/lib/decision-gate-policies": path.resolve(cloudDir, "lib/decision-gate-policies.ts"),
      "@/lib/judge-billing": path.resolve(cloudDir, "lib/judge-billing.ts"),
      "@/lib/judge-pricing": path.resolve(cloudDir, "lib/judge-pricing.ts"),
      "@/lib/judge-usage": path.resolve(cloudDir, "lib/judge-usage.ts"),
      "@/lib/github/client": path.resolve(cloudDir, "lib/github/client.ts"),
      "@/lib/github/sync": path.resolve(cloudDir, "lib/github/sync.ts"),
      "@/lib/github/adr-parser": path.resolve(cloudDir, "lib/github/adr-parser.ts"),
      "@/lib/github/adr-formatter": path.resolve(cloudDir, "lib/github/adr-formatter.ts"),
    }
  : {};

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      ...cloudAliases,
      "@": path.resolve(__dirname, "./"),
    },
  },
});
