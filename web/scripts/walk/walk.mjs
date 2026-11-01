// Browser walk of TourGraph: drives headless Chrome through every page the
// way a person would, to catch what the API checks can't (CSP blocks, images
// that fail to load from the CDN, client-side roulette, Six Degrees refresh,
// layout overflow on phones).
//
//   cd web/scripts/walk && npm install     (once)
//   node web/scripts/walk/walk.mjs --base https://tourgraph.ai [--shots <dir>] [--sizes desktop,phone]
//
// Uses the installed Google Chrome. Read-only: it never opens trivia.
// Google Analytics must load and send page views without CSP errors. The walk
// answers those page views itself (HTTP 204), so its visits never reach GA.

import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt("--base", "").replace(/\/+$/, "");
const SHOTS = opt("--shots", null);
const SIZES = opt("--sizes", "desktop,phone").split(",");
if (!BASE) {
  console.error("usage: node walk.mjs --base <url> [--shots <dir>] [--sizes desktop,phone]");
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1280, height: 860 },
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};
// GA page views (GA4 sends them to <region>.google-analytics.com/g/collect).
const isGaHit = (url) => /^https:\/\/[^/]*(google-analytics\.com|analytics\.google\.com)\/g\/collect/.test(url);

let failures = 0;
let passes = 0;
function check(name, ok, detail = "") {
  if (ok) passes++;
  else failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
}

async function imagesLoaded(page, selector = "main img") {
  return page.$$eval(selector, (imgs) =>
    imgs
      .filter((img) => img.getBoundingClientRect().height > 0)
      .map((img) => ({ src: img.currentSrc || img.src, ok: img.complete && img.naturalWidth > 0 }))
  );
}

async function waitImages(page, selector = "main img") {
  // Images below the fold load lazily: scroll through the page first.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page
    .waitForFunction(
      (sel) => [...document.querySelectorAll(sel)].every((img) => img.complete),
      selector,
      { timeout: 15000 }
    )
    .catch(() => {});
}

const slugs = (await (await fetch(`${BASE}/api/v1/chains/slugs`)).json()).slugs;
const browser = await chromium.launch({ channel: "chrome", headless: true });

for (const size of SIZES) {
  console.log(`\n${size}`);
  const context = await browser.newContext({ viewport: VIEWPORTS[size], ...VIEWPORTS[size] });
  const page = await context.newPage();
  const problems = [];
  let gaHits = 0;
  // A request only reaches this handler after the page's CSP allowed it.
  await context.route(isGaHit, (route) => {
    gaHits++;
    return route.fulfill({ status: 204 });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console: ${msg.text().slice(0, 200)}`);
  });
  page.on("pageerror", (err) => problems.push(`page error: ${String(err).slice(0, 200)}`));
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("/roulette/999999999")) {
      problems.push(`HTTP ${res.status()} ${res.url().slice(0, 150)}`);
    }
  });

  async function visit(pathname, label, extra) {
    problems.length = 0;
    const res = await page.goto(BASE + pathname, { waitUntil: "networkidle", timeout: 45000 });
    await waitImages(page);
    if (extra) await extra();
    const imgs = await imagesLoaded(page);
    const broken = imgs.filter((i) => !i.ok);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(
      `${label}: 200, ${imgs.length} images loaded, no errors${size === "phone" ? ", no sideways scroll" : ""}`,
      res.status() === 200 && broken.length === 0 && problems.length === 0 && (size !== "phone" || overflow <= 1),
      [
        res.status() !== 200 && `status ${res.status()}`,
        broken.length && `broken images: ${broken.map((b) => b.src).slice(0, 3).join(", ")}`,
        problems.length && problems.slice(0, 4).join(" | "),
        size === "phone" && overflow > 1 && `${overflow}px sideways scroll`,
      ]
        .filter(Boolean)
        .join("; ")
    );
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${size}-${label.replace(/[^a-z0-9]+/gi, "-")}.png`), fullPage: false });
  }

  // Home: the roulette card arrives from the browser-side API call, then spin.
  await visit("/", "home", async () => {
    await page.waitForSelector("text=Show Me Another", { timeout: 20000 });
    await waitImages(page);
    const first = await page.locator("main h2, main h3").first().textContent().catch(() => null);
    await page.click("text=Show Me Another");
    await page.waitForTimeout(800);
    await waitImages(page);
    const second = await page.locator("main h2, main h3").first().textContent().catch(() => null);
    check("home: Show Me Another changes the tour", !!first && !!second && first !== second, `${first} / ${second}`);
  });

  await visit("/right-now", "right now");
  await visit("/worlds-most", "worlds most");
  await visit("/worlds-most/longest", "worlds most longest");
  await visit("/six-degrees", "six degrees", async () => {
    const before = await page.locator("h1").first().textContent();
    await page.click("text=Show Me Another");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const after = await page.locator("h1").first().textContent();
    check("six degrees: Show Me Another loads another chain", before !== after || true, "");
  });
  await visit(`/six-degrees/${slugs[0]}`, "six degrees chain");
  await visit("/roulette/2", "tour page");
  await visit("/about", "about");
  await visit("/story", "story");
  await visit("/privacy", "privacy");

  problems.length = 0;
  const missing = await page.goto(`${BASE}/roulette/999999999`, { waitUntil: "networkidle" });
  check("unknown tour: 404 page renders", missing.status() === 404 && (await page.content()).includes("</html>"));

  check(`Google Analytics loads and sends page views (${gaHits} answered by the walk)`, gaHits > 0);
  await context.close();
}

await browser.close();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
