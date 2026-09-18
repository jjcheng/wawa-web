"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";

export function CampaignCancelButton({ campaignId }: { campaignId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function cancelCampaign() {
    setLoading(true);
    try {
      await apiFetch(`v1/campaigns/${campaignId}/cancel`, { method: "PATCH" });
      setConfirmOpen(false);
      toast.success("Campaign cancelled.");
      router.refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)} disabled={loading}>
        Cancel
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this campaign?</DialogTitle>
            <DialogDescription>
              This pending campaign will be cancelled and cannot be sent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Keep campaign
            </Button>
            <Button variant="destructive" onClick={cancelCampaign} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
