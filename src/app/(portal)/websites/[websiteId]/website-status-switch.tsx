"use client";

import { useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { updateWebsiteStatus } from "./actions";

export function WebsiteStatusSwitch({
  websiteId,
  initialOnline,
}: {
  websiteId: string;
  initialOnline: boolean;
}) {
  const [online, setOnline] = useState(initialOnline);
  const [isPending, startTransition] = useTransition();

  function toggleStatus() {
    const nextOnline = !online;
    setOnline(nextOnline);
    startTransition(async () => {
      const result = await updateWebsiteStatus(websiteId, nextOnline ? "ACTIVE" : "INACTIVE");
      if (!result.success) {
        setOnline(!nextOnline);
        toast.error(result.message);
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={online}
      aria-busy={isPending}
      aria-label={`Website is ${online ? "online" : "offline"}`}
      title="Click to toggle website status"
      onClick={toggleStatus}
      disabled={isPending}
      className={cn(
        "group inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        online
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "relative flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
          online ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full bg-white shadow-sm transition-transform dark:bg-slate-950",
            online ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
      {online ? "Online" : "Offline"}
    </button>
  );
}
