import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  API_BASE_URL: z.url(),
  SESSION_COOKIE_NAME: z.string().min(1).default("wawa_session"),
  NEXT_META_APP_ID: z.string().default(""),
  NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID: z.string().default(""),
  TURNSTILE_SECRET_KEY: z.string().default(""),
});

const parsed = serverEnvSchema.safeParse({
  API_BASE_URL: process.env.API_BASE_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  NEXT_META_APP_ID: process.env.NEXT_META_APP_ID,
  NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID: process.env.NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid server environment configuration — ${details}`);
}

export const serverEnv = {
  ...parsed.data,
  API_BASE_URL: parsed.data.API_BASE_URL.replace(/\/+$/, ""),
};
