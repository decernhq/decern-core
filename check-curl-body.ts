import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
function loadEnv(p: string) { if (!fs.existsSync(p)) return; for (const l of fs.readFileSync(p, "utf8").split("\n")) { const t = l.trim(); if (!t || t.startsWith("#")) continue; const eq = t.indexOf("="); if (eq > 0) process.env[t.slice(0, eq)] = t.slice(eq + 1); } }
loadEnv("/Users/palaz/decern/.env");
loadEnv("/Users/palaz/decern/decern-gate-demo/qa-demo/.env");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await sb.from("adr_cache").select("id, body, repository_identifier").eq("workspace_id", process.env.ENT_WORKSPACE_ID!).eq("id", "ADR-CURL").maybeSingle();
console.log({ data, error });
