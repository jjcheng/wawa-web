"use client";

import ImageExtension from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, ImagePlus, Italic, Loader2, Strikethrough } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CharacterCounter } from "@/components/character-counter";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { WebsitePage } from "@/lib/api/types";
import { toast } from "@/lib/toast";

type PendingImage = {
  file: File;
  previewUrl: string;
};

type FieldErrors = Partial<Record<"title" | "slug" | "content", string>>;

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._~-]/g, "")
    .slice(0, 50);
}

export function WebsitePageForm({
  websiteId,
  websiteUrl,
  page,
  returnTo,
}: {
  websiteId: string;
  websiteUrl?: string;
  page?: WebsitePage;
  returnTo: string;
}) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [description, setDescription] = useState(page?.description ?? "");
  const [showInNavigation, setShowInNavigation] = useState(page?.nav ?? false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editor = useEditor({
    extensions: [StarterKit, ImageExtension],
    content: page?.content ?? "",
    immediatelyRender: false,
    onUpdate: () => {
      setFieldErrors((current) => {
        if (!current.content) return current;
        return { ...current, content: undefined };
      });
    },
    editorProps: {
      attributes: {
        class: "min-h-64 px-3 py-3 text-sm leading-6 outline-none [&_h1]:my-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-medium [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-md",
      },
    },
  });
  const fullUrl = websiteUrl ? `${websiteUrl.replace(/\/$/, "")}/${slug}` : "";

  function addImage(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setPendingImages((current) => [...current, { file, previewUrl }]);
    editor?.chain().focus().setImage({ src: previewUrl, alt: file.name }).run();
  }

  async function savePage() {
    if (!editor || saving) return;
    const content = editor.getHTML();
    const validationErrors: FieldErrors = {
      title: title.trim() ? undefined : "Enter a title.",
      slug: slug.trim() ? undefined : "Enter a slug.",
      content: editor.isEmpty ? "Enter page content." : undefined,
    };
    if (validationErrors.title || validationErrors.slug || validationErrors.content) {
      setFieldErrors(validationErrors);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      let uploadedContent = content;
      const imageUrls: string[] = [];
      for (const image of pendingImages) {
        const media = await apiFetch<{ url?: string }>("v1/wa/media", {
          method: "POST",
          rawBody: image.file,
          contentType: image.file.type,
          query: { to_meta: "false", filename: image.file.name, content_type: image.file.type },
        });
        if (!media.url) throw new Error("Image upload did not return a URL.");
        uploadedContent = uploadedContent.split(image.previewUrl).join(media.url);
        imageUrls.push(media.url);
      }

      await apiFetch<WebsitePage>(
        page
          ? `v1/commerce/pages/${encodeURIComponent(page.id)}`
          : `v1/commerce/websites/${encodeURIComponent(websiteId)}/pages`,
        {
        method: page ? "PATCH" : "POST",
        body: {
          slug: slug.trim(),
          title: title.trim(),
          description: description.trim(),
          content: uploadedContent,
          image_urls: imageUrls,
          nav: showInNavigation,
        },
        },
      );
      pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      toast.success(page ? "Page updated." : "Page created.");
      router.push(returnTo);
    } catch (error) {
      const apiError = toApiError(error);
      const apiFieldErrors = apiError.inputErrors.reduce<FieldErrors>((current, inputError) => {
        const field = inputError.field.toLowerCase();
        if (field === "title" || field === "slug" || field === "content") {
          current[field] = inputError.message;
        }
        return current;
      }, {});
      setFieldErrors(apiFieldErrors);
      setSaveError(Object.keys(apiFieldErrors).length === 0 ? apiError.message : null);
    } finally {
      setSaving(false);
    }
  }

  async function deletePage() {
    if (!page || deleting) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await apiFetch(`v1/commerce/pages/${encodeURIComponent(page.id)}`, { method: "DELETE" });
      pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      toast.success("Page deleted.");
      router.push(returnTo);
    } catch (error) {
      setSaveError(toApiError(error).message);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="max-w-2xl rounded-md">
        <CardContent className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="website-page-title">Title</Label>
        <div className="relative">
          <Input
            id="website-page-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFieldErrors((current) => ({ ...current, title: undefined }));
            }}
            maxLength={60}
            required
            placeholder="Enter page title"
            aria-invalid={Boolean(fieldErrors.title)}
            className="pr-16"
          />
          <CharacterCounter value={title} maxLength={60} />
        </div>
        {fieldErrors.title ? <p className="text-destructive text-sm">{fieldErrors.title}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="website-page-slug">Slug</Label>
        <div className="relative">
          <Input
            id="website-page-slug"
            value={slug}
            onChange={(event) => {
              setSlug(normalizeSlug(event.target.value));
              setFieldErrors((current) => ({ ...current, slug: undefined }));
            }}
            maxLength={30}
            required
            placeholder="Enter page url slug"
            aria-invalid={Boolean(fieldErrors.slug)}
            className="pr-16"
          />
          <CharacterCounter value={slug} maxLength={30} />
        </div>
        {fieldErrors.slug ? <p className="text-destructive text-sm">{fieldErrors.slug}</p> : null}
        {fullUrl ? <p className="text-muted-foreground text-sm">Full URL: {fullUrl}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="website-page-description">Description (optional)</Label>
        <div className="relative">
          <Textarea
            id="website-page-description"
            rows={3}
            maxLength={255}
            value={description}
            placeholder="Enter page description"
            className="pr-16"
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="text-muted-foreground pointer-events-none absolute top-2 right-3 text-sm">
            {description.length}/255
          </span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={showInNavigation} onChange={(event) => setShowInNavigation(event.target.checked)} />
        Show in nav bar
      </label>
      <div className="space-y-2">
        <Label>Content</Label>
        <div className={fieldErrors.content ? "border border-destructive" : "border"}>
          <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2">
            <Button type="button" size="sm" variant="ghost" aria-label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold />
            </Button>
            <Button type="button" size="sm" variant="ghost" aria-label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic />
            </Button>
            <Button type="button" size="sm" variant="ghost" aria-label="Strike through" onClick={() => editor?.chain().focus().toggleStrike().run()}>
            <Strikethrough />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
            Title
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            Subtitle
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor?.chain().focus().setParagraph().run()}>
            Body
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()}>
            <ImagePlus />
            Upload image
            </Button>
            <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) addImage(file);
              event.target.value = "";
            }}
            />
          </div>
          <EditorContent editor={editor} />
        </div>
        {fieldErrors.content ? <p className="text-destructive text-sm">{fieldErrors.content}</p> : null}
      </div>
      {saveError ? <p className="text-destructive text-sm" role="alert">{saveError}</p> : null}
      <div className="flex justify-start">
        <Button type="button" onClick={() => void savePage()} disabled={saving || !editor}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
        </CardContent>
      </Card>
      {page ? (
        <div className="pt-5">
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>
              Delete page
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete page?</DialogTitle>
                <DialogDescription>This action permanently deletes the page and cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={deleting}>Cancel</Button>
                </DialogClose>
                <Button type="button" variant="destructive" onClick={() => void deletePage()} disabled={deleting}>
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </>
  );
}
