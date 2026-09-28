"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ApiError } from "@/lib/api/errors";
import { embeddedSignupSchema, loginSchema } from "@/lib/api/schemas";
import { rawServerFetch, serverFetch } from "@/lib/api/server-client";
import type { ApiEnvelope, EmbeddedSignupResult, InputError, User } from "@/lib/api/types";
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
  wa_error?: string;
  phoneNumberId?: number;
  /** Set when the API did not issue an access token; tells the client where to send the user. */
  redirectTo?: string;
  loggedIn?: boolean;
};

function safeNextPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  // Only allow same-origin relative paths to avoid open-redirects.
  return /^\/(?!\/)[\w\-./?%&=]*$/.test(path) ? path : "/chats";
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

  const envelope = (await upstream.json().catch(() => null)) as ApiEnvelope<EmbeddedSignupResult> | null;
  if (!upstream.ok || !envelope?.success) {
    return {
      message: envelope?.message ?? "WhatsApp onboarding failed. Please try again.",
      inputErrors: envelope?.input_errors ?? [],
    };
  }

  const result = envelope.data;
  if (!result) return { message: "WhatsApp onboarding returned no result. Please try again." };

  if (result.wa_error) {
    return {
      message: result.wa_error,
      wa_error: result.wa_error,
    };
  }

  if (!result.user) {
    if (!result.phone_number) {
      return { message: "WhatsApp onboarding returned no phone number to assign." };
    }
    return { phoneNumberId: result.phone_number.id };
  }

  const needsPassword = result.user.status === "PENDING_PASSWORD";
  const accessToken = result.user.access_token;

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
      status: result.user.status,
      loggedIn: true,
    };
  }

  if (needsPassword) {
    return { message: "WhatsApp onboarding succeeded but no access token was issued." };
  }

  return {
    status: result.user.status,
    redirectTo: masterSessionToken ? "/assets/phone-numbers" : "/login",
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
