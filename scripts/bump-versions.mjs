#!/usr/bin/env node
/**
 * Bump patch versions for gate, cloud, protocol and align decern-core package.json.
 *
 * For gate/cloud/protocol: bump package.json → git add/commit/push → npm publish.
 *   - protocol, gate: runs `npm login` (interactive) then `npm publish`
 *   - cloud:          pauses so you can paste the npm token, then `npm publish`
 * For decern-core: only updates package.json (left in working tree, NOT committed).
 *
 * Usage:
 *   node scripts/bump-versions.mjs               # bump + commit/push + publish
 *   node scripts/bump-versions.mjs --dry-run     # show what would change, no write
 *   node scripts/bump-versions.mjs --no-git      # skip git AND publish
 *   node scripts/bump-versions.mjs --no-publish  # commit/push but skip publish
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const dryRun = process.argv.includes("--dry-run");
const noGit = process.argv.includes("--no-git");
// --no-git implies --no-publish, since publish runs after push.
const noPublish = noGit || process.argv.includes("--no-publish");

/**
 * Sub-packages to bump.
 *   coreKey:     key used in decern-core package.json
 *   publishMode: "login" = run `npm login` then publish
 *                "token" = pause so user can paste an NPM_TOKEN, then publish
 */
const targets = [
  { name: "protocol", dir: "protocol", coreKey: "@decern/protocol", publishMode: "login" },
  { name: "cloud",    dir: "cloud",    coreKey: "@decernhq/cloud",  publishMode: "token" },
  { name: "gate",     dir: "gate",     coreKey: "decern-gate",      publishMode: "login" },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, obj) {
  // Preserve a trailing newline (matches most editor/npm defaults).
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function run(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" }).trim();
}

/** Run a command with full TTY inheritance (for interactive prompts like npm login). */
function runInteractive(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

const rl = createInterface({ input, output });

async function prompt(message) {
  await rl.question(message);
}

/**
 * Publish a sub-repo to npm. Pauses for user interaction depending on the
 * publish mode:
 *   - "login": runs `npm login` (user completes the interactive flow), then publishes.
 *   - "token": prompts the user to set up an NPM token (env var or ~/.npmrc),
 *              waits for Enter, then publishes.
 */
async function publishSubrepo(dir, name, publishMode) {
  if (publishMode === "login") {
    console.log();
    console.log(`${name}: running \`npm login\` (complete the interactive flow)...`);
    runInteractive("npm login", dir);
    console.log(`${name}: running \`npm publish\`...`);
    runInteractive("npm publish", dir);
    console.log(`${name}: published`);
    return;
  }

  if (publishMode === "token") {
    console.log();
    await prompt(
      `${name}: set the NPM token (export NPM_TOKEN or edit ~/.npmrc), then press Enter to publish... `
    );
    console.log(`${name}: running \`npm publish\`...`);
    runInteractive("npm publish", dir);
    console.log(`${name}: published`);
    return;
  }

  throw new Error(`${name}: unknown publishMode "${publishMode}"`);
}

/**
 * Commit package.json and push in the given sub-repo. Aborts with a clear
 * error if there are unrelated staged changes or the working tree is dirty
 * beyond package.json.
 */
function commitAndPushSubrepo(dir, name, nextVersion) {
  // Check that the only change is package.json (so we don't drag unrelated work).
  // Use -z to get NUL-separated output which is trivial to parse (no escaping,
  // no CR/LF issues). Porcelain format per entry: "XY <space> path\0".
  const statusZ = execSync("git status --porcelain -z", {
    cwd: dir,
    stdio: "pipe",
    encoding: "utf8",
  });
  const entries = statusZ.split("\0").filter(Boolean);
  const unrelated = entries.filter((entry) => {
    // "XY path" — X,Y are each a single char (possibly space), then 1 space, then path.
    const path = entry.slice(3);
    return path !== "package.json";
  });
  if (unrelated.length > 0) {
    throw new Error(
      `${name}: working tree has unrelated changes, refusing to commit:\n${unrelated.join("\n")}\n(raw: ${JSON.stringify(statusZ)})`
    );
  }

  const branch = run("git rev-parse --abbrev-ref HEAD", dir);
  const message = `chore: bump version to ${nextVersion}`;

  run("git add package.json", dir);
  run(`git commit -m ${JSON.stringify(message)}`, dir);
  run(`git push origin ${branch}`, dir);
  console.log(`${name}: committed + pushed to origin/${branch}`);
}

function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }
  const [, maj, min, patch, rest] = match;
  if (rest) {
    throw new Error(`Refusing to bump pre-release/suffix version: ${version}`);
  }
  return `${maj}.${min}.${Number(patch) + 1}`;
}

