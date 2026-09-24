"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ApiError } from "@/lib/api/errors";
import { embeddedSignupSchema, loginSchema } from "@/lib/api/schemas";
import { rawServerFetch, serverFetch } from "@/lib/api/server-client";
import type { ApiEnvelope, InputError, User } from "@/lib/api/types";
import {
  MASTER_SESSION_RETURN_COOKIE,
  MASTER_SESSION_RETURN_MAX_AGE_SECONDS,
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
  status?: User["status"];
  wa_activated?: boolean;
  wa_error?: string;
  /** Set when the API did not issue an access token; tells the client where to send the user. */
  redirectTo?: string;
  loggedIn?: boolean;
};

function safeNextPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  // Only allow same-origin relative paths to avoid open-redirects.
  return /^\/(?!\/)[\w\-./?%&=]*$/.test(path) ? path : "/dashboard";
}

async function verifyTurnstile(token: FormDataEntryValue | null) {
  if (!serverEnv.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== "string" || !token.trim()) return false;

  const body = new FormData();
  body.set("secret", serverEnv.TURNSTILE_SECRET_KEY);
  body.set("response", token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
  return Boolean(response.ok && result?.success);
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    country_code: formData.get("country_code"),
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

  const turnstileResponse = formData.get("turnstile_response") ?? formData.get("cf-turnstile-response");
  const turnstileValid = await verifyTurnstile(turnstileResponse);
  if (!turnstileValid) {
    return { message: "Complete the security check before signing in." };
  }

  let upstream: Response;
  try {
    upstream = await rawServerFetch("/v1/auth/login", {
      method: "POST",
      body: {
        ...parsed.data,
        turnstile_response: typeof turnstileResponse === "string" ? turnstileResponse : "",
      },
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

  const cookieStore = await cookies();
  cookieStore.delete(MASTER_SESSION_RETURN_COOKIE);
  cookieStore.set(
    serverEnv.SESSION_COOKIE_NAME,
    tokenValue,
    sessionCookieOptions(session?.maxAge ?? 7 * 24 * 60 * 60),
  );

  redirect(safeNextPath(formData.get("next")));
}

export async function completeEmbeddedSignup(input: unknown): Promise<EmbeddedSignupState> {
  const parsed = embeddedSignupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      inputErrors: parsed.error.issues.map((issue) => ({
        field: String(issue.path.join(".")),
        message: issue.message,
      })),
    };
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(serverEnv.SESSION_COOKIE_NAME)?.value;
  let masterSessionToken: string | null = null;
  if (currentToken) {
    try {
      const currentUser = await serverFetch<User>("/v1/account/me", {
        sessionToken: currentToken,
      });
      if (currentUser.type === "MASTER") masterSessionToken = currentToken;
    } catch {
      // An invalid existing session should not prevent a new embedded signup.
    }
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

  if (envelope.data?.wa_activated === false) {
    return {
      message: envelope.data.wa_error || "Meta could not activate the WhatsApp account, please try again.",
      wa_activated: false,
      wa_error: envelope.data.wa_error,
    };
  }

  const needsPassword = envelope.data?.status === "PENDING_PASSWORD";
  const accessToken = envelope.data?.access_token;

  if (accessToken) {
    // The API issued a token for the signed-up account: auto-login as that account.
    if (masterSessionToken && needsPassword) {
      cookieStore.set(
        MASTER_SESSION_RETURN_COOKIE,
        masterSessionToken,
        sessionCookieOptions(MASTER_SESSION_RETURN_MAX_AGE_SECONDS),
      );
    } else {
      cookieStore.delete(MASTER_SESSION_RETURN_COOKIE);
    }
    cookieStore.set(serverEnv.SESSION_COOKIE_NAME, accessToken, sessionCookieOptions());
    return {
      status: envelope.data?.status,
      wa_activated: envelope.data?.wa_activated,
      loggedIn: true,
    };
  }

  if (needsPassword) {
    return { message: "WhatsApp onboarding succeeded but no access token was issued." };
  }

  return {
    status: envelope.data?.status,
    wa_activated: envelope.data?.wa_activated,
    redirectTo: masterSessionToken ? "/phone-numbers" : "/login",
  };
}

export async function restoreMasterSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const masterSessionToken = cookieStore.get(MASTER_SESSION_RETURN_COOKIE)?.value;
  if (!masterSessionToken) return false;

  cookieStore.set(
    serverEnv.SESSION_COOKIE_NAME,
    masterSessionToken,
    sessionCookieOptions(),
  );
  cookieStore.delete(MASTER_SESSION_RETURN_COOKIE);
  return true;
}

export async function logoutAction() {
  const cookieStore = await cookies();
  try {
    await rawServerFetch("/v1/auth/logout", { method: "POST", body: {} });
  } catch {
    // Clearing the local cookie is enough to end the browser session.
  }
  cookieStore.delete(serverEnv.SESSION_COOKIE_NAME);
  cookieStore.delete(MASTER_SESSION_RETURN_COOKIE);
  redirect("/login");
}
