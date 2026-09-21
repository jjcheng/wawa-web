import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/lib/env.server";
import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  rawBody?: BodyInit;
  contentType?: string;
  query?: Record<string, string | string[] | undefined>;
  /** Original customer-domain host for host-scoped public API requests. */
  forwardedHost?: string;
  /** Original customer-domain origin for host-scoped public API requests. */
  forwardedOrigin?: string;
  /** Pass an explicit session token when it is not yet in the cookie store. */
  sessionToken?: string;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${serverEnv.API_BASE_URL}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== "") url.searchParams.append(key, item);
    }
  }
  return url.toString();
}

export async function buildUpstreamHeaders(
  sessionToken?: string,
  forwardedHost?: string,
  forwardedOrigin?: string,
): Promise<Headers> {
  const headers = new Headers({ Accept: "application/json" });
  if (forwardedHost) {
    headers.set("Host", forwardedHost);
    headers.set("X-Forwarded-Host", forwardedHost);
  }
  if (forwardedOrigin) headers.set("Origin", forwardedOrigin);
  const token = sessionToken ?? (await cookies()).get(serverEnv.SESSION_COOKIE_NAME)?.value;
  if (token) {
    headers.set("x-user-access-token", token);
    // Keep the legacy cookie header for compatibility with older API builds.
    headers.set("Cookie", `${serverEnv.SESSION_COOKIE_NAME}=${token}`);
  }
  return headers;
}

export async function rawServerFetch(
  path: string,
  { method = "GET", body, rawBody, contentType, query, forwardedHost, forwardedOrigin, sessionToken }: RequestOptions = {},
) {
  const headers = await buildUpstreamHeaders(sessionToken, forwardedHost, forwardedOrigin);
  if (rawBody !== undefined) headers.set("Content-Type", contentType ?? "application/octet-stream");
  else if (body !== undefined) headers.set("Content-Type", "application/json");
  return fetch(buildUrl(path, query), {
    method,
    headers,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
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
