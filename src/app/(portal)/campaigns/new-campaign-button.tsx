"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function NewCampaignButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      onClick={() => {
        toast.info("Select at least one customer to start a campaign.");
        router.push("/customers");
      }}
    >
      New campaign
    </Button>
  );
}
