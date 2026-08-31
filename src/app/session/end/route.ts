import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { rawServerFetch } from "@/lib/api/server-client";
import { serverEnv } from "@/lib/env.server";

// Clears a stale/invalid session cookie; server components cannot write cookies
// themselves, so requireUser() redirects here instead.
export async function GET(request: NextRequest) {
  try {
    await rawServerFetch("/v1/auth/logout", { method: "POST", body: {} });
  } catch {
    // Clearing the local cookie is enough to end the browser session.
  }
  (await cookies()).delete(serverEnv.SESSION_COOKIE_NAME);
  return NextResponse.redirect(new URL("/login", request.url));
}
