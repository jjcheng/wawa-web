"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function NewBroadcastButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      onClick={() => {
        toast.info("Select at least one customer to start a broadcast.");
        router.push("/customers");
      }}
    >
      New broadcast
    </Button>
  );
}
