"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Broadcast } from "@/lib/api/types";

export function BroadcastViewButton({ broadcast }: { broadcast: Broadcast }) {
  return (
      <Button asChild size="sm" variant="outline">
        <Link href={`/broadcasts/recipients?broadcast_id=${broadcast.id}`}>
        View
        </Link>
      </Button>
  );
}
