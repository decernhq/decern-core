import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const settingsUrl = `${appUrl}/dashboard/settings`;

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("github_oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${settingsUrl}?github_error=invalid_state`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}?github_error=not_configured`);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as GitHubTokenResponse;
  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(`${settingsUrl}?github_error=token_exchange_failed`);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?github_error=user_fetch_failed`);
  }

  const ghUser = (await userRes.json()) as GitHubUser;

  const { error } = await supabase.from("github_connections").upsert(
    {
      user_id: user.id,
      github_user_id: ghUser.id,
      github_username: ghUser.login,
      access_token: tokenData.access_token,
      scope: tokenData.scope || "",
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error storing GitHub connection:", error);
    return NextResponse.redirect(`${settingsUrl}?github_error=store_failed`);
  }

  const response = NextResponse.redirect(`${settingsUrl}?github_connected=true`);
  response.cookies.delete("github_oauth_state");
  return response;
}
