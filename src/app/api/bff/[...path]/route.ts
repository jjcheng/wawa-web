import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAllowedUpstream } from "@/lib/api/allowlist";
import { rawServerFetch } from "@/lib/api/server-client";
import { readUpstreamSession, sessionCookieOptions } from "@/lib/auth/cookies";
import { serverEnv } from "@/lib/env.server";

type Context = { params: Promise<{ path: string[] }> };

function envelope(statusCode: number, message: string) {
  return NextResponse.json(
    { success: false, status_code: statusCode, time_taken: 0, message },
    { status: statusCode },
  );
}

async function proxyRequest(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const upstreamPath = path.join("/");
  const method = request.method.toUpperCase();

  if (!isAllowedUpstream(method, upstreamPath)) {
    return envelope(404, "route not found");
  }

  let body: unknown;
  if (method !== "GET" && method !== "HEAD") {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return envelope(400, "invalid JSON body");
      }
    } else {
      body = {};
    }
  }

  const query: Record<string, string | string[]> = {};
  for (const key of new Set(request.nextUrl.searchParams.keys())) {
    const values = request.nextUrl.searchParams.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }

  const accessToken =
    request.headers.get("x-user-access-token") ??
    request.cookies.get(serverEnv.SESSION_COOKIE_NAME)?.value ??
    undefined;

  let upstream: Response;
  try {
    upstream = await rawServerFetch(upstreamPath, {
      method: method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
      body,
      query,
      sessionToken: accessToken,
    });
  } catch {
    return envelope(502, "unable to reach the API");
  }

  const payload = await upstream.arrayBuffer();
  const response = new NextResponse(payload, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
  const contentDisposition = upstream.headers.get("Content-Disposition");
  if (contentDisposition) response.headers.set("Content-Disposition", contentDisposition);

  const upstreamAccessToken = upstream.headers.get("x-user-access-token");

  // Re-issue the API's session cookie on the portal's own origin.
  const session = readUpstreamSession(upstream.headers.getSetCookie());
  const tokenValue = upstreamAccessToken ?? session?.value;
  if (tokenValue) {
    response.headers.set("x-user-access-token", tokenValue);
    response.cookies.set(
      serverEnv.SESSION_COOKIE_NAME,
      tokenValue,
      sessionCookieOptions(session?.maxAge ?? 7 * 24 * 60 * 60),
    );
  } else if (session) {
    response.cookies.delete(serverEnv.SESSION_COOKIE_NAME);
  }

  return response;
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
