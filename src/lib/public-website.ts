import { headers } from "next/headers";

import { serverFetch } from "@/lib/api/server-client";
import type { Website } from "@/lib/api/types";

function hostFromHeader(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export async function getPublicWebsiteHostname() {
  const requestHeaders = await headers();
  return hostFromHeader(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
}

export async function getPublicWebsiteOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
  return host ? `${protocol}://${host}` : "";
}

export async function loadPublicWebsite() {
  const host = await getPublicWebsiteHostname();
  if (!host) return null;

  try {
    return await serverFetch<Website>("/v1/public/ping", {
      forwardedHost: host,
      forwardedOrigin: await getPublicWebsiteOrigin(),
    });
  } catch {
    return null;
  }
}
