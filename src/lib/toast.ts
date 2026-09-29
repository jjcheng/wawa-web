import { createElement, type ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

import { CopyErrorButton } from "@/components/copy-error-button";

type ErrorData = Parameters<typeof sonnerToast.error>[1];

function withCopyButton(message: unknown, data: ErrorData): ErrorData {
  const text = typeof message === "string" || typeof message === "number" ? String(message) : null;
  if (!text) return data;
  const rawDescription = data?.description;
  const description: ReactNode = typeof rawDescription === "function" ? rawDescription() : rawDescription;
  return {
    ...data,
    description: createElement(
      "div",
      null,
      description ?? null,
      createElement(CopyErrorButton, { text }),
    ),
  };
}

/** Error toasts stay open until the user dismisses them and include a copy button; other toast types keep sonner's defaults. */
export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  {
    ...sonnerToast,
    error: ((message, data) =>
      sonnerToast.error(message, {
        duration: Infinity,
        ...withCopyButton(message, data),
      })) as typeof sonnerToast.error,
  },
);
