"use client";

import { ExternalLink, Info, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import Image from "next/image";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState,
  type SubmitEvent,
} from "react";

import { MediaDropzone } from "@/components/media-dropzone";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { BusinessProfile } from "@/lib/api/types";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { deleteWebsiteAction, updateWebsiteAction, type WebsiteActionState } from "./actions";

export function WebsiteDetailsForm({
  websiteId,
  url,
  initialValues,
}: {
  websiteId: string;
  url?: string;
  initialValues: {
    about: string;
    description: string;
    profilePictureUrl: string;
    address: string;
    contactText: string;
  };
}) {
  const [state, formAction, pending] = useActionState<WebsiteActionState, FormData>(
    updateWebsiteAction,
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState<WebsiteActionState, FormData>(
    deleteWebsiteAction,
    {},
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [syncPending, setSyncPending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);

  // Local preview for a selected-but-not-yet-uploaded file.
  const pictureFilePreviewUrl = useMemo(
    () => (pictureFile ? URL.createObjectURL(pictureFile) : null),
    [pictureFile],
  );
  useEffect(() => {
    return () => {
      if (pictureFilePreviewUrl) URL.revokeObjectURL(pictureFilePreviewUrl);
    };
  }, [pictureFilePreviewUrl]);

  useEffect(() => {
    if (state.savedAt) {
      toast.success("Changes are saved, view your website to see them!");
    }
  }, [state.savedAt]);

  const displayedPictureUrl = pictureFilePreviewUrl ?? values.profilePictureUrl;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (pictureFile) {
      setPictureUploading(true);
      setPictureError(null);
      try {
        const media = await apiFetch<{ url?: string }>("v1/wa/media", {
          method: "POST",
          rawBody: pictureFile,
          contentType: pictureFile.type,
          query: { to_meta: "false", filename: pictureFile.name, content_type: pictureFile.type },
        });
        if (!media.url) throw new Error("Media upload did not return a URL.");
        formData.set("profile_picture_url", media.url);
        setValues((current) => ({ ...current, profilePictureUrl: media.url! }));
        setPictureFile(null);
      } catch (error) {
        setPictureError(toApiError(error).message);
        setPictureUploading(false);
        return;
      }
      setPictureUploading(false);
    }

    startTransition(() => formAction(formData));
  }

  async function syncBusinessProfile() {
    setSyncPending(true);
    setSyncError(null);
    try {
      const profile = await apiFetch<BusinessProfile>("v1/wa/phone-numbers/business-profile");
      setValues((current) => ({
        ...current,
        about: profile.about ?? "",
        description: profile.description ?? "",
        profilePictureUrl: profile.profile_picture_url ?? "",
        address: profile.address ?? "",
      }));
    } catch (error) {
      setSyncError(toApiError(error).message);
    } finally {
      setSyncPending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Customize website"
        description={
          url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex max-w-full items-center gap-1 hover:underline"
            >
              <span className="truncate">{url}</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
          ) : undefined
        }
        action={
          <div className="flex items-center gap-2 self-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-muted-foreground inline-flex items-center justify-center"
                  aria-label="This will pull the business profile data from your WhatsApp Business app"
                >
                  <Info className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                This will pull the business profile data from your WhatsApp Business app
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              variant="outline"
              onClick={() => void syncBusinessProfile()}
              disabled={pending || syncPending}
            >
              {syncPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {syncPending ? "Syncing..." : "Sync"}
            </Button>
          </div>
        }
      />
      <Card className="rounded-md">
        <CardContent className="pt-0">
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <input type="hidden" name="website_id" value={websiteId} />
        <input type="hidden" name="profile_picture_url" value={values.profilePictureUrl} />

        <div className="space-y-2">
          <Label>Profile picture</Label>
          {displayedPictureUrl ? (
            <div className="bg-muted flex items-center justify-between gap-3 rounded-lg p-2">
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src={displayedPictureUrl}
                  alt="Profile picture preview"
                  width={96}
                  height={96}
                  unoptimized
                  className="size-24 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 truncate text-sm">
                  {pictureFile ? pictureFile.name : values.profilePictureUrl}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Remove profile picture"
                onClick={() => {
                  setPictureFile(null);
                  setValues((current) => ({ ...current, profilePictureUrl: "" }));
                }}
              >
                <X />
              </Button>
            </div>
          ) : (
            <MediaDropzone format="IMAGE" file={pictureFile} onChange={setPictureFile} />
          )}
          {pictureUploading ? (
            <p className="text-muted-foreground text-sm">Uploading image...</p>
          ) : null}
          {pictureError ? <p className="text-destructive text-sm">{pictureError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website-about">About</Label>
          <Textarea
            rows={8}
            id="website-about"
            name="about"
            value={values.about}
            onChange={(event) => setValues((current) => ({ ...current, about: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website-description">Description</Label>
          <Textarea
            id="website-description"
            name="description"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website-address">Address</Label>
          <Input
            id="website-address"
            name="address"
            value={values.address}
            onChange={(event) => setValues((current) => ({ ...current, address: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="website-contact-text">WhatsApp contact text</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-muted-foreground inline-flex items-center justify-center"
                  aria-label="About WhatsApp contact text"
                >
                  <Info className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                The text prefilled when your customers open the WhatsApp link.
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            id="website-contact-text"
            name="contact_text"
            placeholder="Hi, tell me more about your products!"
            value={values.contactText}
            onChange={(event) =>
              setValues((current) => ({ ...current, contactText: event.target.value }))
            }
          />
        </div>

        {syncError ? (
          <Alert variant="destructive">
            <AlertDescription>{syncError}</AlertDescription>
          </Alert>
        ) : null}
        {state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending || syncPending || pictureUploading}>
            {pending || pictureUploading ? <Loader2 className="size-4 animate-spin" /> : null}
            {pictureUploading ? "Uploading..." : pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
        </CardContent>
      </Card>

      <div className="pt-5">
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            Delete website
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete website?</DialogTitle>
              <DialogDescription>
                This action permanently deletes the website and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <form action={deleteAction}>
              <input type="hidden" name="website_id" value={websiteId} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" variant="destructive" disabled={deletePending}>
                  {deletePending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {deletePending ? "Deleting..." : "Delete website"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {deleteState.message ? (
          <p className={cn("text-destructive mt-3 text-sm")} role="alert">
            {deleteState.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
