#!/usr/bin/env node
// Live checks after a deploy. Exits non-zero on any failure. Run from web/.
//   node scripts/verify.mjs                                      (https://tourgraph.ai)
//   node scripts/verify.mjs --base https://tourgraph.nikhil-58a.workers.dev
//
// Checks: every page and API family answers, security headers on pages, API
// responses and static files, JSON 404 under /api/v1, the not-found page,
// OG images are PNGs, the sitemap lists 503 URLs, and (on tourgraph.ai only)
// the www and http redirects. Read-only: it never calls /trivia/daily or
// POSTs anything that writes.

const args = process.argv.slice(2);
const baseArg = args.indexOf("--base");
const BASE = (baseArg >= 0 ? args[baseArg + 1] : "https://tourgraph.ai").replace(/\/$/, "");
const host = new URL(BASE).hostname;

const PAGE_HEADERS = {
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  // Includes Google Analytics' hosts since Nov 1, 2026 (next.config.ts).
  "content-security-policy":
    "default-src 'self'; img-src 'self' https://*.tripadvisor.com https://*.cloudfront.net https://*.viator.com https://www.googletagmanager.com https://*.google-analytics.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; font-src 'self'; connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
};

let failures = 0;
let passes = 0;
function check(name, ok, detail = "") {
  if (ok) passes++;
  else failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
}

async function get(path, init = {}) {
  return fetch(path.startsWith("http") ? path : BASE + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    ...init,
  });
}

function headersMatch(res, wanted) {
  return Object.entries(wanted)
    .filter(([k, v]) => res.headers.get(k) !== v)
    .map(([k]) => k);
}

console.log(`Verifying ${BASE}\n`);

console.log("API");
const health = await get("/api/v1/health");
const healthBody = await health.json().catch(() => ({}));
check("health is ok with 136,256 active tours", health.status === 200 && healthBody.status === "ok" && healthBody.tours === 136256, JSON.stringify(healthBody));
check("health uptime is seconds since the isolate's first request", healthBody.uptime >= 0 && healthBody.uptime < 7 * 86400, String(healthBody.uptime));
check("API responses carry HSTS and nosniff", headersMatch(health, {
  "strict-transport-security": PAGE_HEADERS["strict-transport-security"],
  "x-content-type-options": "nosniff",
}).length === 0);
check("API sends open CORS", health.headers.get("access-control-allow-origin") === "*");

const stats = await (await get("/api/v1/stats")).json();
check("stats", stats.tours === 136256 && stats.destinations > 2000 && stats.countries > 100, JSON.stringify(stats));
const tour = await get("/api/v1/tours/2");
const tourBody = await tour.json();
check("tour 2 detail", tour.status === 200 && tourBody.id === 2 && Array.isArray(tourBody.imageUrls));
const ios = await get("/api/ios/tour/2");
check("/api/ios/tour/2 enrichment alias", ios.status === 200 && (await ios.json()).id === 2);
const hand = await (await get("/api/v1/roulette/hand")).json();
check("roulette deals 20", Array.isArray(hand.hand) && hand.hand.length === 20, `got ${hand.hand?.length}`);
const tzs = await (await get("/api/v1/right-now/timezones")).json();
check("289 time zones", tzs.timezones?.length === 289, `got ${tzs.timezones?.length}`);
const sup = await (await get("/api/v1/superlatives")).json();
check("6 superlatives", sup.superlatives?.length === 6, `got ${sup.superlatives?.length}`);
const count = await (await get("/api/v1/chains/count")).json();
check("491 chains", count.count === 491, JSON.stringify(count));
const nope = await get("/api/v1/nope");
check("unknown API path is JSON 404", nope.status === 404 && (await nope.json()).error === "Not found");
const practice = await get("/api/v1/trivia/practice");
check("trivia practice", practice.status === 200 && typeof (await practice.json()).question === "string");

