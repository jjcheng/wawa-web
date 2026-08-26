import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "wawa_session";

const PUBLIC_PATHS = ["/login"];

// Clears its own cookie, so it must stay reachable in both states.
const UNGUARDED_PATHS = ["/session/end"];

// Cheap cookie-presence gate only — the session is actually validated
// server-side by requireUser().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
