import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { TopRightThemeToggle } from "@/components/top-right-theme-toggle";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the authenticated WAWAGO portal for WhatsApp CRM management.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 overflow-x-hidden p-6">
      <TopRightThemeToggle />
      <Brand />
      <LoginPanel next={typeof next === "string" ? next : undefined} />
      <p className="text-muted-foreground text-xs">
        © {new Date().getFullYear()} CoreConcept Pte Ltd
      </p>
    </div>
  );
}
