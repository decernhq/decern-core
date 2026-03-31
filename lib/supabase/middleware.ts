import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Updates the Supabase session and handles auth state in middleware.
 * This ensures the session is refreshed on every request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: unknown }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<NextResponse["cookies"]["set"]>[2])
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    const plan = url.searchParams.get("plan");
    url.pathname = "/login";
    // Preserve plan param so the login→dashboard flow triggers checkout
    const destination = plan
      ? `${request.nextUrl.pathname}?plan=${plan}`
      : request.nextUrl.pathname;
    url.searchParams.set("next", destination);
    url.searchParams.delete("plan");
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")
  ) {
    const url = request.nextUrl.clone();
    const nextPath = url.searchParams.get("next");
    const plan = url.searchParams.get("plan");

    if (nextPath && nextPath.startsWith("/dashboard")) {
      url.pathname = nextPath;
    } else if (plan) {
      url.pathname = "/dashboard";
      url.searchParams.set("plan", plan);
    } else {
      url.pathname = "/dashboard";
    }
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
