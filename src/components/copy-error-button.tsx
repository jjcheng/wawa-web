"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyErrorButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="border-border text-foreground hover:bg-muted mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy error"}
    </button>
  );
}
