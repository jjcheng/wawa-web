"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { logoutAction } from "@/lib/auth/actions";

const REASON_TYPES: { value: string; label: string }[] = [
  { value: "LACK_OF_FEATURES", label: "It's missing features I need" },
  { value: "HARD_TO_USE", label: "It's too hard to use" },
  { value: "BAD_UI", label: "I don't like the design" },
  { value: "BUGGY", label: "It's too buggy" },
  { value: "LACK_OF_USE", label: "I don't really use it" },
  { value: "LACK_OF_SUPPORT", label: "Support was not there" },
  { value: "INTERNAL_CHANGES", label: "Changes in my organization" },
  { value: "SWITCH_OF_VENDOR", label: "Switching to another vendor" },
];

export function CloseAccountButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonTypes, setReasonTypes] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);

  function resetForm() {
    setReason("");
    setReasonTypes(new Set());
    setSubmitError(null);
    setAcknowledged(false);
  }

  function toggleReasonType(value: string, checked: boolean) {
    setReasonTypes((current) => {
      const next = new Set(current);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  async function confirmClose() {
    if (!acknowledged) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch("v1/account/users/me", {
        method: "DELETE",
        body: {
          ...(reason.trim() ? { reason: reason.trim() } : {}),
          ...(reasonTypes.size > 0 ? { reason_types: [...reasonTypes] } : {}),
        },
      });
      setOpen(false);
      toast.success("Your account has been closed.");
      logoutFormRef.current?.requestSubmit();
    } catch (error) {
      const message = toApiError(error).message;
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="mt-4 ml-3 h-auto p-0 font-normal text-destructive hover:text-destructive/80"
        onClick={() => setOpen(true)}
      >
        Close account
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Close your account?</DialogTitle>
            <DialogDescription>
             This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="mb-3">Please tell us why so we can improve</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REASON_TYPES.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm"
                    htmlFor={`reason-type-${option.value}`}
                  >
                    <Checkbox
                      id={`reason-type-${option.value}`}
                      checked={reasonTypes.has(option.value)}
                      onChange={(event) => toggleReasonType(option.value, event.target.checked)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="close-account-reason" className="mb-3">Other remarks</Label>
              <Textarea
                id="close-account-reason"
                placeholder="Why are you closing your account?"
                value={reason}
                maxLength={5000}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm" htmlFor="close-account-acknowledge">
              <Checkbox
                id="close-account-acknowledge"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>
                I hereby acknowledge and confirm that I am requesting the permanent
                closure of my account, and I understand that all associated data will be permanently deleted and cannot be recovered.
              </span>
            </label>
            {submitError ? <p className="text-destructive text-sm">{submitError}</p> : null}
          </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClose}
              disabled={submitting || !acknowledged}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Close account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <form ref={logoutFormRef} action={logoutAction} className="hidden" />
    </>
  );
}
