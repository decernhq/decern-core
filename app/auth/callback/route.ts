import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Send welcome email for newly confirmed users (created within the last 10 minutes)
      const user = data.user;
      if (user?.created_at) {
        const createdAt = new Date(user.created_at).getTime();
        const now = Date.now();
        const isNewUser = now - createdAt < 10 * 60 * 1000;

        if (isNewUser && user.email) {
          sendWelcomeEmail(
            user.email,
            user.user_metadata?.full_name
          ).catch((err) => console.error("Welcome email failed:", err));
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
