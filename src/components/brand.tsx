import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <MessageCircle className="size-4" />
      </span>
      <span className="flex flex-col leading-tight whitespace-nowrap">
        <span className="text-sm font-semibold">WAWAGO</span>
        <span className="text-muted-foreground text-xs">WhatsApp CRM</span>
      </span>
    </div>
  );
}
