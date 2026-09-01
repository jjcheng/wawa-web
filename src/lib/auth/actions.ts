"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ApiError } from "@/lib/api/errors";
import { embeddedSignupSchema, loginSchema } from "@/lib/api/schemas";
import { rawServerFetch } from "@/lib/api/server-client";
import type { ApiEnvelope, InputError, User } from "@/lib/api/types";
import {
  readUpstreamAccessToken,
  readUpstreamSession,
  sessionCookieOptions,
} from "@/lib/auth/cookies";
import { serverEnv } from "@/lib/env.server";

export type LoginState = {
  message?: string;
  inputErrors?: InputError[];
};

export type EmbeddedSignupState = {
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
    upstream = await rawServerFetch("/v1/auth/login", {
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

  const payloadUser = envelope?.data as User | null | undefined;
  const accessToken =
    payloadUser?.access_token ?? readUpstreamAccessToken(upstream.headers) ?? undefined;
  const session = readUpstreamSession(upstream.headers.getSetCookie());
  const tokenValue = accessToken ?? session?.value;
  if (!tokenValue) {
    return { message: "Sign in succeeded but no access token was issued." };
  }

  (await cookies()).set(
    serverEnv.SESSION_COOKIE_NAME,
    tokenValue,
    sessionCookieOptions(session?.maxAge ?? 7 * 24 * 60 * 60),
  );

  redirect(safeNextPath(formData.get("next")));
}

export async function completeEmbeddedSignup(
  input: unknown,
): Promise<EmbeddedSignupState> {
  const parsed = embeddedSignupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      inputErrors: parsed.error.issues.map((issue) => ({
        field: String(issue.path.join(".")),
        message: issue.message,
      })),
    };
  }

  let upstream: Response;
  try {
    upstream = await rawServerFetch("/v1/wa/account/embedded-signup", {
      method: "POST",
      body: parsed.data,
    });
  } catch {
    return { message: new ApiError("Unable to reach the API.", 0).message };
  }

  const envelope = (await upstream.json().catch(() => null)) as ApiEnvelope<User> | null;
  if (!upstream.ok || !envelope?.success) {
    return {
      message: envelope?.message ?? "WhatsApp onboarding failed. Please try again.",
      inputErrors: envelope?.input_errors ?? [],
    };
  }

  const accessToken = envelope.data?.access_token;
  if (!accessToken) {
    return { message: "WhatsApp onboarding succeeded but no access token was issued." };
  }

  (await cookies()).set(
    serverEnv.SESSION_COOKIE_NAME,
    accessToken,
    sessionCookieOptions(),
  );

  return {};
}

export async function logoutAction() {
  const cookieStore = await cookies();
  try {
    await rawServerFetch("/v1/auth/logout", { method: "POST", body: {} });
  } catch {
    // Clearing the local cookie is enough to end the browser session.
  }
  cookieStore.delete(serverEnv.SESSION_COOKIE_NAME);
  redirect("/login");
}
