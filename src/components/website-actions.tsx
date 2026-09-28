"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export function WebsiteActions({
  websiteId,
  compact = false,
  small = false,
  onSynced,
}: {
  websiteId: string;
  compact?: boolean;
  small?: boolean;
  onSynced?: (syncedAt: Date) => void;
}) {
  const [syncing, setSyncing] = useState(false);

  async function syncProducts() {
    if (syncing) return;
    setSyncing(true);
    try {
      await apiFetch(`v1/commerce/websites/${encodeURIComponent(websiteId)}/sync`, {
        method: "POST",
      });
      toast.success("Products synced from Meta successfully.");
      onSynced?.(new Date());
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "outline" : "default"}
          size={compact || small ? "sm" : "default"}
          className={compact ? undefined : small ? "mb-0 rounded-full" : `${MEDIUM_BUTTON_HEIGHT} mb-0`}
          disabled={syncing}
        >
          {syncing ? "Syncing..." : compact ? "View" : "View website"}
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="justify-center" asChild>
          <Link href={`/websites/${encodeURIComponent(websiteId)}`}>Customize</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="justify-center" disabled={syncing} onSelect={() => void syncProducts()}>
          Sync products
        </DropdownMenuItem>
        <DropdownMenuItem className="justify-center" disabled>View statistics</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}