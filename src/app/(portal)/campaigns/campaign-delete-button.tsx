"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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

export function CampaignDeleteButton({ campaignId }: { campaignId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function deleteCampaign() {
    setLoading(true);
    try {
      await apiFetch(`v1/campaigns/${campaignId}`, { method: "DELETE" });
      setConfirmOpen(false);
      toast.success("Campaign deleted.");
      router.refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={loading}>
        Delete
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this campaign?</DialogTitle>
            <DialogDescription>
              This cancelled campaign will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={deleteCampaign} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
