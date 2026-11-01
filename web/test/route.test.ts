// Worker routing (src/server/route.ts): the nginx behaviors it replaces
// (inventory 6.1 N1, N2, N4, N7, N8), through the test entry, where the
// Next.js site is a stand-in that answers "next-handler".
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { HSTS } from "../src/server/route";
import { NEXT_MARKER } from "./entry";

const get = (url: string) => SELF.fetch(url, { redirect: "manual" });

describe("redirects", () => {
  it("sends www to the apex over https, keeping path and query", async () => {
    for (const scheme of ["https", "http"]) {
      const res = await get(`${scheme}://www.tourgraph.ai/roulette/2?x=1`);
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe("https://tourgraph.ai/roulette/2?x=1");
    }
  });

  it("sends plain http on the apex to https", async () => {
    const res = await get("http://tourgraph.ai/about?x=1");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://tourgraph.ai/about?x=1");
  });

  it("does not redirect other hosts (workers.dev, localhost)", async () => {
    const res = await get("http://tourgraph.example.workers.dev/about");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(NEXT_MARKER);
  });
});

describe("api vs pages", () => {
  it("routes /api/v1 and /api/ios to the API with HSTS and nosniff", async () => {
    for (const path of ["/api/v1/health", "/api/v1/chains/count", "/api/ios/tour/999999999"]) {
      const res = await get(`https://tourgraph.ai${path}`);
      expect(res.headers.get("x-handler")).toBeNull();
      expect(res.headers.get("strict-transport-security")).toBe(HSTS);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-type")).toContain("application/json");
    }
  });

  it("hands everything else to the Next.js site", async () => {
    for (const path of ["/", "/roulette/2", "/api/og/right-now", "/sitemap.xml", "/api/v2/x"]) {
      const res = await get(`https://tourgraph.ai${path}`);
      expect(res.headers.get("x-handler")).toBe("next");
    }
  });
});
