"use client";

import { useState } from "react";

import { LocalDateTime } from "@/components/local-date-time";
import { TableCell } from "@/components/ui/table";
import { WebsiteActions } from "@/components/website-actions";

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
      <TableCell><LocalDateTime value={syncedAt} /></TableCell>
      <TableCell><LocalDateTime value={addedAt} /></TableCell>
      <TableCell className="text-right">
        <div className="inline-flex">
          <WebsiteActions websiteId={websiteId} compact onSynced={setSyncedAt} />
        </div>
      </TableCell>
    </>
  );
}