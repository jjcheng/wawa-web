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
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        The portal could not load this page. If the problem persists, check that the
        CoreConcept API is reachable.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
