import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "wawa_session";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:9000";
const PORTAL_HOST = process.env.NEXT_PUBLIC_PORTAL_HOST ?? "";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_METADATA_PATHS = ["/robots.txt", "/sitemap.xml", "/llms.txt"];

// These routes must stay reachable in both session states.
const UNGUARDED_PATHS = ["/session/end", "/embedded-signup"];

function isPortalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "192.168.5.109" ||
    hostname.endsWith(".workers.dev") ||
    (PORTAL_HOST && hostname === PORTAL_HOST)
  );
}

function requestHost(request: NextRequest) {
  return (request.headers.get("host") ?? request.nextUrl.host).split(",")[0].trim();
}

function hostnameFromHost(host: string) {
  return host.replace(/^\[/, "").replace(/\]$/, "").split(":")[0];
}

async function resolveWebsiteId(hostname: string, origin: string) {
  try {
    const url = new URL("/v1/public/ping", `${API_BASE_URL}/`);
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Host: hostname, "X-Forwarded-Host": hostname, Origin: origin },
    });
    const envelope = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { id?: string | number } | null;
    } | null;
    return response.ok && envelope?.success && envelope.data?.id !== undefined
      ? String(envelope.data.id)
      : null;
  } catch {
    return null;
  }
}

// Cheap cookie-presence gate only — the session is actually validated
// server-side by requireUser().
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = requestHost(request);
  const hostname = hostnameFromHost(host);

  if (PUBLIC_METADATA_PATHS.includes(pathname)) return NextResponse.next();

  if (pathname.startsWith("/sites/")) return NextResponse.next();

  if (hostname === "www.wawago.app") {
    return NextResponse.rewrite(new URL(`https://wawa-corporate.pages.dev${pathname}${request.nextUrl.search}`));
  }

  if (!isPortalHost(hostname)) {
    const websiteId = await resolveWebsiteId(host, request.nextUrl.origin);
    if (websiteId) {
      return NextResponse.rewrite(
        new URL(`/sites/${encodeURIComponent(websiteId)}${pathname}`, request.url),
      );
    }
            return NextResponse.rewrite(new URL("/sites/not-found", request.url));
  }

  if (UNGUARDED_PATHS.includes(pathname)) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicons|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
