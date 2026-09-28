"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProductBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Back to products"
      className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={() => router.back()}
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}