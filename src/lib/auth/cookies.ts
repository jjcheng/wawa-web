import "server-only";

import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { serverEnv } from "@/lib/env.server";

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const MASTER_SESSION_RETURN_COOKIE = `${serverEnv.SESSION_COOKIE_NAME}_master_return`;
export const MASTER_SESSION_RETURN_MAX_AGE_SECONDS = 60 * 60;

export function sessionCookieOptions(
  maxAge: number = SESSION_MAX_AGE_SECONDS,
): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/**
 * Reads the session cookie out of an upstream `Set-Cookie` list. Returns null
 * when the API did not touch the session, and an empty value when it cleared it.
 */
export function readUpstreamAccessToken(headers: Headers): string | null {
  const headerValue = headers.get("x-user-access-token");
  if (headerValue && headerValue.trim()) return headerValue.trim();

  const cookies = headers.getSetCookie?.() ?? [];
  const name = serverEnv.SESSION_COOKIE_NAME;
  const raw = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!raw) return null;

  const [pair] = raw.split(";").map((part) => part.trim());
  const value = decodeURIComponent(pair.slice(name.length + 1));
  return value || null;
}

export function readUpstreamSession(
  setCookies: string[],
): { value: string; maxAge: number } | null {
  const name = serverEnv.SESSION_COOKIE_NAME;
  const raw = setCookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!raw) return null;

  const [pair, ...attributes] = raw.split(";").map((part) => part.trim());
  const value = decodeURIComponent(pair.slice(name.length + 1));

  const maxAgeAttribute = attributes.find((attribute) =>
    attribute.toLowerCase().startsWith("max-age="),
  );
  const parsedMaxAge = maxAgeAttribute ? Number(maxAgeAttribute.split("=")[1]) : NaN;

  return {
    value,
    maxAge: Number.isFinite(parsedMaxAge) ? parsedMaxAge : SESSION_MAX_AGE_SECONDS,
  };
}
