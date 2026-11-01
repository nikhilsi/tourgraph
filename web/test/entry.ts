// Worker entry for tests: the real routing with a stand-in for the Next.js site.
import { route } from "../src/server/route";
import type { Env } from "../src/server/api/env";

export const NEXT_MARKER = "next-handler";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return route(request, env, ctx, () => new Response(NEXT_MARKER, { headers: { "x-handler": "next" } }));
  },
} satisfies ExportedHandler<Env>;
