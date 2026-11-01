import { env } from "cloudflare:test";
import { api } from "../src/server/api/app";
import type { Env } from "../src/server/api/env";

export const BASE = "https://tourgraph.ai";

/** Call the API in-process with the test D1 (and optional extra bindings). */
export function call(
  path: string,
  init: RequestInit & { json?: unknown } = {},
  extraEnv: Partial<Env> = {}
): Promise<Response> {
  const { json, ...rest } = init;
  const request = new Request(BASE + path, {
    ...rest,
    ...(json !== undefined
      ? { method: rest.method ?? "POST", body: JSON.stringify(json), headers: { "content-type": "application/json", ...rest.headers } }
      : {}),
  });
  return Promise.resolve(api.fetch(request, { ...env, ...extraEnv } as Env));
}

export async function getJson<T = Record<string, unknown>>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
  extraEnv: Partial<Env> = {}
): Promise<{ status: number; body: T; res: Response }> {
  const res = await call(path, init, extraEnv);
  return { status: res.status, body: (await res.json()) as T, res };
}

export async function rows<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
  return (await env.DB.prepare(sql).bind(...params).all<T>()).results;
}

export async function one<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T> {
  const r = await env.DB.prepare(sql).bind(...params).first<T>();
  if (!r) throw new Error(`no row: ${sql}`);
  return r;
}

export const CARD_KEYS = [
  "continent",
  "country",
  "destinationName",
  "durationMinutes",
  "fromPrice",
  "id",
  "imageUrl",
  "oneLiner",
  "productCode",
  "rating",
  "reviewCount",
  "title",
  "viatorUrl",
  "weightCategory",
];

export const DETAIL_KEYS = [...CARD_KEYS, "description", "highlights", "imageUrls", "inclusions", "supplierName"].sort();
