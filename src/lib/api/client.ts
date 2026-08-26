import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

type ClientOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
};

/** Calls the API through the same-origin BFF proxy at /api/bff/*. */
export async function apiFetch<T>(
  path: string,
  { method = "GET", body, query, signal }: ClientOptions = {},
): Promise<T> {
  const url = new URL(`/api/bff/${path.replace(/^\/+/, "")}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal,
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please try again.", 0);
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
