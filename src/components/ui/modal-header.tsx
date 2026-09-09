import type { ReactNode } from "react";
import { XIcon } from "lucide-react";

import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModalHeader({
  title,
  subtitle,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <DialogHeader className={cn("bg-popover relative shrink-0 pr-8", className)}>
      <DialogTitle>{title}</DialogTitle>
      {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
      <DialogClose asChild>
        <Button variant="ghost" className="absolute -top-2 -right-2" size="icon-sm">
          <XIcon />
          <span className="sr-only">Close</span>
        </Button>
      </DialogClose>
    </DialogHeader>
  );
}
