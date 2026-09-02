"use client";

import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

// Mirrors helper.ValidatePassword in wawa-go / the `password` schema in lib/api/schemas.ts.
const RULES = [
  { label: "8–20 characters", test: (value: string) => value.length >= 8 && value.length <= 20 },
  { label: "At least 1 letter", test: (value: string) => /\p{L}/u.test(value) },
  { label: "At least 1 number", test: (value: string) => /\p{N}/u.test(value) },
];

export function PasswordStrengthIndicator({ password }: { password: string }) {
  return (
    <ul className="space-y-1 text-sm">
      {RULES.map((rule) => {
        const valid = rule.test(password);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5",
              valid ? "text-green-600 dark:text-green-500" : "text-muted-foreground",
            )}
          >
            {valid ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
