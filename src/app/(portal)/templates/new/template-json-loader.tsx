"use client";

import { FileUp } from "lucide-react";
import { useRef, useSyncExternalStore, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export const TEMPLATE_JSON_LOAD_EVENT = "template-json-load";

function subscribe() {
  return () => {};
}

function isLocalhost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function isNotLocalhost() {
  return false;
}

export function TemplateJsonLoader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const localhost = useSyncExternalStore(subscribe, isLocalhost, isNotLocalhost);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Template JSON must be an object.");
      }
      window.dispatchEvent(
        new CustomEvent(TEMPLATE_JSON_LOAD_EVENT, { detail: value }),
      );
      toast.success("Template JSON loaded.");
    } catch (error) {
      toast.error(error instanceof SyntaxError ? "Invalid JSON file." : "Template JSON must be an object.");
    }
  }

  if (!localhost) return null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        <FileUp className="size-4" />
        Load template JSON
      </Button>
    </>
  );
}
