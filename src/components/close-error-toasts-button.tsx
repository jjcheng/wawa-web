"use client";

import { X } from "lucide-react";
import { toast } from "sonner";

export function CloseErrorToastsButton() {
  function closeErrors() {
    for (const notification of toast.getToasts()) {
      if ("type" in notification && notification.type === "error") {
        toast.dismiss(notification.id);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={closeErrors}
      className="border-border text-foreground hover:bg-muted mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
    >
      <X className="size-3.5" />
      Close all
    </button>
  );
}