/**
 * Replace a version in a dependency map while preserving the prefix the user
 * had (e.g. "^", "~", exact). Returns true if a change was made.
 */
function updateDepVersion(deps, key, nextVersion) {
  if (!deps || !(key in deps)) return false;
  const current = deps[key];
  const prefixMatch = /^(\^|~|>=|<=|>|<|=)?/.exec(current);
  const prefix = prefixMatch ? prefixMatch[1] ?? "" : "";
  const nextValue = `${prefix}${nextVersion}`;
  if (deps[key] === nextValue) return false;
  deps[key] = nextValue;
  return true;
}

// ── 1. Bump each sub-package ─────────────────────────────────────────────
const newVersions = {};

for (const t of targets) {
  const subRepoDir = resolve(repoRoot, t.dir);
  const pkgPath = resolve(subRepoDir, "package.json");
  const pkg = readJson(pkgPath);
  const prev = pkg.version;
  const next = bumpPatch(prev);
  pkg.version = next;
  newVersions[t.coreKey] = { prev, next, path: pkgPath };

  if (dryRun) {
    console.log(`[dry-run] ${t.dir}/package.json: ${prev} → ${next}`);
    if (!noGit) {
      console.log(`[dry-run] ${t.dir}: git add + commit "chore: bump version to ${next}" + push`);
    }
    if (!noPublish) {
      const how = t.publishMode === "login" ? "npm login → npm publish" : "pause for NPM token → npm publish";
      console.log(`[dry-run] ${t.dir}: ${how}`);
    }
    continue;
  }

  writeJson(pkgPath, pkg);
  console.log(`${t.dir}/package.json: ${prev} → ${next}`);

  if (!noGit) {
    try {
      commitAndPushSubrepo(subRepoDir, t.dir, next);
    } catch (err) {
      console.error(`error: ${t.dir} git step failed: ${err.message}`);
      rl.close();
      process.exit(1);
    }
  }

  if (!noPublish) {
    try {
      await publishSubrepo(subRepoDir, t.dir, t.publishMode);
    } catch (err) {
      console.error(`error: ${t.dir} publish failed: ${err.message}`);
      rl.close();
      process.exit(1);
    }
  }
}

// ── 2. Align decern-core package.json ────────────────────────────────────
const corePath = resolve(repoRoot, "package.json");
const core = readJson(corePath);

const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const coreChanges = [];

for (const t of targets) {
  const { next } = newVersions[t.coreKey];
  let updated = false;
  for (const section of sections) {
    if (updateDepVersion(core[section], t.coreKey, next)) {
      coreChanges.push({ section, key: t.coreKey, next });
      updated = true;
    }
  }
  if (!updated) {
    console.warn(`warn: ${t.coreKey} not found in decern-core package.json`);
  }
}

if (dryRun) {
  for (const c of coreChanges) {
    console.log(`[dry-run] package.json ${c.section}.${c.key} → ${c.next}`);
  }
} else if (coreChanges.length > 0) {
  writeJson(corePath, core);
  for (const c of coreChanges) {
    console.log(`package.json ${c.section}.${c.key} → ${c.next}`);
  }
}

// ── 3. Summary ───────────────────────────────────────────────────────────
rl.close();

console.log();
console.log(dryRun ? "Dry run complete. No files written." : "Version bump complete.");
console.log("Next steps (manual):");
console.log("  1. Install in decern-core:    npm install");
console.log("  2. Commit decern-core:        git add package.json package-lock.json && git commit && git push");
