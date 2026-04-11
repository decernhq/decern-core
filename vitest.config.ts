import { defineConfig } from "vitest/config";
import { existsSync } from "fs";
import path from "path";

const cloudDir = path.resolve(__dirname, "cloud");
const isCloud = existsSync(cloudDir);

const protocolDir = path.resolve(__dirname, "protocol");
const isProtocol = existsSync(path.resolve(protocolDir, "src/index.ts"));

/**
 * The published @decern/protocol package's compiled dist files use bare imports without
 * .js extensions, which Node ESM (used by vitest) cannot resolve. When the protocol source
 * is available locally (monorepo checkout), alias the package to its TypeScript sources so
 * Vite transforms them on the fly.
 */
const protocolAliases = isProtocol
  ? {
      "@decern/protocol/policies": path.resolve(protocolDir, "src/policies/index.ts"),
      "@decern/protocol/adr": path.resolve(protocolDir, "src/adr/index.ts"),
      "@decern/protocol/models": path.resolve(protocolDir, "src/models/index.ts"),
      "@decern/protocol": path.resolve(protocolDir, "src/index.ts"),
    }
  : {};

const cloudAliases = isCloud
  ? {
      "@/lib/stripe": path.resolve(cloudDir, "lib/stripe.ts"),
      "@/lib/ci-token": path.resolve(cloudDir, "lib/ci-token.ts"),
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
      ...protocolAliases,
      ...cloudAliases,
      "@": path.resolve(__dirname, "./"),
    },
  },
});
