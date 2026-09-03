import * as React from "react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "checkbox", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn("border-input accent-primary size-4 cursor-pointer rounded", className)}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
