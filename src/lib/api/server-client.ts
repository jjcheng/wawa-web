import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/lib/env.server";
import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Pass an explicit session token when it is not yet in the cookie store. */
  sessionToken?: string;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${serverEnv.API_BASE_URL}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function buildUpstreamHeaders(
  method: string,
  sessionToken?: string,
): Promise<Headers> {
  const headers = new Headers({ Accept: "application/json" });
  // The API's CSRF middleware rejects any non-safe request whose Origin does
  // not exactly match PORTAL_ORIGIN.
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers.set("Origin", serverEnv.PORTAL_ORIGIN);
  }
  const token = sessionToken ?? (await cookies()).get(serverEnv.SESSION_COOKIE_NAME)?.value;
  if (token) {
    headers.set("Cookie", `${serverEnv.SESSION_COOKIE_NAME}=${token}`);
  }
  return headers;
}

export async function rawServerFetch(
  path: string,
  { method = "GET", body, query, sessionToken }: RequestOptions = {},
) {
  const headers = await buildUpstreamHeaders(method, sessionToken);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    redirect: "manual",
  });
}

/** Calls the wawa-go API and unwraps its response envelope. */
export async function serverFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await rawServerFetch(path, options);
  } catch {
    throw new ApiError("Unable to reach the API. Please try again.", 0);
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      envelope?.message ?? `Request failed with status ${response.status}`,
      envelope?.status_code ?? response.status,
      envelope?.input_errors ?? [],
    );
  }

  return envelope.data as T;
}
