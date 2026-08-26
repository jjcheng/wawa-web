"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ApiError } from "@/lib/api/errors";
import { loginSchema } from "@/lib/api/schemas";
import { rawServerFetch } from "@/lib/api/server-client";
import type { ApiEnvelope, InputError, User } from "@/lib/api/types";
import { readUpstreamSession, sessionCookieOptions } from "@/lib/auth/cookies";
import { serverEnv } from "@/lib/env.server";

export type LoginState = {
  message?: string;
  inputErrors?: InputError[];
};

function safeNextPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  // Only allow same-origin relative paths to avoid open-redirects.
  return /^\/(?!\/)[\w\-./?%&=]*$/.test(path) ? path : "/dashboard";
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    phone_number: formData.get("phone_number"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      inputErrors: parsed.error.issues.map((issue) => ({
        field: String(issue.path[0] ?? ""),
        message: issue.message,
      })),
    };
  }

  let upstream: Response;
  try {
    upstream = await rawServerFetch("/auth/v1/login", {
      method: "POST",
      body: parsed.data,
    });
  } catch {
    return { message: new ApiError("Unable to reach the API.", 0).message };
  }

  const envelope = (await upstream.json().catch(() => null)) as ApiEnvelope<User> | null;

  if (!upstream.ok || !envelope?.success) {
    return {
      message: envelope?.message ?? "Sign in failed. Please try again.",
      inputErrors: envelope?.input_errors ?? [],
    };
  }

  const session = readUpstreamSession(upstream.headers.getSetCookie());
  if (!session?.value) {
    return { message: "Sign in succeeded but no session was issued." };
  }

  (await cookies()).set(
    serverEnv.SESSION_COOKIE_NAME,
    session.value,
    sessionCookieOptions(session.maxAge),
  );

  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction() {
  const cookieStore = await cookies();
  try {
    await rawServerFetch("/auth/v1/logout", { method: "POST", body: {} });
  } catch {
    // Clearing the local cookie is enough to end the browser session.
  }
  cookieStore.delete(serverEnv.SESSION_COOKIE_NAME);
  redirect("/login");
}
