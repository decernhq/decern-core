/**
 * CI token utilities – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/ci-token.ts.
 */

import { createHash, randomBytes } from "crypto";

export function generateCiToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashCiToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
