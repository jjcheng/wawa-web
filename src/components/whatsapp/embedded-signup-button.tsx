"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const DEFAULT_LABEL = "Add WhatsApp Business Number";

export function EmbeddedSignupButton({
  label = DEFAULT_LABEL,
  className,
  redirectTo = "/numbers",
}: {
  label?: string;
  className?: string;
  redirectTo?: string | null;
}) {
  const pathname = usePathname();
  const params = new URLSearchParams();
  if (redirectTo) params.set("next", redirectTo);
  params.set("from", pathname);
  const href = `/embedded-signup${params.size ? `?${params}` : ""}`;

  return (
    <Button
      asChild
      className={cn(
        MEDIUM_BUTTON_HEIGHT,
        "bg-[#25D366] text-white hover:bg-[#1EBE5B] focus-visible:ring-[#25D366]/50",
        className,
      )}
    >
      <Link href={href}>
        <WhatsappIcon className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
