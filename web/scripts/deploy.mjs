#!/usr/bin/env node
// Build the site and API into one Worker and deploy it. Run from web/.
//   node scripts/deploy.mjs              tests, build, checks, wrangler deploy
//   node scripts/deploy.mjs --dry-run    tests, build, checks, wrangler deploy --dry-run
//   node scripts/deploy.mjs --local      build, checks, then serve it on http://localhost:8787
//                                        against the local D1 (scripts/d1-load.mjs --local)
//   add --skip-tests to skip vitest
//
// Why a staging copy: web/.env and web/.env.local hold the data pipeline's
// Viator and Anthropic keys (data/lib/env.ts reads them), and OpenNext bakes
// any .env file it finds into the Worker. The build therefore runs in a copy
// of web/ made from files git tracks or would track (ignored files such as
// .env, .next and node_modules are left out; node_modules is cloned in).
// After the build, the bundle is scanned for key names and refused if any
// show up.
//
// Wrangler uses the OmSpark token in ~/.secrets/cloudflare/tourgraph.env.
// The Mac's default wrangler login belongs to another account and is never used.

import { execFileSync, execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const local = args.includes("--local");
const skipTests = args.includes("--skip-tests") || local;
const stage = join(tmpdir(), "tourgraph-build");

const SECRET_NAMES = [
  "VIATOR_API_KEY",
  "VIATOR_SANDBOX_KEY",
  "ANTHROPIC_API_KEY",
  "FIRECRAWL_API_KEY",
  "CLOUDFLARE_API_TOKEN",
];

function loadToken() {
  const file = join(homedir(), ".secrets/cloudflare/tourgraph.env");
  if (!existsSync(file)) throw new Error(`missing ${file} (see docs/deploy-runbook.md)`);
  const env = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) throw new Error(`${file} lacks the token or account id`);
  return env;
}

function run(cmd, cwd, env = {}) {
  console.log(`\n$ ${cmd}   (in ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 1. Tests run against the working copy.
if (!skipTests) run("npx vitest run", webDir);

// 2. Staging copy: tracked and untracked-but-not-ignored files only.
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "."], {
  cwd: webDir,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)
  .filter((f) => existsSync(join(webDir, f)));
for (const f of files) {
  mkdirSync(dirname(join(stage, f)), { recursive: true });
  cpSync(join(webDir, f), join(stage, f));
}
// APFS clone: fast and takes no extra space.
execFileSync("cp", ["-cR", join(webDir, "node_modules"), join(stage, "node_modules")]);
const envFiles = readdirSync(stage).filter((f) => f.startsWith(".env") && f !== ".env.example");
if (envFiles.length) throw new Error(`staging copy has ${envFiles.join(", ")}; refusing to build`);
console.log(`\nstaged ${files.length} files in ${stage}`);

// 3. Build.
run("npx opennextjs-cloudflare build", stage);

// 4. Refuse a bundle that carries any key name or .env file.
const built = walk(join(stage, ".open-next"));
const leaks = [];
for (const file of built) {
  const rel = relative(stage, file);
  if (/(^|\/)\.env(\.|$)/.test(rel)) leaks.push(`${rel} (env file)`);
  if (!/\.(m?js|json|env|txt|html|map)$/.test(file) && !rel.includes(".env")) continue;
  const text = readFileSync(file, "utf8");
  for (const name of SECRET_NAMES) if (text.includes(name)) leaks.push(`${rel} mentions ${name}`);
}
if (leaks.length) {
  console.error("\nbundle check FAILED:\n  " + leaks.join("\n  "));
  process.exit(1);
}
console.log(`bundle check: ${built.length} files, no env files, no key names`);

// 5. Deploy, dry-run, or serve locally.
if (local) {
  run(`npx wrangler dev --local --port 8787 --persist-to ${join(webDir, ".wrangler/state")}`, stage);
} else {
  const cf = loadToken();
  run(`npx wrangler deploy${dryRun ? " --dry-run --outdir " + join(stage, "dist") : ""}`, stage, cf);
  if (!dryRun) console.log("\nDeployed. Next: node scripts/verify.mjs [--base <url>]");
}
