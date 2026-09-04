"use client";

import { Upload, X } from "lucide-react";
import { useDropzone, type Accept } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT_BY_FORMAT: Record<string, Accept | undefined> = {
  IMAGE: { "image/*": [] },
  VIDEO: { "video/*": [] },
  DOCUMENT: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "text/csv": [".csv"],
  },
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
    maxFiles: 1,
    multiple: false,
    onDropAccepted: ([acceptedFile]) => onChange(acceptedFile ?? null),
  });

  return (
    <div className="space-y-2">
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
      </div>
      {file ? (
        <div className="bg-muted flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm">
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
          Select a supported {format.toLowerCase()} file.
        </p>
      ) : null}
    </div>
  );
}
