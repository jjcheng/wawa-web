"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BusinessAgentInfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="What is Meta Business Agent?"
          title="What is Meta Business Agent?"
        >
          <Info />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta Business Agent</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            Meta Business Agent uses Meta&apos;s built-in AI to answer your customers&apos; questions
            automatically. You can easily train the AI by linking your website, uploading FAQs,
            adding files, or connecting your business tools. You have full control to turn the AI
            assistant on and off whenever you want, like setting it to run after hours so you never
            miss a valuable lead. If you manage multiple phone numbers, you can save your first
            setup as a template and instantly copy it to all your other lines.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Get started</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}