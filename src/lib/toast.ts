import { toast as sonnerToast } from "sonner";

/** Error toasts stay open until the user dismisses them; other toast types keep sonner's defaults. */
export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  {
    ...sonnerToast,
    error: ((message, data) =>
      sonnerToast.error(message, { duration: Infinity, ...data })) as typeof sonnerToast.error,
  },
);
