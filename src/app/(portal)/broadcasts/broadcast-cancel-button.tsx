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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";

export function BroadcastCancelButton({ broadcastId }: { broadcastId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function cancelBroadcast() {
    setLoading(true);
    try {
      await apiFetch(`v1/broadcasts/${broadcastId}/cancel`, {
        method: "PATCH",
        body: { reason: reason.trim() },
      });
      setConfirmOpen(false);
      setReason("");
      toast.success("Broadcast cancelled.");
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
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this broadcast?</DialogTitle>
            <DialogDescription>
              This pending broadcast will be cancelled and cannot be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Why are you cancelling this broadcast?"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={cancelBroadcast}
              disabled={loading || !reason.trim()}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
