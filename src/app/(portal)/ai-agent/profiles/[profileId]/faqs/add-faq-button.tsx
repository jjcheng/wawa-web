"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FaqDialog } from "./faq-dialog";

export function AddFaqButton({ profileId }: { profileId: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
        Add FAQ
      </Button>
      {open ? <FaqDialog profileId={profileId} open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
