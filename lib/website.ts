const DEFAULT_WEBSITE_URL = "https://decern.dev";

/**
 * Public marketing website base URL used by decern-core.
 * Example: https://decern.dev
 */
export function getWebsiteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WEBSITE_URL?.trim();
  if (!configured) return DEFAULT_WEBSITE_URL;
  return configured.replace(/\/+$/, "");
}

/**
 * Build an absolute URL on the marketing website.
 * Example: websitePath("/pricing") -> https://decern.dev/pricing
 */
export function websitePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getWebsiteBaseUrl()}${normalizedPath}`;
}
