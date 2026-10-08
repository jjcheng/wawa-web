"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentProfileForm } from "./profiles/profile-form";

export function CreateAgentProfileButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" className="mt-6" onClick={() => setOpen(true)}>
        Create an agent profile
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create agent profile</DialogTitle>
          <DialogDescription>
            Add a name and description for your AI agent profile.
          </DialogDescription>
        </DialogHeader>
        <AgentProfileForm
          onSaved={() => {
            setOpen(false);
            router.push("/ai-agent");
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
