import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const LOCALE_COOKIE = "NEXT_LOCALE";
const DEFAULT_LOCALE = "en";

export type Locale = "en" | "it";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = (store.get(LOCALE_COOKIE)?.value as Locale) || DEFAULT_LOCALE;
  const validLocale = locale === "it" ? "it" : "en";

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
