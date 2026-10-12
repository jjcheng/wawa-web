import { createElement, type ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

import { CopyErrorButton } from "@/components/copy-error-button";
import { CloseErrorToastsButton } from "@/components/close-error-toasts-button";

type ErrorData = Parameters<typeof sonnerToast.error>[1];

function withErrorActions(message: unknown, data: ErrorData): ErrorData {
  const text = typeof message === "string" || typeof message === "number" ? String(message) : null;
  const rawDescription = data?.description;
  const description: ReactNode = typeof rawDescription === "function" ? rawDescription() : rawDescription;
  return {
    ...data,
    description: createElement(
      "div",
      null,
      description ?? null,
      createElement(
        "div",
        { className: "flex flex-wrap gap-2" },
        text ? createElement(CopyErrorButton, { text }) : null,
        createElement(CloseErrorToastsButton),
      ),
    ),
  };
}

/** Error toasts stay open and include copy/dismiss-all controls; other types keep sonner's defaults. */
export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  {
    ...sonnerToast,
    error: ((message, data) =>
      sonnerToast.error(message, {
        duration: Infinity,
        ...withErrorActions(message, data),
      })) as typeof sonnerToast.error,
  },
);
