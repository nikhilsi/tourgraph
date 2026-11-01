// Request routing for the TourGraph Worker (worker.ts), kept apart from the
// OpenNext build so tests can run it with a stand-in for the Next.js handler.
//   www.tourgraph.ai/*         301 to https://tourgraph.ai (was nginx)
//   http://tourgraph.ai/*      301 to https (was nginx)
//   /api/v1/*, /api/ios/*      the API (src/server/api, Hono on D1)
//   everything else            the Next.js site
import { api } from "./api/app";
import type { Env } from "./api/env";

export const CANONICAL_HOST = "tourgraph.ai";
export const HSTS = "max-age=63072000; includeSubDomains; preload";

type Handler = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> | Response;

export function isApiPath(pathname: string): boolean {
  return pathname === "/api/v1" || pathname.startsWith("/api/v1/") || pathname.startsWith("/api/ios/");
}

// nginx sent HSTS on every response, API included. Next.js sets its own
// headers on pages; API responses get these two here.
function withApiHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  out.headers.set("Strict-Transport-Security", HSTS);
  out.headers.set("X-Content-Type-Options", "nosniff");
  return out;
}

export async function route(request: Request, env: Env, ctx: ExecutionContext, next: Handler): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === `www.${CANONICAL_HOST}`) {
    return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
  }
  if (url.hostname === CANONICAL_HOST && url.protocol === "http:") {
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  if (isApiPath(url.pathname)) {
    return withApiHeaders(await api.fetch(request, env, ctx));
  }

  return next(request, env, ctx);
}
