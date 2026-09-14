"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-foreground text-7xl leading-none font-bold" aria-hidden="true">
        500
      </p>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        This page cannot be loaded. If the problem persists, please contact the admin.
      </p>
      <Button
        onClick={() => {
          reset();
          window.location.reload();
        }}
      >
        Try again
      </Button>
    </div>
  );
}
