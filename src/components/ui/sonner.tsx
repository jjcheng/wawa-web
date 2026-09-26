"use client";

import { useTheme } from "@/components/theme-provider";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      closeButton
      swipeDirections={["top", "left", "right"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        close: <span className="text-base leading-none text-lg mb-1">&times;</span>,
      }}
      style={
        {
          "--normal-bg": "color-mix(in oklch, var(--popover) 72%, transparent)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "color-mix(in oklch, var(--border) 72%, transparent)",
          "--border-radius": "1.5rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast glass-surface-float glass-surface-float-subtle",
          title: "cn-toast-title",
          description: "cn-toast-description",
          icon: "cn-toast-icon",
          closeButton: "cn-toast-close",
          actionButton:
            "!border !border-border !bg-transparent !text-foreground !text-sm hover:!bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
