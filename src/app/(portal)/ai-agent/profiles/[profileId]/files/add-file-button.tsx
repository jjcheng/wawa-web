"use client";

import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

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
import { cn } from "@/lib/utils";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tif", ".tiff"],
  "image/bmp": [".bmp"],
  "text/markdown": [".md"],
  "text/plain": [".txt"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};
const SUPPORTED_TYPES = ".pdf, .jpg, .jpeg, .png, .tif, .tiff, .bmp, .md, .txt, .doc, .docx";

export function AddFileButton({ profileId }: { profileId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxFiles: 1,
    multiple: false,
    disabled: uploading,
    onDropAccepted: ([accepted]) => {
      setFile(accepted ?? null);
      setError(null);
    },
    onDropRejected: () => setError(`Select a supported file: ${SUPPORTED_TYPES}.`),
  });

  function handleOpenChange(next: boolean) {
    if (uploading) return;
    setOpen(next);
    if (next) {
      setFile(null);
      setInstruction("");
      setIdentifier("");
      setError(null);
    }
  }

  async function handleAdd() {
    if (!file || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const media = await apiFetch<{ url?: string }>("v1/wa/media", {
        method: "POST",
        rawBody: file,
        contentType: file.type,
        query: { to_meta: "false", filename: file.name, content_type: file.type },
      });
      if (!media.url) throw new Error("File upload did not return a URL.");
      await apiFetch(`v1/ai-agent/profiles/${profileId}/files`, {
        method: "POST",
        body: {
          profile_id: profileId,
          name: file.name,
          url: media.url,
          instruction: instruction.trim(),
          ...(identifier.trim() ? { identifier: identifier.trim() } : {}),
        },
      });
      toast.success("File added.");
      setOpen(false);
      router.refresh();
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setError(
        [
          apiError.message,
          ...apiError.inputErrors.map((item) =>
            item.field ? `${item.field}: ${item.message}` : item.message,
          ),
        ].join("\n"),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="rounded-full"
        onClick={() => handleOpenChange(true)}
      >
        Add file
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add file</DialogTitle>
            <DialogDescription>Upload a file this AI agent can reference.</DialogDescription>
          </DialogHeader>
          {file ? (
            <div className="bg-muted flex items-center justify-between gap-2 rounded-md p-2 text-sm">
              <span className="min-w-0 truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${file.name}`}
                disabled={uploading}
                onClick={() => setFile(null)}
              >
                <X />
              </Button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                "border-input hover:bg-muted/40 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
                isDragActive && "border-primary bg-muted/40",
              )}
            >
              <input {...getInputProps()} />
              <Upload className="text-muted-foreground size-5" />
              <p className="text-sm font-medium">
                {isDragActive ? "Drop the file here" : "Drag and drop a file here"}
              </p>
              <p className="text-muted-foreground text-xs">or click to browse</p>
              <p className="text-muted-foreground text-xs">{SUPPORTED_TYPES}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="file-instruction">Instruction</Label>
            <Textarea
              id="file-instruction"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              rows={4}
              disabled={uploading}
            />
            <p className="text-muted-foreground text-xs">
              Enter any special instruction you want to highlight when parsing this file.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-identifier">Identifier</Label>
            <Input
              id="file-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={uploading}
            />
            <p className="text-muted-foreground text-xs">
              If this file is about a specific product, enter the name here. This is
              useful if you will upload files for other products.
            </p>
          </div>
          {error ? (
            <p className="text-destructive text-sm whitespace-pre-line" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              disabled={!file || uploading}
              onClick={() => void handleAdd()}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
              {uploading ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
