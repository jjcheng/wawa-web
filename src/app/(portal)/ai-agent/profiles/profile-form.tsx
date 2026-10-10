"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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

export type AgentProfile = {
  id: number;
  added_at: string;
  name: string;
  description: string;
};

export function AgentProfileForm({
  profile,
  onSaved,
}: {
  profile?: AgentProfile;
  onSaved: (createdProfileId?: number) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteProfile() {
    if (!profile || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`v1/ai-agent/profiles/${profile.id}`, { method: "DELETE" });
      toast.success("Agent profile deleted.");
      setDeleteOpen(false);
      router.push("/ai-agent");
      router.refresh();
    } catch (requestError) {
      setDeleteError(toApiError(requestError).message);
    } finally {
      setDeleting(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const body = { name: name.trim(), description: description.trim() };
      if (profile) {
        await apiFetch(`v1/ai-agent/profiles/${profile.id}`, {
          method: "PUT",
          body,
        });
        toast.success("Agent profile updated.");
      } else {
        const createdProfile = await apiFetch<AgentProfile>("v1/ai-agent/profiles", {
          method: "POST",
          body,
        });
        toast.success("Agent profile created.");
        onSaved(createdProfile.id);
        return;
      }
      onSaved();
      if (profile) router.refresh();
    } catch (requestError) {
      setError(toApiError(requestError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {profile ? <input type="hidden" name="id" value={profile.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="agent-profile-name">Name</Label>
        <Input
          id="agent-profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter profile name"
          maxLength={50}
          required
        />
        <p className="text-muted-foreground text-right text-xs">{name.length}/50</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-profile-description">
          {profile ? "Description" : "Description (optional)"}
        </Label>
        <Textarea
          id="agent-profile-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe this agent profile"
          required={Boolean(profile)}
        />
      </div>
      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
      <DialogFooter className={profile ? "justify-between" : undefined}>
        {profile ? (
          <Button
            type="button"
            variant="destructive"
            className="sm:mr-auto"
            onClick={() => setDeleteOpen(true)}
            disabled={saving || deleting}
          >
            Delete
          </Button>
        ) : null}
        <Button type="submit" disabled={saving || deleting}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving..." : profile ? "Save" : "Create"}
        </Button>
      </DialogFooter>
      {profile ? (
        <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete agent profile?</DialogTitle>
              <DialogDescription>
                This will permanently delete “{profile.name}”. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {deleteError ? <p className="text-destructive text-sm" role="alert">{deleteError}</p> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={deleting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" variant="destructive" onClick={() => void deleteProfile()} disabled={deleting}>
                {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </form>
  );
}
