import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { rawServerFetch } from "@/lib/api/server-client";
import { MASTER_SESSION_RETURN_COOKIE } from "@/lib/auth/cookies";
import { serverEnv } from "@/lib/env.server";

// Clears a stale/invalid session cookie; server components cannot write cookies
// themselves, so requireUser() redirects here instead.
export async function GET(request: NextRequest) {
  try {
    await rawServerFetch("/v1/auth/logout", { method: "POST", body: {} });
  } catch {
    // Clearing the local cookie is enough to end the browser session.
  }
  const cookieStore = await cookies();
  cookieStore.delete(serverEnv.SESSION_COOKIE_NAME);
  cookieStore.delete(MASTER_SESSION_RETURN_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
