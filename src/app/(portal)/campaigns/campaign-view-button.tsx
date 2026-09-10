"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Campaign } from "@/lib/api/types";

export function CampaignViewButton({ campaign }: { campaign: Campaign }) {
  return (
      <Button asChild size="sm" variant="outline">
        <Link href={`/campaigns/recipients?campaign_id=${campaign.id}`}>
        View
        </Link>
      </Button>
  );
}