console.log("\nPages");
const slug = (await (await get("/api/v1/chains/slugs")).json()).slugs[0];
for (const path of ["/", "/right-now", "/worlds-most", "/worlds-most/longest", "/six-degrees", `/six-degrees/${slug}`, "/roulette/2", "/about", "/story", "/privacy", "/support"]) {
  const res = await get(path);
  const html = await res.text();
  const missing = headersMatch(res, PAGE_HEADERS);
  check(`${path} 200 with security headers`, res.status === 200 && missing.length === 0 && html.includes("</html>"), `status ${res.status}, missing or different: ${missing.join(", ")}`);
}
const home = await (await get("/")).text();
check("no site-wide canonical tag", !/rel="canonical" href="https:\/\/tourgraph\.ai"/.test(home));
const support = await (await get("/support")).text();
check("no scripts injected by Cloudflare (Web Analytics, email obfuscation, Rocket Loader)",
  ![home, support].some((h) => /cloudflareinsights|email-decode|rocket-loader/.test(h)));
check("tour photos load straight from the CDN", /src="https:\/\/media-cdn\.tripadvisor\.com/.test(await (await get("/roulette/2")).text()));
const missingPage = await get("/roulette/999999999");
check("unknown tour shows the not-found page (404)", missingPage.status === 404);

console.log("\nSEO and OG");
const sitemap = await (await get("/sitemap.xml")).text();
const urls = (sitemap.match(/<loc>/g) || []).length;
check("sitemap lists 503 URLs", urls === 503, `got ${urls}`);
check("robots.txt", (await (await get("/robots.txt")).text()).includes("Sitemap: https://tourgraph.ai/sitemap.xml"));
for (const path of ["/api/og/roulette/2", "/api/og/right-now", "/api/og/worlds-most/longest", `/api/og/six-degrees/${slug}`]) {
  const res = await get(path);
  const buf = Buffer.from(await res.arrayBuffer());
  check(`${path} is a PNG`, res.status === 200 && res.headers.get("content-type") === "image/png" && buf.subarray(1, 4).toString() === "PNG", `status ${res.status}`);
}

console.log("\nStatic files");
const js = /src="(\/_next\/static\/[^"]+\.js)"/.exec(home)?.[1];
const jsRes = js ? await get(js) : null;
check("a Next.js bundle file is served", jsRes?.status === 200, js ?? "no script tag found");
if (jsRes) check("static files carry HSTS and nosniff (public/_headers)", headersMatch(jsRes, {
  "strict-transport-security": PAGE_HEADERS["strict-transport-security"],
  "x-content-type-options": "nosniff",
}).length === 0);
if (jsRes) check("Next.js build files are cached for a year", jsRes.headers.get("cache-control") === "public, max-age=31536000, immutable", jsRes.headers.get("cache-control"));
const proxied = await get(`/_next/image?url=${encodeURIComponent(tourBody.imageUrl)}&w=640&q=75`);
check("/_next/image does not proxy remote images", proxied.status >= 400, `status ${proxied.status}`);
const logo = await get("/logo-white.png");
check("/logo-white.png", logo.status === 200 && logo.headers.get("content-type") === "image/png");

if (host === "tourgraph.ai") {
  console.log("\nRedirects");
  const www = await get("https://www.tourgraph.ai/about?x=1");
  check("www goes to the apex", www.status === 301 && www.headers.get("location") === "https://tourgraph.ai/about?x=1", `${www.status} ${www.headers.get("location")}`);
  const http = await get("http://tourgraph.ai/about?x=1");
  check("http goes to https", [301, 308].includes(http.status) && http.headers.get("location") === "https://tourgraph.ai/about?x=1", `${http.status} ${http.headers.get("location")}`);
  const httpAsset = await get("http://tourgraph.ai/logo-white.png");
  check("http goes to https for static files too", [301, 308].includes(httpAsset.status), `${httpAsset.status}`);
  check("served by Cloudflare, not the droplet", !!health.headers.get("cf-ray") && !/nginx/i.test(health.headers.get("server") ?? ""));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
