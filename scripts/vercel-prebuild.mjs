#!/usr/bin/env node
/**
 * Runs before `next build` on Vercel (and locally).
 *
 * If DECERN_CLOUD_CLONE_TOKEN is set: shallow-clones the private cloud repo into cloud/
 * and runs cloud/setup.sh to generate API route proxy files.
 *
 * Else if cloud/ already exists (local dev): runs setup.sh only.
 *
 * Otherwise: OSS-only build (no Stripe / Decision Gate / GitHub API routes).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
process.chdir(root);

const TOKEN = process.env.DECERN_CLOUD_CLONE_TOKEN?.trim();
const REPO =
  process.env.DECERN_CLOUD_REPO_URL?.trim() ||
  "";

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", shell: true, ...opts });
}

if (TOKEN) {
  if (!REPO) {
    console.error("[vercel-prebuild] DECERN_CLOUD_CLONE_TOKEN is set but DECERN_CLOUD_REPO_URL is missing.");
    process.exit(1);
  }
  const enc = encodeURIComponent(TOKEN);
  const authed = REPO.replace(/^https:\/\//, `https://x-access-token:${enc}@`);
  const cloudPath = path.join(root, "cloud");
  if (fs.existsSync(cloudPath)) {
    fs.rmSync(cloudPath, { recursive: true, force: true });
  }
  console.log("[vercel-prebuild] Cloning private cloud repo…");
  run(`git clone --depth 1 "${authed}" cloud`);
  console.log("[vercel-prebuild] Creating API route proxies…");
  run("bash cloud/setup.sh");
} else if (fs.existsSync(path.join(root, "cloud", "setup.sh"))) {
  console.log("[vercel-prebuild] Using local cloud/ + route proxies…");
  run("bash cloud/setup.sh");
} else {
  console.log(
    "[vercel-prebuild] No cloud layer. Set DECERN_CLOUD_CLONE_TOKEN on Vercel for full production build."
  );
}
