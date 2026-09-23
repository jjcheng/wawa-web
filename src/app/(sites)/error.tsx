"use client";

import { useEffect } from "react";

export default function PublicStorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 font-[family-name:var(--font-inter)] text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">500</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">We could not load this page.</h1>
        <p className="mt-4 leading-7 text-muted-foreground">Please try again in a moment.</p>
        <button type="button" onClick={reset} className="mt-8 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/80">
          Try again
        </button>
      </div>
    </main>
  );
}