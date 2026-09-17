"use client";

import { Upload, X } from "lucide-react";
import { useDropzone, type Accept } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT_BY_FORMAT: Record<string, Accept | undefined> = {
  IMAGE: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
  VIDEO: { "video/mp4": [".mp4"], "video/3gpp": [".3gp"] },
  DOCUMENT: { "application/pdf": [".pdf"] },
};

const MAX_SIZE_BY_FORMAT: Record<string, number> = {
  IMAGE: 5 * 1024 * 1024,
  DOCUMENT: 16 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
};

const SUPPORTED_TYPES_BY_FORMAT: Record<string, string> = {
  IMAGE: ".jpg, .jpeg, .png (max 5 MB)",
  DOCUMENT: ".pdf (max 16 MB)",
  VIDEO: ".mp4, .3gp (max 100 MB)",
};

export function MediaDropzone({
  format,
  file,
  onChange,
}: {
  format: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: ACCEPT_BY_FORMAT[format],
    maxSize: MAX_SIZE_BY_FORMAT[format],
    maxFiles: 1,
    multiple: false,
    onDropAccepted: ([acceptedFile]) => onChange(acceptedFile ?? null),
  });

  return (
    <div className="space-y-2">
      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-input hover:bg-muted/40 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
            isDragActive && "border-primary bg-muted/40",
          )}
        >
          <input {...getInputProps()} />
          <Upload className="text-muted-foreground size-5" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop the file here" : `Drag and drop ${format.toLowerCase()} here`}
          </p>
          <p className="text-muted-foreground text-xs">or click to browse</p>
          <p className="text-muted-foreground text-xs">{SUPPORTED_TYPES_BY_FORMAT[format]}</p>
        </div>
      ) : null}
      {file ? (
        <div className="bg-muted flex items-center justify-between gap-2 rounded-md p-2 text-sm">
          <span className="min-w-0 truncate">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${file.name}`}
            onClick={() => onChange(null)}
          >
            <X />
          </Button>
        </div>
      ) : null}
      {fileRejections.length > 0 ? (
        <p className="text-destructive text-sm">
          Select a supported {format.toLowerCase()} file: {SUPPORTED_TYPES_BY_FORMAT[format]}.
        </p>
      ) : null}
    </div>
  );
}
