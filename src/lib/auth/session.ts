import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { User } from "@/lib/api/types";
import { serverEnv } from "@/lib/env.server";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(serverEnv.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await serverFetch<User>("/v1/account/me");
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) return null;
    throw error;
  }
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const hadCookie = Boolean((await cookies()).get(serverEnv.SESSION_COOKIE_NAME)?.value);
    redirect(hadCookie ? "/session/end" : "/login");
  }
  return user;
}
