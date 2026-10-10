"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { buildWebsitePayload } from "./website-data";

export function AddWebsiteButton({ profileId }: { profileId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [patterns, setPatterns] = useState("");
  const [includePatterns, setIncludePatterns] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const savingRef = useRef(false);

  function changeOpen(nextOpen: boolean) {
    if (savingRef.current) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setUrl("");
      setPatterns("");
      setIncludePatterns("");
      setErrors([]);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setErrors([]);
    try {
      const body = buildWebsitePayload(profileId, url, patterns, includePatterns);
      await apiFetch(`v1/ai-agent/profiles/${profileId}/websites`, {
        method: "POST",
        body,
      });
      toast.success("Website added.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      const apiError = toApiError(error);
      setErrors([
        apiError.message,
        ...apiError.inputErrors.map((item) =>
          item.field ? `${item.field}: ${item.message}` : item.message,
        ),
      ]);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="rounded-full"
        onClick={() => changeOpen(true)}
      >
        Add website
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add website</DialogTitle>
            <DialogDescription>Add a website this AI agent can reference.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-website-url">URL</Label>
              <Input
                id="agent-website-url"
                type="url"
                inputMode="url"
                placeholder="https://www.example.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-website-include-patterns">
                Include patterns (optional)
              </Label>
              <Textarea
                id="agent-website-include-patterns"
                rows={4}
                placeholder={"https://www.example.com/about\nhttps://www.example.com/contact"}
                value={includePatterns}
                onChange={(event) => setIncludePatterns(event.target.value)}
                aria-describedby="agent-website-include-patterns-help"
                disabled={saving}
              />
              <p
                id="agent-website-include-patterns-help"
                className="text-muted-foreground text-xs"
              >
                Enter one per line. Put the full URLs if you only want to crawl those
                specific pages.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-website-exclude-patterns">
                Exclude patterns (optional)
              </Label>
              <Textarea
                id="agent-website-exclude-patterns"
                rows={4}
                placeholder={
                  "**/private/**\n**/admin/**\nuse * to exclude 1 level, use ** to exclude all"
                }
                value={patterns}
                onChange={(event) => setPatterns(event.target.value)}
                aria-describedby="agent-website-exclude-patterns-help"
                disabled={saving}
              />
              <p
                id="agent-website-exclude-patterns-help"
                className="text-muted-foreground text-xs"
              >
                Enter one per line.
              </p>
            </div>
            {errors.length > 0 ? (
              <div className="text-destructive space-y-1 text-sm" role="alert">
                {errors.map((error, index) => (
                  <p key={index} className="whitespace-pre-line">
                    {error}
                  </p>
                ))}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {saving ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
