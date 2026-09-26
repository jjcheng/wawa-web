"use client";

import { ChevronDown, ExternalLink, Info, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState,
  type SubmitEvent,
} from "react";

import { MediaDropzone } from "@/components/media-dropzone";
import { TableEmptyState } from "@/components/table-empty-state";
import {
  GoogleLocationInput,
  type GoogleLocationSelection,
} from "@/components/google-location-input";
import { PageHeader } from "@/components/page-header";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { BusinessProfile, PhoneNumber, WebsitePage } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { deleteWebsiteAction, updateWebsiteAction, type WebsiteActionState } from "./actions";

export function WebsiteDetailsForm({
  websiteId,
  url,
  initialValues,
  initialActiveTab = "profile",
  initialPages = null,
  phoneNumbers = [],
}: {
  websiteId: string;
  url?: string;
  initialValues: {
    about: string;
    description: string;
    profilePictureUrl: string;
    coverImageUrl: string;
    tagline: string;
    address: string;
    latitude: string;
    longitude: string;
    contactText: string;
    copyrightText: string;
  };
  initialActiveTab?: "profile" | "pages";
  initialPages?: WebsitePage[] | null;
  phoneNumbers?: PhoneNumber[];
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
  const [activeTab, setActiveTab] = useState<"profile" | "pages">(initialActiveTab);
  const [pages, setPages] = useState<WebsitePage[] | null>(initialPages);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState("");
  const [syncPending, setSyncPending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const syncablePhoneNumbers = phoneNumbers.map((phoneNumber) => ({
    ...phoneNumber,
    syncPhoneNumberId: String(phoneNumber.id),
  }));

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

  const coverFilePreviewUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  );
  useEffect(() => {
    return () => {
      if (coverFilePreviewUrl) URL.revokeObjectURL(coverFilePreviewUrl);
    };
  }, [coverFilePreviewUrl]);

  useEffect(() => {
    if (state.savedAt) {
      toast.success("Changes are saved, view your website to see them!");
    }
  }, [state.savedAt]);

  const displayedPictureUrl = pictureFilePreviewUrl ?? values.profilePictureUrl;
  const displayedCoverUrl = coverFilePreviewUrl ?? values.coverImageUrl;

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

    if (coverFile) {
      setCoverUploading(true);
      setCoverError(null);
      try {
        const media = await apiFetch<{ url?: string }>("v1/wa/media", {
          method: "POST",
          rawBody: coverFile,
          contentType: coverFile.type,
          query: { to_meta: "false", filename: coverFile.name, content_type: coverFile.type },
        });
        if (!media.url) throw new Error("Media upload did not return a URL.");
        formData.set("cover_image_url", media.url);
        setValues((current) => ({ ...current, coverImageUrl: media.url! }));
        setCoverFile(null);
      } catch (error) {
        setCoverError(toApiError(error).message);
        setCoverUploading(false);
        return;
      }
      setCoverUploading(false);
    }

    startTransition(() => formAction(formData));
  }

  async function syncBusinessProfile(phoneNumberId: string) {
    setSyncPending(true);
    setSyncError(null);
    try {
      const profile = await apiFetch<BusinessProfile>("v1/wa/phone-numbers/business-profile", {
        query: { phone_number_id: phoneNumberId },
      });
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

  async function loadPages() {
    if (pages || pagesLoading) return;

    setPagesLoading(true);
    setPagesError(null);
    try {
      const response = await apiFetch<WebsitePage[]>(`v1/commerce/websites/${encodeURIComponent(websiteId)}/pages`);
      const websitePages = Array.isArray(response) ? response : [];
      setPages([...websitePages].sort((first, second) => first.rank - second.rank));
    } catch (error) {
      setPagesError(toApiError(error).message);
    } finally {
      setPagesLoading(false);
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
            {syncablePhoneNumbers.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" disabled={pending || syncPending}>
                    {syncPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    {syncPending ? "Syncing..." : "Sync"}
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {syncablePhoneNumbers.map((phoneNumber) => (
                    <DropdownMenuItem
                      key={phoneNumber.id}
                      disabled={syncPending}
                      onSelect={() => void syncBusinessProfile(phoneNumber.syncPhoneNumberId)}
                    >
                      {phoneNumber.name ||
                        formatPhoneNumber(phoneNumber.phone_number) ||
                        phoneNumber.display_phone_number}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const phoneNumberId = syncablePhoneNumbers[0]?.syncPhoneNumberId;
                  if (phoneNumberId) void syncBusinessProfile(phoneNumberId);
                }}
                disabled={pending || syncPending || syncablePhoneNumbers.length === 0}
              >
                {syncPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {syncPending ? "Syncing..." : "Sync"}
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "profile" | "pages");
            if (value === "pages") void loadPages();
          }}
        >
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
          </TabsList>
        </Tabs>
        {activeTab === "pages" ? (
          <Button asChild size="sm" className="ml-auto">
            <Link href={`/websites/${encodeURIComponent(websiteId)}/pages/new?return_to=${encodeURIComponent(`/websites/${websiteId}?tab=pages`)}`}>Add page</Link>
          </Button>
        ) : null}
      </div>
      <Card className={activeTab === "pages" ? "rounded-md py-0" : "rounded-md"}>
        <CardContent className={activeTab === "pages" ? "overflow-x-auto p-0" : "pt-0"}>
      {activeTab === "profile" ? <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <input type="hidden" name="website_id" value={websiteId} />
        <input type="hidden" name="profile_picture_url" value={values.profilePictureUrl} />
        <input type="hidden" name="cover_image_url" value={values.coverImageUrl} />
        <input type="hidden" name="latitude" value={values.latitude} />
        <input type="hidden" name="longitude" value={values.longitude} />

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
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="website-tagline">Tagline</Label>
            <span className="text-muted-foreground text-xs">{values.tagline.length}/100</span>
          </div>
          <Input
            id="website-tagline"
            name="tagline"
            maxLength={100}
            value={values.tagline}
            onChange={(event) => setValues((current) => ({ ...current, tagline: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Cover image</Label>
          {displayedCoverUrl ? (
            <div className="bg-muted space-y-2 rounded-lg p-2">
              <Image
                src={displayedCoverUrl}
                alt="Cover image preview"
                width={800}
                height={320}
                unoptimized
                className="aspect-[5/2] w-full rounded-md object-cover"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm">
                  {coverFile ? coverFile.name : values.coverImageUrl}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove cover image"
                  onClick={() => {
                    setCoverFile(null);
                    setValues((current) => ({ ...current, coverImageUrl: "" }));
                  }}
                >
                  <X />
                </Button>
              </div>
            </div>
          ) : (
            <MediaDropzone format="IMAGE" file={coverFile} onChange={setCoverFile} />
          )}
          {coverUploading ? <p className="text-muted-foreground text-sm">Uploading cover image...</p> : null}
          {coverError ? <p className="text-destructive text-sm">{coverError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website-about">About (directly below cover image)</Label>
          <Textarea
            rows={8}
            id="website-about"
            name="about"
            value={values.about}
            onChange={(event) => setValues((current) => ({ ...current, about: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website-description">Description (in About Us section)</Label>
          <Textarea
            id="website-description"
            name="description"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Search address</Label>
          <GoogleLocationInput
            value={searchAddress}
            onChange={(address) => setSearchAddress(address)}
            onSearchChange={setSearchAddress}
            onPlaceSelect={(location: GoogleLocationSelection | null) => {
              if (!location) return;
              setSearchAddress(location.address);
              setValues((current) => ({
                ...current,
                address: location.address,
                latitude: location.latitude?.toString() ?? "",
                longitude: location.longitude?.toString() ?? "",
              }));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website-address">Address</Label>
          <Textarea
            id="website-address"
            name="address"
            rows={3}
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="website-copyright-text">Copyright text</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-muted-foreground inline-flex items-center justify-center"
                  aria-label="About copyright text"
                >
                  <Info className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Will show at the left side of the footer</TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="website-copyright-text"
            name="copyright_text"
            value={values.copyrightText}
            onChange={(event) =>
              setValues((current) => ({ ...current, copyrightText: event.target.value }))
            }
          />
        </div>

        {syncError ? <p className="text-destructive text-sm" role="alert">{syncError}</p> : null}
        {state.message ? <p className="text-destructive text-sm" role="alert">{state.message}</p> : null}

        <div className="flex justify-start">
          <Button type="submit" disabled={pending || syncPending || pictureUploading || coverUploading}>
            {pending || pictureUploading || coverUploading ? <Loader2 className="size-4 animate-spin" /> : null}
            {pictureUploading || coverUploading ? "Uploading..." : pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form> : <>
        {pagesLoading ? <p className="text-muted-foreground p-4 text-sm">Loading pages...</p> : null}
        {pagesError ? <p className="text-destructive p-4 text-sm" role="alert">{pagesError}</p> : null}
        {pages ? (
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Nav bar</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.length === 0 ? (
                  <TableEmptyState colSpan={4}>No pages found.</TableEmptyState>
                ) : (
                  pages.map((page) => (
                    <TableRow key={`${page.slug}-${page.rank}`}>
                      <TableCell className="max-w-64 whitespace-normal">
                        <div className="font-medium">{page.title || "Untitled page"}</div>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">/{page.slug}</TableCell>
                      <TableCell>{page.nav ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/websites/${encodeURIComponent(websiteId)}/pages/${encodeURIComponent(page.id)}?return_to=${encodeURIComponent(`/websites/${websiteId}?tab=pages`)}`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
          </Table>
        ) : null}
      </>}
        </CardContent>
      </Card>

      {activeTab === "profile" ? <div className="pt-5">
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
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
              <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
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
      </div> : null}
    </div>
  );
}
