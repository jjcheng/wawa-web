"use client";

import { useState } from "react";

import { TableCell } from "@/components/ui/table";
import { WebsiteActions } from "@/components/website-actions";
import { formatDateTime } from "@/lib/format";

export function WebsiteSyncCells({
  websiteId,
  initialSyncedAt,
  addedAt,
}: {
  websiteId: string;
  initialSyncedAt?: string;
  addedAt?: string;
}) {
  const [syncedAt, setSyncedAt] = useState<string | Date | undefined>(initialSyncedAt);

  return (
    <>
      <TableCell>{formatDateTime(syncedAt)}</TableCell>
      <TableCell>{formatDateTime(addedAt)}</TableCell>
      <TableCell className="text-right">
        <div className="inline-flex">
          <WebsiteActions websiteId={websiteId} compact onSynced={setSyncedAt} />
        </div>
      </TableCell>
    </>
  );
}