import Image from "next/image";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black dark:bg-white">
        <Image
          src="/logo-white-flat.png?v=2"
          alt="WAWAGO"
          width={20}
          height={20}
          className="object-contain dark:hidden"
          priority
        />
        <Image
          src="/logo-black-flat.png?v=2"
          alt="WAWAGO"
          width={20}
          height={20}
          className="hidden object-contain dark:block"
          priority
        />
      </span>
      <span className="flex flex-col leading-tight whitespace-nowrap">
        <span className="text-sm font-semibold">WAWAGO</span>
        <span className="text-muted-foreground text-xs">WhatsApp CRM</span>
      </span>
    </div>
  );
}
