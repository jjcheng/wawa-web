import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared height for the sign-in form controls and WhatsApp onboarding button. */
export const MEDIUM_BUTTON_HEIGHT = "h-[36px]";

/** Shared height for secondary, in-table action buttons. */
export const SMALL_BUTTON_HEIGHT = "h-[25px]";
