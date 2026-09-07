"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const popoverSurfaceClassName =
  "bg-popover text-popover-foreground ring-1 ring-[#edf0f1] shadow-md outline-none dark:ring-foreground/10";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  children,
  align = "start",
  sideOffset = 4,
  showArrow = false,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & { showArrow?: boolean }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 w-(--radix-popover-trigger-width) min-w-48 rounded-lg p-1",
          popoverSurfaceClassName,
          className,
        )}
        {...props}
      >
        {children}
        {showArrow ? <PopoverPrimitive.Arrow className="fill-popover stroke-foreground/10 size-3 -translate-y-px stroke-[1.5]" /> : null}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger, popoverSurfaceClassName };
