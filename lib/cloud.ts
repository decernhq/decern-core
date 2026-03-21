/**
 * Cloud feature detection.
 *
 * The NEXT_PUBLIC_IS_CLOUD env var is set at build time by next.config.mjs
 * based on the available cloud layer (`@decernhq/cloud` package or local cloud/)
 * and self-hosted license gating via DECERN_LICENSE_KEY.
 */
export const IS_CLOUD = process.env.NEXT_PUBLIC_IS_CLOUD === "true";
