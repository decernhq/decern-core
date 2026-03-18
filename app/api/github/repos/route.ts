import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listUserRepos } from "@/lib/github/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: conn } = await supabase
    .from("github_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn?.access_token) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  try {
    const repos = await listUserRepos(conn.access_token);
    const simplified = repos.map((r) => ({
      full_name: r.full_name,
      name: r.name,
      owner: r.owner.login,
      default_branch: r.default_branch,
      private: r.private,
    }));
    return NextResponse.json(simplified);
  } catch (err) {
    console.error("Error listing GitHub repos:", err);
    return NextResponse.json({ error: "Failed to list repos" }, { status: 500 });
  }
}
