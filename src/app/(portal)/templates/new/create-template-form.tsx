"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react";
import {
  ChevronDown,
  Copy,
  CornerUpLeft,
  FileText,
  Globe,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  Phone,
  Smile,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/toast";

import { MediaDropzone } from "@/components/media-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { ApiError, toApiError } from "@/lib/api/errors";
import {
  BODY_TEXT_MAX_LENGTH,
  createTemplateSchema,
  FOOTER_TEXT_MAX_LENGTH,
  HEADER_TEXT_MAX_LENGTH,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LANGUAGES,
  TEMPLATE_NAME_MAX_LENGTH,
  TEMPLATE_VARIABLE_MAX_LENGTH,
  toTemplateComponents,
  type CreateTemplateInput,
} from "@/lib/api/schemas";
import type { Template } from "@/lib/api/types";
import { useSelectedSampleTemplate } from "./template-source-context";
import { TEMPLATE_JSON_LOAD_EVENT } from "./template-json-loader";
import type { WabaOption } from "@/lib/waba-options";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const FORM_FIELDS: (keyof CreateTemplateInput)[] = [
  "waba_id",
  "name",
  "language",
  "category",
  "media_sample",
  "header_text",
  "body_text",
];

const MEDIA_SAMPLE_LABELS: Record<CreateTemplateInput["media_sample"], string> = {
  NONE: "Text",
  IMAGE: "Image",
  VIDEO: "Video",
  DOCUMENT: "Document",
  LOCATION: "Location",
};

const HEADER_TYPE_OPTIONS = [
  { value: "NONE", label: "Text", Icon: Type },
  { value: "IMAGE", label: "Image", Icon: ImageIcon },
  { value: "VIDEO", label: "Video", Icon: Video },
  { value: "DOCUMENT", label: "Document", Icon: FileText },
  { value: "LOCATION", label: "Location", Icon: MapPin },
] as const;

const MEDIA_FILE_SAMPLE_TYPES: CreateTemplateInput["media_sample"][] = [
  "IMAGE",
  "VIDEO",
  "DOCUMENT",
];

const BODY_FORMAT_CONTROLS = [
  { label: "B", ariaLabel: "Bold", start: "*", end: "*", className: "font-medium" },
  { label: "I", ariaLabel: "Italic", start: "_", end: "_", className: "font-serif italic" },
  { label: "S", ariaLabel: "Strikethrough", start: "~", end: "~", className: "line-through" },
  { label: "</>", ariaLabel: "Monospace", start: "``", end: "``", className: "font-mono" },
] as const;

const TEMPLATE_BUTTON_OPTIONS = [
  { type: "CUSTOM", label: "Custom", Icon: CornerUpLeft },
  { type: "VISIT_WEBSITE", label: "Visit website", Icon: Globe },
  { type: "CALL_PHONE", label: "Call phone number", Icon: Phone },
  { type: "COPY_CODE", label: "Copy offer code", Icon: Copy },
] as const;

type TemplateButton =
  | { type: "CUSTOM"; text: string }
  | {
      type: "VISIT_WEBSITE";
      text: string;
      url: string;
      urlType: "STATIC" | "DYNAMIC";
      urlPath: string;
      urlSuffix: string;
    }
  | { type: "CALL_PHONE"; text: string; phoneNumber: string }
  | { type: "COPY_CODE"; text: string; offerCode: string };

type TemplateButtonType = TemplateButton["type"];
type MediaHeaderUploadResponse = {
  h?: string;
  id?: string;
  header_handle?: string;
  handle?: string;
};

const TEMPLATE_BUTTON_TEXT_MAX_LENGTH = 25;
const TEMPLATE_BUTTON_URL_MAX_LENGTH = 2000;
const TEMPLATE_BUTTON_PHONE_MAX_LENGTH = 20;
const TEMPLATE_BUTTON_OFFER_CODE_MAX_LENGTH = 20;
const LOCATION_HEADER_PREVIEW_IMAGE_URL = new URL(
  "https://maps.googleapis.com/maps/api/staticmap",
);
LOCATION_HEADER_PREVIEW_IMAGE_URL.searchParams.set("center", "1.32,103.85");
LOCATION_HEADER_PREVIEW_IMAGE_URL.searchParams.set("zoom", "17");
LOCATION_HEADER_PREVIEW_IMAGE_URL.searchParams.set("size", "450x450");
LOCATION_HEADER_PREVIEW_IMAGE_URL.searchParams.set("maptype", "roadmap");
LOCATION_HEADER_PREVIEW_IMAGE_URL.searchParams.set("markers", "color:red|1.32,103.85");
LOCATION_HEADER_PREVIEW_IMAGE_URL.searchParams.set(
  "key",
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
);
const HEADER_VARIABLE = "{{1}}";
const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*\d+\s*\}\}/g;
const TEMPLATE_NAME_CHARACTER_PATTERN = /^[a-z0-9_]$/;
const TEMPLATE_NAME_INVALID_CHARACTER_PATTERN = /[^a-z0-9_]/g;
const MIN_BODY_TEXT_BEFORE_VARIABLE = 15;

function withHeaderVariable(text: string) {
  if (!text || /\s$/.test(text)) return `${text}${HEADER_VARIABLE}`;

  const withSeparator = `${text} ${HEADER_VARIABLE}`;
  return withSeparator.length <= HEADER_TEXT_MAX_LENGTH
    ? withSeparator
    : `${text}${HEADER_VARIABLE}`;
}

function templateVariableCount(text: string) {
  return text.match(TEMPLATE_VARIABLE_PATTERN)?.length ?? 0;
}

function templateVariableNames(text: string) {
  const names: string[] = [];
  for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    const name = match[1];
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function nonVariableTextLength(text: string) {
  return text.replace(TEMPLATE_VARIABLE_PATTERN, "").trim().length;
}

function withNextBodyVariable(text: string) {
  const nextVariable = `{{${templateVariableCount(text) + 1}}}`;
  if (!text || /\s$/.test(text)) return `${text}${nextVariable} `;

  return `${text} ${nextVariable} `;
}

function textWithVariableSamples(text: string, samples: string[]) {
  const variableNames = templateVariableNames(text);
  return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, variable: string) => {
    const sample = samples[variableNames.indexOf(variable)]?.trim();
    return sample || match;
  });
}

function formatPreviewText(value: string) {
  const parts: ReactNode[] = [];
  let remaining = value;
  let key = 0;

  while (remaining.length > 0) {
    const monospaceMarker = remaining.startsWith("```")
      ? "```"
      : remaining.startsWith("``")
        ? "``"
        : null;
    if (monospaceMarker) {
      const closingIndex = remaining.indexOf(monospaceMarker, monospaceMarker.length);
      if (closingIndex >= 0) {
        parts.push(
          <code
            key={key++}
            className="rounded bg-black/10 px-1 font-mono text-[0.9em] dark:bg-white/10"
          >
            {remaining.slice(monospaceMarker.length, closingIndex)}
          </code>,
        );
        remaining = remaining.slice(closingIndex + monospaceMarker.length);
        continue;
      }
    }

    const marker = remaining[0];
    if (marker === "*" || marker === "_" || marker === "~") {
      const closingIndex = remaining.indexOf(marker, 1);
      if (closingIndex > 1) {
        const content = remaining.slice(1, closingIndex);
        if (marker === "*") {
          parts.push(
            <span key={key++} className="font-medium">
              {content}
            </span>,
          );
        } else if (marker === "_") {
          parts.push(<em key={key++}>{content}</em>);
        } else {
          parts.push(<del key={key++}>{content}</del>);
        }
        remaining = remaining.slice(closingIndex + 1);
        continue;
      }
    }

    const nextSpecial = remaining.search(/[\*_~`]/);
    const textLength =
      nextSpecial < 0 ? remaining.length : nextSpecial === 0 ? 1 : nextSpecial;
    parts.push(remaining.slice(0, textLength));
    remaining = remaining.slice(textLength);
  }

  return parts;
}

function duplicateTemplateButtonTextIndexes(buttons: TemplateButton[]) {
  const textIndexes = new Map<string, number[]>();
  buttons.forEach((button, index) => {
    const text = button.text.trim().toLowerCase();
    if (!text) return;
    textIndexes.set(text, [...(textIndexes.get(text) ?? []), index]);
  });

  const duplicateIndexes = new Set<number>();
  for (const indexes of textIndexes.values()) {
    if (indexes.length > 1) indexes.forEach((index) => duplicateIndexes.add(index));
  }
  return duplicateIndexes;
}

function emptyTemplateButtonTextIndexes(buttons: TemplateButton[]) {
  const indexes = new Set<number>();
  buttons.forEach((button, index) => {
    if (!button.text.trim()) indexes.add(index);
  });
  return indexes;
}

function isValidWebsiteUrl(value: string) {
  try {
    const url = new URL(value.replace(/\{\{1\}\}$/, ""));
    const hostnameParts = url.hostname.split(".");
    return (
      ["http:", "https:"].includes(url.protocol) &&
      hostnameParts.length >= 2 &&
      hostnameParts.every(Boolean) &&
      hostnameParts.at(-1)!.length >= 2
    );
  } catch {
    return false;
  }
}

function invalidWebsiteButtonUrlIndexes(buttons: TemplateButton[]) {
  const indexes = new Set<number>();
  buttons.forEach((button, index) => {
    const value =
      button.type === "VISIT_WEBSITE" && button.urlType === "DYNAMIC"
        ? `${button.url}${button.urlPath}{{1}}`
        : button.type === "VISIT_WEBSITE"
          ? button.url
          : "";
    if (button.type === "VISIT_WEBSITE" && !isValidWebsiteUrl(value.trim())) {
      indexes.add(index);
    }
  });
  return indexes;
}

function emptyDynamicUrlPathIndexes(buttons: TemplateButton[]) {
  const indexes = new Set<number>();
  buttons.forEach((button, index) => {
    if (
      button.type === "VISIT_WEBSITE" &&
      button.urlType === "DYNAMIC" &&
      !button.urlPath.trim()
    ) {
      indexes.add(index);
    }
  });
  return indexes;
}

function overlongWebsiteUrlIndexes(buttons: TemplateButton[]) {
  const indexes = new Set<number>();
  buttons.forEach((button, index) => {
    const value =
      button.type === "VISIT_WEBSITE" && button.urlType === "DYNAMIC"
        ? `${button.url}${button.urlPath}{{1}}`
        : button.type === "VISIT_WEBSITE"
          ? button.url
          : "";
    if (button.type === "VISIT_WEBSITE" && value.length > TEMPLATE_BUTTON_URL_MAX_LENGTH) {
      indexes.add(index);
    }
  });
  return indexes;
}

function emptyPhoneButtonNumberIndexes(buttons: TemplateButton[]) {
  const indexes = new Set<number>();
  buttons.forEach((button, index) => {
    if (button.type === "CALL_PHONE" && !button.phoneNumber.trim()) indexes.add(index);
  });
  return indexes;
}

function emptyCopyCodeButtonOfferCodeIndexes(buttons: TemplateButton[]) {
  const indexes = new Set<number>();
  buttons.forEach((button, index) => {
    if (button.type === "COPY_CODE" && !button.offerCode.trim()) indexes.add(index);
  });
  return indexes;
}

function hasSingleUseButton(
  buttons: TemplateButton[],
  type: Exclude<TemplateButtonType, "CUSTOM">,
) {
  return buttons.some((button) => button.type === type);
}

function subscribeToLocationSnapshot() {
  return () => {};
}

function isLocalhostSnapshot() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function serverIsLocalhostSnapshot() {
  return false;
}

function templateButtonsComponent(buttons: TemplateButton[]) {
  if (buttons.length === 0) return null;

  return {
    type: "BUTTONS",
    buttons: buttons.map((button) => {
      if (button.type === "VISIT_WEBSITE") {
        const url =
          button.urlType === "DYNAMIC" ? `${button.url}${button.urlPath}{{1}}` : button.url;
        return {
          type: "URL",
          text: button.text,
          url,
          ...(button.urlType === "DYNAMIC"
            ? { example: [url.replace("{{1}}", "example")] }
            : {}),
        };
      }
      if (button.type === "CALL_PHONE") {
        return {
          type: "PHONE_NUMBER",
          text: button.text,
          phone_number: button.phoneNumber,
        };
      }
      if (button.type === "COPY_CODE") {
        return { type: "COPY_CODE", text: button.text, example: [button.offerCode] };
      }
      return { type: "QUICK_REPLY", text: button.text };
    }),
  };
}

function templateComponents(values: CreateTemplateInput, buttons: TemplateButton[]) {
  const buttonComponent = templateButtonsComponent(buttons);
  return [...toTemplateComponents(values), ...(buttonComponent ? [buttonComponent] : [])];
}

function metaTemplateComponentsPreview(
  values: CreateTemplateInput,
  buttons: TemplateButton[],
) {
  return templateComponents(values, buttons).map((component) => {
    const componentRecord = component as Record<string, unknown>;
    if (
      componentRecord.type === "HEADER" &&
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(String(componentRecord.format))
    ) {
      return {
        ...componentRecord,
        example: { header_handle: ["<HEADER_HANDLE>"] },
      };
    }
    return component;
  });
}

function templateComponentsWithHeaderHandle(
  values: CreateTemplateInput,
  buttons: TemplateButton[],
  headerHandle: string,
) {
  return templateComponents(values, buttons).map((component) => {
    const componentRecord = component as Record<string, unknown>;
    if (
      componentRecord.type === "HEADER" &&
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(String(componentRecord.format))
    ) {
      return {
        ...componentRecord,
        example: { header_handle: [headerHandle] },
      };
    }
    return component;
  });
}

function templateComponent(template: Template, type: string) {
  return template.components?.find(
    (component) => String(component.type ?? "").toUpperCase() === type,
  );
}

function templateText(component: Record<string, unknown> | undefined) {
  return typeof component?.text === "string" ? component.text : "";
}

function templateExampleValues(component: Record<string, unknown> | undefined, key: string) {
  const example = component?.example;
  if (!example || typeof example !== "object") return [];
  const values = (example as Record<string, unknown>)[key];
  return Array.isArray(values)
    ? values.flatMap((value) => (Array.isArray(value) ? value.map(String) : [String(value)]))
    : [];
}

function templateHeaderHandle(component: Record<string, unknown> | undefined) {
  return templateExampleValues(component, "header_handle")[0] || null;
}

function templateCategory(value: string | undefined): CreateTemplateInput["category"] {
  const normalizedValue = value?.trim().toUpperCase();
  return TEMPLATE_CATEGORIES.find((option) => option === normalizedValue) ?? "MARKETING";
}

function splitDynamicWebsiteUrl(value: string) {
  const markerIndex = value.indexOf("{{1}}");
  if (markerIndex < 0) return { url: value, urlPath: "", urlType: "STATIC" as const };

  const prefix = value.slice(0, markerIndex);
  try {
    const parsedUrl = new URL(prefix);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    return {
      url: baseUrl,
      urlPath: prefix.slice(baseUrl.length) || "/",
      urlType: "DYNAMIC" as const,
    };
  } catch {
    return { url: prefix, urlPath: "", urlType: "DYNAMIC" as const };
  }
}

function templateButtonsFromTemplate(template: Template): TemplateButton[] {
  const component = template.components?.find(
    (item) => String(item.type ?? "").toUpperCase() === "BUTTONS",
  );
  if (!Array.isArray(component?.buttons)) return [];

  const buttons: TemplateButton[] = [];
  for (const item of component.buttons) {
    if (!item || typeof item !== "object") continue;
    const button = item as Record<string, unknown>;
    const type = String(button.type ?? "").toUpperCase();
    const text = typeof button.text === "string" ? button.text : "";
    if (type === "URL") {
      const parsedUrl = splitDynamicWebsiteUrl(String(button.url ?? ""));
      const isLegacyDynamic = String(button.url_type ?? "").toUpperCase() === "DYNAMIC";
      buttons.push({
        type: "VISIT_WEBSITE",
        text,
        url: parsedUrl.url,
        urlType: isLegacyDynamic || parsedUrl.urlType === "DYNAMIC" ? "DYNAMIC" : "STATIC",
        urlPath: isLegacyDynamic
          ? String(button.url_path ?? parsedUrl.urlPath ?? "/")
          : parsedUrl.urlPath,
        urlSuffix: isLegacyDynamic || parsedUrl.urlType === "DYNAMIC" ? "{{1}}" : "",
      });
      continue;
    }
    if (type === "PHONE_NUMBER") {
      const phoneNumber = String(button.phone_number ?? "").replace(/\D/g, "");
      buttons.push({
        type: "CALL_PHONE",
        text,
        phoneNumber,
      });
      continue;
    }
    if (type === "COPY_CODE") {
      buttons.push({
        type: "COPY_CODE",
        text: "Copy offer code",
        offerCode: String(button.example ?? ""),
      });
      continue;
    }
    if (type === "QUICK_REPLY") buttons.push({ type: "CUSTOM", text });
  }
  return buttons;
}

function templateFormValues(template: Template, wabaId: string): CreateTemplateInput {
  const header = templateComponent(template, "HEADER");
  const body = templateComponent(template, "BODY");
  const footer = templateComponent(template, "FOOTER");
  const headerFormat = String(header?.format ?? "NONE").toUpperCase();
  const mediaSample = ["NONE", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"].includes(headerFormat)
    ? (headerFormat as CreateTemplateInput["media_sample"])
    : "NONE";
  const category = templateCategory(template.category);
  const language =
    TEMPLATE_LANGUAGES.find((option) => option.code === template.language)?.code ?? "en";
  const bodySamples = templateExampleValues(body, "body_text");

  return {
    waba_id: wabaId,
    name: template.name?.replace(/^api_/, "") ?? "",
    language,
    category,
    media_sample: mediaSample,
    header_text: mediaSample === "NONE" ? templateText(header) : "",
    header_variable_samples: templateExampleValues(header, "header_text"),
    body_text: templateText(body),
    body_variable_samples: Array.isArray(bodySamples[0])
      ? bodySamples[0].map(String)
      : bodySamples,
    footer_text: templateText(footer),
  };
}

export function CreateTemplateForm({
  waba,
  initialTemplate,
}: {
  waba: WabaOption;
  initialTemplate?: Template;
}) {
  const isEditing = Boolean(initialTemplate);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLocalhost = useSyncExternalStore(
    subscribeToLocationSnapshot,
    isLocalhostSnapshot,
    serverIsLocalhostSnapshot,
  );
  const selectedSample = useSelectedSampleTemplate();
  const [mediaSampleFile, setMediaSampleFile] = useState<File | null>(null);
  const [existingHeaderHandle, setExistingHeaderHandle] = useState<string | null>(() =>
    initialTemplate
      ? templateHeaderHandle(templateComponent(initialTemplate, "HEADER"))
      : null,
  );
  const [existingHeaderUrl, setExistingHeaderUrl] = useState<string | null>(() =>
    initialTemplate
      ? templateHeaderHandle(templateComponent(initialTemplate, "HEADER"))
      : null,
  );
  const [headerTypeOpen, setHeaderTypeOpen] = useState(false);
  const [buttonOptionsOpen, setButtonOptionsOpen] = useState(false);
  const [templateButtons, setTemplateButtons] = useState<TemplateButton[]>(() =>
    initialTemplate ? templateButtonsFromTemplate(initialTemplate) : [],
  );
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [bodyVariableTextAttempted, setBodyVariableTextAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const headerInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateTemplateInput>({
    resolver: zodResolver(createTemplateSchema),
    mode: "onChange",
    defaultValues: initialTemplate
      ? templateFormValues(initialTemplate, waba.wabaId)
      : {
          waba_id: waba.wabaId,
          name: "",
          language: "en",
          category: "MARKETING",
          media_sample: "NONE",
          header_text: "",
          header_variable_samples: [],
          body_text: "",
          body_variable_samples: [],
          footer_text: "",
        },
  });

  const mediaSample = useWatch({ control, name: "media_sample" }) ?? "NONE";

  useEffect(() => {
    function handleTemplateJsonLoad(event: Event) {
      const detail = (event as CustomEvent<Template>).detail;
      if (!detail || typeof detail !== "object" || !Array.isArray(detail.components)) return;
      reset(templateFormValues(detail, waba.wabaId));
      setTemplateButtons(templateButtonsFromTemplate(detail));
      const headerUrl = templateHeaderHandle(templateComponent(detail, "HEADER"));
      setExistingHeaderHandle(headerUrl);
      setExistingHeaderUrl(headerUrl);
    }

    window.addEventListener(TEMPLATE_JSON_LOAD_EVENT, handleTemplateJsonLoad);
    return () => window.removeEventListener(TEMPLATE_JSON_LOAD_EVENT, handleTemplateJsonLoad);
  }, [reset, waba.wabaId]);

  useEffect(() => {
    if (!selectedSample || initialTemplate) return;

    const componentText = (type: string) => {
      const text = selectedSample.components?.find(
        (component) => String(component.type ?? "").toUpperCase() === type,
      )?.text;
      return typeof text === "string" ? text : "";
    };
    const category = templateCategory(selectedSample.category);

    reset({
      waba_id: waba.wabaId,
      name: selectedSample.name ?? "",
      language: selectedSample.language ?? "en",
      category,
      media_sample: "NONE",
      header_text: componentText("HEADER"),
      header_variable_samples: [],
      body_text: componentText("BODY"),
      body_variable_samples: [],
      footer_text: componentText("FOOTER"),
    });
  }, [initialTemplate, reset, selectedSample, waba.wabaId]);

  useEffect(() => {
    const canPreviewMedia =
      (mediaSample === "IMAGE" && mediaSampleFile?.type.startsWith("image/")) ||
      (mediaSample === "VIDEO" && mediaSampleFile?.type.startsWith("video/")) ||
      (mediaSample === "DOCUMENT" && mediaSampleFile?.type === "application/pdf");
    if (!canPreviewMedia || !mediaSampleFile) {
      queueMicrotask(() => setPreviewMediaUrl(null));
      return;
    }

    const mediaUrl = URL.createObjectURL(mediaSampleFile);
    let active = true;
    queueMicrotask(() => {
      if (active) setPreviewMediaUrl(mediaUrl);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaSample, mediaSampleFile]);

  const mutation = useMutation({
    mutationFn: async (values: CreateTemplateInput) => {
      let components = templateComponents(values, templateButtons);
      if (MEDIA_FILE_SAMPLE_TYPES.includes(values.media_sample)) {
        if (!mediaSampleFile && !existingHeaderHandle) {
          throw new ApiError(
            `Upload a ${MEDIA_SAMPLE_LABELS[values.media_sample].toLowerCase()} file.`,
            0,
          );
        }
        let headerHandle = existingHeaderHandle;
        if (mediaSampleFile) {
          console.log("[CreateTemplate] POST /api/bff/v1/wa/templates/upload-example", {
            method: "POST",
            filename: mediaSampleFile.name,
            contentType: mediaSampleFile.type,
            size: mediaSampleFile.size,
          });
          const media = await apiFetch<MediaHeaderUploadResponse>(
            "v1/wa/templates/upload-example",
            {
              method: "POST",
              rawBody: mediaSampleFile,
              contentType: mediaSampleFile.type,
              query: {
                filename: mediaSampleFile.name,
              },
            },
          );
          headerHandle = media.h ?? media.id ?? media.header_handle ?? media.handle ?? null;
        }
        if (!headerHandle)
          throw new ApiError("Media upload did not return a header handle.", 0);
        components = templateComponentsWithHeaderHandle(values, templateButtons, headerHandle);
      }

      const payload = {
        ...(initialTemplate ? { id: initialTemplate.id } : {}),
        name: values.name,
        language: values.language,
        category: templateCategory(values.category),
        parameter_format: "POSITIONAL",
        components,
      };
      console.log("[CreateTemplate] POST /api/bff/v1/wa/templates", {
        method: "POST",
        body: payload,
      });

      return apiFetch<Template>("v1/wa/templates", {
        method: "POST",
        body: payload,
      });
    },
    onMutate: () => {
      setSubmitError(null);
    },
    onSuccess: () => {
      setSubmitError(null);
      toast.success("Template submitted to Meta for review.");
      router.push("/templates");
      router.refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setSubmitError(apiError.message);
      if (apiError instanceof ApiError && apiError.inputErrors.length > 0) {
        for (const inputError of apiError.inputErrors) {
          const field = FORM_FIELDS.find((name) => name === inputError.field);
          if (field) setError(field, { message: inputError.message });
        }
        return;
      }
    },
  });

  const language = useWatch({ control, name: "language" }) ?? "en";
  const category = useWatch({ control, name: "category" }) ?? "MARKETING";
  const templateName = useWatch({ control, name: "name" }) ?? "";
  const headerText = useWatch({ control, name: "header_text" }) ?? "";
  const headerVariableSamples = useWatch({ control, name: "header_variable_samples" }) ?? [];
  const bodyText = useWatch({ control, name: "body_text" }) ?? "";
  const bodyVariableSamples = useWatch({ control, name: "body_variable_samples" }) ?? [];
  const footerText = useWatch({ control, name: "footer_text" }) ?? "";
  const languageLabel =
    TEMPLATE_LANGUAGES.find((option) => option.code === language)?.label ?? language;
  const selectedHeaderType =
    HEADER_TYPE_OPTIONS.find((option) => option.value === mediaSample) ??
    HEADER_TYPE_OPTIONS[0];
  const mediaSampleNeedsFile = MEDIA_FILE_SAMPLE_TYPES.includes(mediaSample);
  const showHeaderText = mediaSample === "NONE";
  const headerVariables = templateVariableNames(headerText);
  const bodyVariables = templateVariableNames(bodyText);
  const headerVariableCount = templateVariableCount(headerText);
  const nextHeaderText = withHeaderVariable(headerText);
  const canAddHeaderVariable =
    headerVariableCount === 0 && nextHeaderText.length <= HEADER_TEXT_MAX_LENGTH;
  const nextBodyText = withNextBodyVariable(bodyText);
  const canAddBodyVariable = nextBodyText.length <= BODY_TEXT_MAX_LENGTH;
  const duplicateButtonTextIndexes = duplicateTemplateButtonTextIndexes(templateButtons);
  const hasDuplicateButtonText = duplicateButtonTextIndexes.size > 0;
  const emptyButtonTextIndexes = emptyTemplateButtonTextIndexes(templateButtons);
  const hasEmptyButtonText = emptyButtonTextIndexes.size > 0;
  const invalidWebsiteButtonUrlIndexesSet = invalidWebsiteButtonUrlIndexes(templateButtons);
  const hasInvalidWebsiteButtonUrl = invalidWebsiteButtonUrlIndexesSet.size > 0;
  const emptyDynamicUrlPathIndexesSet = emptyDynamicUrlPathIndexes(templateButtons);
  const hasEmptyDynamicUrlPath = emptyDynamicUrlPathIndexesSet.size > 0;
  const overlongWebsiteUrlIndexesSet = overlongWebsiteUrlIndexes(templateButtons);
  const hasOverlongWebsiteUrl = overlongWebsiteUrlIndexesSet.size > 0;
  const emptyPhoneButtonNumberIndexesSet = emptyPhoneButtonNumberIndexes(templateButtons);
  const hasEmptyPhoneButtonNumber = emptyPhoneButtonNumberIndexesSet.size > 0;
  const emptyCopyCodeButtonOfferCodeIndexesSet =
    emptyCopyCodeButtonOfferCodeIndexes(templateButtons);
  const hasEmptyCopyCodeButtonOfferCode = emptyCopyCodeButtonOfferCodeIndexesSet.size > 0;
  const hasWebsiteButton = hasSingleUseButton(templateButtons, "VISIT_WEBSITE");
  const hasPhoneButton = hasSingleUseButton(templateButtons, "CALL_PHONE");
  const hasCopyCodeButton = hasSingleUseButton(templateButtons, "COPY_CODE");
  const emojiPickerTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;
  const previewHeaderText = textWithVariableSamples(headerText, headerVariableSamples);
  const previewBodyText = textWithVariableSamples(bodyText, bodyVariableSamples);
  const previewButtons = templateButtons.map((button) => ({
    type: button.type,
    text:
      button.type === "COPY_CODE" ? "Copy offer code" : button.text.trim() || "Button text",
  }));
  const previewJson = {
    ...(initialTemplate ? { id: initialTemplate.id } : {}),
    name: templateName,
    language,
    category,
    parameter_format: "POSITIONAL",
    components: metaTemplateComponentsPreview(
      {
        waba_id: waba.wabaId,
        name: templateName,
        language,
        category,
        media_sample: mediaSample,
        header_text: headerText,
        header_variable_samples: headerVariableSamples,
        body_text: bodyText,
        body_variable_samples: bodyVariableSamples,
        footer_text: footerText,
      },
      templateButtons,
    ),
  };
  const previewJsonText = JSON.stringify(previewJson, null, 2);

  function addHeaderVariable() {
    if (!canAddHeaderVariable) return;
    const input = headerInputRef.current;
    const cursorPosition = input?.selectionStart ?? headerText.length;
    const textBeforeCursor = headerText.slice(0, cursorPosition);
    const textAfterCursor = headerText.slice(cursorPosition);
    const prefix = textBeforeCursor && !/\s$/.test(textBeforeCursor) ? " " : "";
    const suffix = textAfterCursor && !/^\s/.test(textAfterCursor) ? " " : "";
    const nextHeaderValue = `${textBeforeCursor}${prefix}${HEADER_VARIABLE}${suffix}${textAfterCursor}`;
    if (nextHeaderValue.length > HEADER_TEXT_MAX_LENGTH) return;

    setValue("header_text", nextHeaderValue, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      const nextCursorPosition =
        cursorPosition + prefix.length + HEADER_VARIABLE.length + suffix.length;
      input?.focus();
      input?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function addBodyVariable() {
    if (!canAddBodyVariable) return;
    const textarea = bodyTextareaRef.current;
    const cursorPosition = textarea?.selectionStart ?? bodyText.length;
    const textBeforeCursor = bodyText.slice(0, cursorPosition);
    const textAfterCursor = bodyText.slice(cursorPosition);
    const prefix = textBeforeCursor && !/\s$/.test(textBeforeCursor) ? " " : "";
    const suffix = textAfterCursor && !/^\s/.test(textAfterCursor) ? " " : "";
    const nextBodyValue = `${textBeforeCursor}${prefix}${`{{${templateVariableCount(bodyText) + 1}}}`}${suffix}${textAfterCursor}`;
    if (nextBodyValue.length > BODY_TEXT_MAX_LENGTH) return;

    if (nonVariableTextLength(textBeforeCursor) < MIN_BODY_TEXT_BEFORE_VARIABLE) {
      setBodyVariableTextAttempted(true);
    } else {
      setBodyVariableTextAttempted(false);
    }
    setValue("body_text", nextBodyValue, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      const nextCursorPosition =
        cursorPosition +
        prefix.length +
        templateVariableCount(bodyText).toString().length +
        4 +
        suffix.length;
      textarea?.focus();
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function formatBodyText(startMarker: string, endMarker: string) {
    const textarea = bodyTextareaRef.current;
    const selectionStart = textarea?.selectionStart ?? bodyText.length;
    const selectionEnd = textarea?.selectionEnd ?? bodyText.length;
    const selectedText = bodyText.slice(selectionStart, selectionEnd);
    const nextBodyValue = `${bodyText.slice(0, selectionStart)}${startMarker}${selectedText}${endMarker}${bodyText.slice(selectionEnd)}`;

    if (nextBodyValue.length > BODY_TEXT_MAX_LENGTH) return;

    setValue("body_text", nextBodyValue, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      textarea?.focus();
      const nextSelectionStart = selectionStart + startMarker.length;
      const nextSelectionEnd = nextSelectionStart + selectedText.length;
      textarea?.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  }

  function insertBodyEmoji(emoji: string) {
    const textarea = bodyTextareaRef.current;
    const selectionStart = textarea?.selectionStart ?? bodyText.length;
    const selectionEnd = textarea?.selectionEnd ?? bodyText.length;
    const nextBodyValue = `${bodyText.slice(0, selectionStart)}${emoji}${bodyText.slice(selectionEnd)}`;

    if (nextBodyValue.length > BODY_TEXT_MAX_LENGTH) return;

    setValue("body_text", nextBodyValue, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      textarea?.focus();
      const nextCursorPosition = selectionStart + emoji.length;
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function handleBodyEmojiClick(emojiData: EmojiClickData) {
    insertBodyEmoji(emojiData.emoji);
  }

  function addCustomButton() {
    if (templateButtons.length >= 10) return;
    setTemplateButtons((currentButtons) => [
      ...currentButtons,
      { type: "CUSTOM", text: "Quick Reply" },
    ]);
    setButtonOptionsOpen(false);
  }

  function addWebsiteButton() {
    if (templateButtons.length >= 10) return;
    if (hasWebsiteButton) return;
    setTemplateButtons((currentButtons) => [
      ...currentButtons,
      {
        type: "VISIT_WEBSITE",
        text: "Visit website",
        url: "",
        urlType: "STATIC",
        urlPath: "/",
        urlSuffix: "",
      },
    ]);
    setButtonOptionsOpen(false);
  }

  function addPhoneButton() {
    if (templateButtons.length >= 10) return;
    if (hasPhoneButton) return;
    setTemplateButtons((currentButtons) => [
      ...currentButtons,
      { type: "CALL_PHONE", text: "Call phone number", phoneNumber: "" },
    ]);
    setButtonOptionsOpen(false);
  }

  function addCopyCodeButton() {
    if (templateButtons.length >= 10) return;
    if (hasCopyCodeButton) return;
    setTemplateButtons((currentButtons) => [
      ...currentButtons,
      { type: "COPY_CODE", text: "Copy offer code", offerCode: "" },
    ]);
    setButtonOptionsOpen(false);
  }

  function updateTemplateButtonText(index: number, text: string) {
    setTemplateButtons((currentButtons) =>
      currentButtons.map((button, buttonIndex) =>
        buttonIndex === index
          ? { ...button, text: text.slice(0, TEMPLATE_BUTTON_TEXT_MAX_LENGTH) }
          : button,
      ),
    );
  }

  function updateTemplateButtonPhoneNumber(index: number, phoneNumber: string) {
    setTemplateButtons((currentButtons) =>
      currentButtons.map((button, buttonIndex) =>
        buttonIndex === index && button.type === "CALL_PHONE"
          ? {
              ...button,
              phoneNumber: phoneNumber
                .replace(/\D/g, "")
                .slice(0, TEMPLATE_BUTTON_PHONE_MAX_LENGTH),
            }
          : button,
      ),
    );
  }

  function updateTemplateButtonUrl(index: number, url: string) {
    setTemplateButtons((currentButtons) =>
      currentButtons.map((button, buttonIndex) =>
        buttonIndex === index && button.type === "VISIT_WEBSITE"
          ? { ...button, url: url.slice(0, TEMPLATE_BUTTON_URL_MAX_LENGTH) }
          : button,
      ),
    );
  }

  function updateTemplateButtonUrlType(index: number, urlType: "STATIC" | "DYNAMIC") {
    setTemplateButtons((currentButtons) =>
      currentButtons.map((button, buttonIndex) =>
        buttonIndex === index && button.type === "VISIT_WEBSITE"
          ? {
              ...button,
              urlType,
              urlPath: urlType === "DYNAMIC" ? button.urlPath || "/" : "",
              urlSuffix: urlType === "DYNAMIC" ? button.urlSuffix || "{{1}}" : "",
            }
          : button,
      ),
    );
  }

  function updateTemplateButtonUrlPath(index: number, urlPath: string) {
    setTemplateButtons((currentButtons) =>
      currentButtons.map((button, buttonIndex) =>
        buttonIndex === index && button.type === "VISIT_WEBSITE"
          ? { ...button, urlPath }
          : button,
      ),
    );
  }

  function updateTemplateButtonOfferCode(index: number, offerCode: string) {
    setTemplateButtons((currentButtons) =>
      currentButtons.map((button, buttonIndex) =>
        buttonIndex === index && button.type === "COPY_CODE"
          ? {
              ...button,
              offerCode: offerCode
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, TEMPLATE_BUTTON_OFFER_CODE_MAX_LENGTH),
            }
          : button,
      ),
    );
  }

  function removeTemplateButton(index: number) {
    setTemplateButtons((currentButtons) =>
      currentButtons.filter((_, buttonIndex) => buttonIndex !== index),
    );
  }

  async function copyPreviewJson() {
    try {
      await navigator.clipboard.writeText(previewJsonText);
      toast.success("JSON copied.");
    } catch {
      toast.error("Could not copy JSON.");
    }
  }

  const bodyTextField = register("body_text");
  const headerTextField = register("header_text");

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="grid max-w-full min-w-0 items-start gap-6 min-[769px]:grid-cols-[minmax(0,28rem)_20rem] lg:grid-cols-[minmax(0,34rem)_22rem] xl:grid-cols-[minmax(0,40rem)_22rem] 2xl:grid-cols-[minmax(0,46rem)_22rem]"
    >
      <div className="w-full min-w-0 space-y-4 min-[769px]:max-w-md lg:max-w-[34rem] xl:max-w-[40rem] 2xl:max-w-[46rem]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="order_confirmation"
                maxLength={TEMPLATE_NAME_MAX_LENGTH}
                disabled={isEditing}
                className="pr-16"
                onKeyDown={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.key.length !== 1
                  ) {
                    return;
                  }
                  if (event.key === " ") return;
                  if (!TEMPLATE_NAME_CHARACTER_PATTERN.test(event.key)) event.preventDefault();
                }}
                {...register("name", {
                  onChange: (event) => {
                    event.target.value = event.target.value
                      .replaceAll(" ", "_")
                      .replace(TEMPLATE_NAME_INVALID_CHARACTER_PATTERN, "");
                  },
                })}
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                {templateName.length}/{TEMPLATE_NAME_MAX_LENGTH}
              </span>
            </div>
            {errors.name ? (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Lowercase letters, numbers and underscores.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEditing}
                >
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        {language.label} ({language.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.language ? (
              <p className="text-destructive text-sm">{errors.language.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value ?? "MARKETING"}
                onValueChange={(value) => field.onChange(templateCategory(value))}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category ? (
            <p className="text-destructive text-sm">{errors.category.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="media_sample"
            className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
          >
            Header
          </Label>
          <Controller
            control={control}
            name="media_sample"
            render={({ field }) => (
              <Popover open={headerTypeOpen} onOpenChange={setHeaderTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="media_sample"
                    type="button"
                    variant="outline"
                    className="min-w-40 justify-between font-normal"
                  >
                    <span className="flex items-center gap-2">
                      <selectedHeaderType.Icon className="size-4" />
                      {selectedHeaderType.label}
                    </span>
                    <ChevronDown className="size-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1">
                  {HEADER_TYPE_OPTIONS.map(({ value, label, Icon }) => (
                    <Button
                      key={value}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start py-2 font-normal"
                      onClick={() => {
                        field.onChange(value);
                        setHeaderTypeOpen(false);
                        setMediaSampleFile(null);
                        setExistingHeaderUrl(null);
                        setExistingHeaderHandle(null);
                        if (value !== "NONE") {
                          setValue("header_text", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          setValue("header_variable_samples", [], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.media_sample ? (
            <p className="text-destructive text-sm">{errors.media_sample.message}</p>
          ) : null}
        </div>

        {mediaSampleNeedsFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{MEDIA_SAMPLE_LABELS[mediaSample]} sample</Label>
            </div>
            <MediaDropzone
              key={`${mediaSample}-${mediaSampleFile?.name ?? "empty"}`}
              format={mediaSample}
              file={mediaSampleFile}
              onChange={(file) => {
                setMediaSampleFile(file);
                if (file) {
                  setExistingHeaderHandle(null);
                  setExistingHeaderUrl(null);
                }
              }}
            />
          </div>
        ) : null}

        {showHeaderText ? (
          <div className="space-y-2">
            <Label htmlFor="header_text">Header (optional)</Label>
            <div className="relative">
              <Input
                id="header_text"
                placeholder={`Add a short line of text to the header of your message in ${languageLabel}`}
                maxLength={HEADER_TEXT_MAX_LENGTH}
                className="pr-14"
                {...headerTextField}
                ref={(element) => {
                  headerTextField.ref(element);
                  headerInputRef.current = element;
                }}
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                {headerText.length}/{HEADER_TEXT_MAX_LENGTH}
              </span>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={addHeaderVariable}
                disabled={!canAddHeaderVariable}
              >
                + Add variable
              </Button>
            </div>
            {errors.header_text ? (
              <p className="text-destructive text-sm">{errors.header_text.message}</p>
            ) : null}
            {headerVariables.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Header variable sample</p>
                {headerVariables.map((variable, index) => (
                  <div key={variable} className="grid gap-2 sm:grid-cols-[4rem_minmax(0,1fr)]">
                    <Input
                      value={`{{${variable}}}`}
                      readOnly
                      tabIndex={-1}
                      aria-label={`Header variable ${variable}`}
                      className="bg-muted/50"
                    />
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          id={`header-variable-sample-${variable}`}
                          aria-label={`Sample text for header variable ${variable}`}
                          placeholder="Sample text"
                          maxLength={TEMPLATE_VARIABLE_MAX_LENGTH}
                          className="pr-12"
                          {...register(`header_variable_samples.${index}`)}
                        />
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                          {headerVariableSamples[index]?.length ?? 0}/
                          {TEMPLATE_VARIABLE_MAX_LENGTH}
                        </span>
                      </div>
                      {errors.header_variable_samples?.[index] ? (
                        <p className="text-destructive text-sm">
                          {errors.header_variable_samples[index]?.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 pt-3">
          <Label
            htmlFor="body_text"
            className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
          >
            Body
          </Label>
          <div className="relative">
            <Textarea
              id="body_text"
              rows={10}
              placeholder={`Enter text in ${languageLabel}`}
              maxLength={BODY_TEXT_MAX_LENGTH}
              className="min-h-[100px] pr-20"
              {...bodyTextField}
              ref={(element) => {
                bodyTextField.ref(element);
                bodyTextareaRef.current = element;
              }}
            />
            <span className="text-muted-foreground pointer-events-none absolute top-2 right-3 text-sm">
              {bodyText.length}/{BODY_TEXT_MAX_LENGTH}
            </span>
          </div>
          {errors.body_text ? (
            <p className="text-destructive text-sm">{errors.body_text.message}</p>
          ) : (
            <p className="text-muted-foreground text-sm">{""}</p>
          )}
          <div className="flex items-center justify-end gap-0.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  aria-label="Add emoji"
                  title="Add emoji"
                >
                  <Smile />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <EmojiPicker
                  onEmojiClick={handleBodyEmojiClick}
                  emojiStyle={EmojiStyle.NATIVE}
                  theme={emojiPickerTheme}
                  width={320}
                  height={360}
                  lazyLoadEmojis
                  previewConfig={{ showPreview: false }}
                  searchPlaceHolder="Search emoji"
                />
              </PopoverContent>
            </Popover>
            {BODY_FORMAT_CONTROLS.map((control) => (
              <Button
                key={control.ariaLabel}
                type="button"
                variant="ghost"
                size="lg"
                aria-label={control.ariaLabel}
                title={control.ariaLabel}
                className={cn("text-lg", control.className)}
                onClick={() => formatBodyText(control.start, control.end)}
                disabled={
                  bodyText.length + control.start.length + control.end.length >
                  BODY_TEXT_MAX_LENGTH
                }
              >
                {control.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={addBodyVariable}
              disabled={!canAddBodyVariable}
            >
              + Add variable
            </Button>
          </div>
          {bodyVariableTextAttempted ? (
            <p className="text-destructive text-sm">
              Add at least 15 characters of text before adding a variable.
            </p>
          ) : null}
          {bodyVariables.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Body variable examples</p>
              {bodyVariables.map((variable, index) => (
                <div key={variable} className="grid gap-2 sm:grid-cols-[4rem_minmax(0,1fr)]">
                  <Input
                    value={`{{${variable}}}`}
                    readOnly
                    tabIndex={-1}
                    aria-label={`Body variable ${variable}`}
                    className="bg-muted/50"
                  />
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id={`body-variable-sample-${variable}`}
                        aria-label={`Sample text for body variable ${variable}`}
                        placeholder="Sample text"
                        maxLength={TEMPLATE_VARIABLE_MAX_LENGTH}
                        className="pr-12"
                        {...register(`body_variable_samples.${index}`)}
                      />
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                        {bodyVariableSamples[index]?.length ?? 0}/
                        {TEMPLATE_VARIABLE_MAX_LENGTH}
                      </span>
                    </div>
                    {errors.body_variable_samples?.[index] ? (
                      <p className="text-destructive text-sm">
                        {errors.body_variable_samples[index]?.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2 pt-3">
          <Label
            htmlFor="footer_text"
            className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
          >
            Footer (optional)
          </Label>
          <div className="relative">
            <Input
              id="footer_text"
              placeholder={`Add a short line of text to the bottom of your message in ${languageLabel}`}
              maxLength={FOOTER_TEXT_MAX_LENGTH}
              className="pr-14"
              {...register("footer_text")}
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
              {footerText.length}/{FOOTER_TEXT_MAX_LENGTH}
            </span>
          </div>
          {errors.footer_text ? (
            <p className="text-destructive text-sm">{errors.footer_text.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 pt-3">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Buttons
          </p>
          <p className="text-muted-foreground text-sm">
            Create buttons that let customers respond to your message or take action. You can
            add up to ten buttons. If you add more than three buttons, they will appear in a
            list.
          </p>
          <Popover open={buttonOptionsOpen} onOpenChange={setButtonOptionsOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="lg" className="mb-5">
                + Add Button
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              {TEMPLATE_BUTTON_OPTIONS.map(({ type, label, Icon }) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start py-2 font-normal"
                  onClick={
                    type === "CUSTOM"
                      ? addCustomButton
                      : type === "VISIT_WEBSITE"
                        ? addWebsiteButton
                        : type === "CALL_PHONE"
                          ? addPhoneButton
                          : addCopyCodeButton
                  }
                  disabled={
                    templateButtons.length >= 10 ||
                    (type === "VISIT_WEBSITE" && hasWebsiteButton) ||
                    (type === "CALL_PHONE" && hasPhoneButton) ||
                    (type === "COPY_CODE" && hasCopyCodeButton)
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </Button>
              ))}
            </PopoverContent>
          </Popover>
          {templateButtons.length > 0 ? (
            <div className="space-y-2">
              {templateButtons.map((button, index) => (
                <div
                  key={index}
                  className="border-border mb-4 space-y-2 border-t pt-3 first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0"
                >
                  <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                    {button.type === "VISIT_WEBSITE" ? (
                      <Globe className="size-4" />
                    ) : button.type === "CALL_PHONE" ? (
                      <Phone className="size-4" />
                    ) : button.type === "COPY_CODE" ? (
                      <Copy className="size-4" />
                    ) : (
                      <CornerUpLeft className="size-4" />
                    )}
                    {button.type === "VISIT_WEBSITE" ? (
                      <>
                        <span>Visit website</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground inline-flex size-4 items-center justify-center"
                              aria-label="Learn about website URL types"
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Static keeps the URL fixed when the message is sent.
                            <br />
                            Dynamic fills in the URL path when the message is sent.
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : button.type === "CALL_PHONE" ? (
                      <>
                        <span>Call phone number</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground inline-flex size-4 items-center justify-center"
                              aria-label="Learn about phone number buttons"
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            The phone number cannot be changed when the message is sent. Please
                            iclude the country code prefix, only numbers are allowed.
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : button.type === "COPY_CODE" ? (
                      <>
                        <span>Copy offer code</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground inline-flex size-4 items-center justify-center"
                              aria-label="Learn about offer codes"
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Offer code is set when the message is sent.
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <span>Custom</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground inline-flex size-4 items-center justify-center"
                              aria-label="Learn about custom buttons"
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Button text cannot be changed when the message is sent. When the
                            user clicks the button, they will reply with this text.
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </p>
                  <div
                    className={
                      button.type === "VISIT_WEBSITE"
                        ? "grid gap-2 lg:grid-cols-[12rem_minmax(0,1fr)_auto]"
                        : button.type === "CALL_PHONE"
                          ? "grid gap-2 lg:grid-cols-[12rem_minmax(0,1fr)_auto]"
                          : button.type === "COPY_CODE"
                            ? "grid gap-2 lg:grid-cols-[12rem_minmax(0,1fr)_auto]"
                            : "grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                    }
                  >
                    {button.type === "COPY_CODE" ? (
                      <Input
                        value="Copy offer code"
                        readOnly
                        tabIndex={-1}
                        aria-label={`Button ${index + 1} text`}
                        className="bg-muted/50"
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            value={button.text}
                            maxLength={TEMPLATE_BUTTON_TEXT_MAX_LENGTH}
                            className="pr-12"
                            aria-label={`Button ${index + 1} text`}
                            placeholder="Enter button text"
                            onChange={(event) =>
                              updateTemplateButtonText(index, event.target.value)
                            }
                          />
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            {button.text.length}/{TEMPLATE_BUTTON_TEXT_MAX_LENGTH}
                          </span>
                        </div>
                        {emptyButtonTextIndexes.has(index) ? (
                          <p className="text-destructive text-sm">Button text is required.</p>
                        ) : duplicateButtonTextIndexes.has(index) ? (
                          <p className="text-destructive text-sm">
                            Button text must be unique.
                          </p>
                        ) : null}
                      </div>
                    )}
                    {button.type === "VISIT_WEBSITE" ? (
                      <div className="space-y-2">
                        <div className="flex min-w-0">
                          <Select
                            value={button.urlType}
                            onValueChange={(value) =>
                              updateTemplateButtonUrlType(index, value as "STATIC" | "DYNAMIC")
                            }
                          >
                            <SelectTrigger
                              aria-label={`Button ${index + 1} website URL type`}
                              className="w-24 shrink-0 rounded-r-none"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STATIC">Static</SelectItem>
                              <SelectItem value="DYNAMIC">Dynamic</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative min-w-0 flex-1">
                            <Input
                              value={button.url}
                              maxLength={TEMPLATE_BUTTON_URL_MAX_LENGTH}
                              className={`min-w-0 pr-20 ${button.urlType === "DYNAMIC" ? "rounded-none" : "rounded-l-none"}`}
                              aria-label={`Button ${index + 1} website URL`}
                              placeholder="Enter website URL"
                              onChange={(event) =>
                                updateTemplateButtonUrl(index, event.target.value)
                              }
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                              {button.url.length}/{TEMPLATE_BUTTON_URL_MAX_LENGTH}
                            </span>
                          </div>
                          {button.urlType === "DYNAMIC" ? (
                            <Input
                              value={button.urlPath}
                              aria-label={`Button ${index + 1} dynamic URL path`}
                              placeholder="/"
                              required
                              className="w-12 shrink-0 rounded-none"
                              onChange={(event) =>
                                updateTemplateButtonUrlPath(index, event.target.value)
                              }
                            />
                          ) : null}
                          {button.urlType === "DYNAMIC" ? (
                            <Input
                              value="{{1}}"
                              readOnly
                              aria-label={`Button ${index + 1} dynamic URL suffix`}
                              className="w-12 shrink-0 rounded-l-none"
                            />
                          ) : null}
                        </div>
                        {button.urlType === "DYNAMIC" ? (
                          <p
                            className={cn(
                              "truncate text-sm",
                              invalidWebsiteButtonUrlIndexesSet.has(index) ||
                                overlongWebsiteUrlIndexesSet.has(index)
                                ? "text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            Full URL: {button.url}
                            {button.urlPath}
                            12345
                          </p>
                        ) : null}
                        {emptyDynamicUrlPathIndexesSet.has(index) ? (
                          <p className="text-destructive text-sm">URL path is required.</p>
                        ) : null}
                        {invalidWebsiteButtonUrlIndexesSet.has(index) ? (
                          <p className="text-destructive text-sm">
                            Enter a valid website URL.
                          </p>
                        ) : null}
                        {overlongWebsiteUrlIndexesSet.has(index) ? (
                          <p className="text-destructive text-sm">
                            The full URL must be 2000 characters or fewer.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {button.type === "CALL_PHONE" ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            value={button.phoneNumber}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={TEMPLATE_BUTTON_PHONE_MAX_LENGTH}
                            className="pr-12"
                            aria-label={`Button ${index + 1} phone number`}
                            placeholder="6591234567 (include country code)"
                            onKeyDown={(event) => {
                              if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.altKey ||
                                event.key.length !== 1
                              )
                                return;
                              if (!/\d/.test(event.key)) event.preventDefault();
                            }}
                            onChange={(event) =>
                              updateTemplateButtonPhoneNumber(index, event.target.value)
                            }
                          />
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            {button.phoneNumber.length}/{TEMPLATE_BUTTON_PHONE_MAX_LENGTH}
                          </span>
                        </div>
                        {emptyPhoneButtonNumberIndexesSet.has(index) ? (
                          <p className="text-destructive text-sm">Phone number is required.</p>
                        ) : null}
                      </div>
                    ) : null}
                    {button.type === "COPY_CODE" ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            value={button.offerCode}
                            maxLength={TEMPLATE_BUTTON_OFFER_CODE_MAX_LENGTH}
                            className="pr-12"
                            aria-label={`Button ${index + 1} offer code`}
                            placeholder="Enter example offer code"
                            onKeyDown={(event) => {
                              if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.altKey ||
                                event.key.length !== 1
                              )
                                return;
                              if (!/[a-zA-Z0-9]/.test(event.key)) event.preventDefault();
                            }}
                            onChange={(event) =>
                              updateTemplateButtonOfferCode(index, event.target.value)
                            }
                          />
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            {button.offerCode.length}/{TEMPLATE_BUTTON_OFFER_CODE_MAX_LENGTH}
                          </span>
                        </div>
                        {emptyCopyCodeButtonOfferCodeIndexesSet.has(index) ? (
                          <p className="text-destructive text-sm">Offer code is required.</p>
                        ) : null}
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Delete button ${index + 1}`}
                      onClick={() => removeTemplateButton(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          className={MEDIUM_BUTTON_HEIGHT}
          disabled={
            mutation.isPending ||
            hasEmptyButtonText ||
            hasDuplicateButtonText ||
            hasInvalidWebsiteButtonUrl ||
            hasEmptyDynamicUrlPath ||
            hasOverlongWebsiteUrl ||
            hasEmptyPhoneButtonNumber ||
            hasEmptyCopyCodeButtonOfferCode
          }
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEditing ? "Edit template" : "Create template"}
        </Button>
        {submitError ? (
          <div className="flex items-start justify-between gap-2">
            <p className="text-destructive text-sm">
              {submitError.split("\n").map((line, index) => (
                <span key={`${line}-${index}`}>
                  {index > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive shrink-0"
              aria-label="Dismiss error"
              title="Dismiss error"
              onClick={() => setSubmitError(null)}
            >
              <X />
            </Button>
          </div>
        ) : null}
      </div>

      <aside className="min-w-0 space-y-2 md:sticky md:top-0 md:h-fit">
        <Label>Preview</Label>
        <div
          className={cn(
            "border-border max-w-sm overflow-hidden rounded-[7.5px] border bg-white px-3 pt-2 text-sm text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]",
            previewButtons.length > 0 ? "pb-0" : "pb-2",
          )}
        >
          {mediaSample !== "NONE" ? (
            mediaSample === "IMAGE" && previewMediaUrl ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                <Image
                  src={previewMediaUrl}
                  alt="Selected header image preview"
                  width={320}
                  height={224}
                  unoptimized
                  className="block h-auto max-h-56 w-full rounded-none object-contain"
                />
              </div>
            ) : mediaSample === "VIDEO" && previewMediaUrl ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                <video
                  src={previewMediaUrl}
                  controls
                  preload="metadata"
                  className="block h-auto max-h-56 w-full rounded-none object-contain"
                />
              </div>
            ) : mediaSample === "DOCUMENT" && previewMediaUrl ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                <iframe
                  src={previewMediaUrl}
                  title="Selected header document preview"
                  className="block h-56 w-full border-0"
                />
              </div>
            ) : mediaSample === "IMAGE" && existingHeaderUrl ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingHeaderUrl}
                  alt="Template header image preview"
                  className="block h-auto max-h-56 w-full rounded-none object-contain"
                />
              </div>
            ) : mediaSample === "VIDEO" && existingHeaderUrl ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                <video
                  src={existingHeaderUrl}
                  controls
                  preload="metadata"
                  className="block h-auto max-h-56 w-full rounded-none object-contain"
                />
              </div>
            ) : mediaSample === "DOCUMENT" && existingHeaderUrl ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                <iframe
                  src={existingHeaderUrl}
                  title="Template header document preview"
                  className="block h-56 w-full border-0"
                />
              </div>
            ) : mediaSample === "LOCATION" ? (
              <div className="bg-muted/50 -mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)] overflow-hidden dark:bg-white/10">
                <Image
                  src={LOCATION_HEADER_PREVIEW_IMAGE_URL.toString()}
                  alt="Location map preview"
                  width={450}
                  height={450}
                  unoptimized
                  className="h-38 w-full object-cover"
                />
                <div className="space-y-0.5 px-3 py-2">
                  <p className="font-medium">Location name</p>
                  <p className="text-xs text-[#667781] dark:text-[#aebac1]">
                    Location address
                  </p>
                </div>
              </div>
            ) : mediaSample === "DOCUMENT" ? (
              <div className="bg-muted/70 text-muted-foreground -mx-3 -mt-2 mb-2 flex min-h-24 w-[calc(100%+1.5rem)] items-center justify-center gap-3 rounded-none px-3 py-4 text-sm dark:bg-white/10">
                <FileText className="size-5 shrink-0" />
                <span className="min-w-0 truncate">
                  {mediaSampleFile?.name || "Sample document"}
                </span>
              </div>
            ) : mediaSample === "VIDEO" ? (
              <div className="bg-muted/70 text-muted-foreground -mx-3 -mt-2 mb-2 flex min-h-24 w-[calc(100%+1.5rem)] items-center justify-center gap-3 rounded-none px-3 py-4 text-sm dark:bg-white/10">
                <Video className="size-5 shrink-0" />
                <span className="min-w-0 truncate">
                  {mediaSampleFile?.name || "Sample video"}
                </span>
              </div>
            ) : mediaSample === "IMAGE" ? (
              <div className="bg-muted/70 text-muted-foreground -mx-3 -mt-2 mb-2 flex min-h-24 w-[calc(100%+1.5rem)] items-center justify-center gap-3 rounded-none px-3 py-4 text-center text-sm dark:bg-white/10">
                <ImageIcon className="size-5 shrink-0" />
                <span>{mediaSampleFile?.name || "Sample image"}</span>
              </div>
            ) : (
              <div className="bg-muted/70 text-muted-foreground mb-2 flex min-h-24 items-center justify-center rounded-md px-3 py-4 text-center text-sm dark:bg-white/10">
                {mediaSampleNeedsFile
                  ? mediaSampleFile?.name || `${MEDIA_SAMPLE_LABELS[mediaSample]} sample`
                  : "Location header"}
              </div>
            )
          ) : previewHeaderText ? (
            <p className="mb-1.5 font-medium break-words whitespace-pre-wrap">
              {formatPreviewText(previewHeaderText)}
            </p>
          ) : null}
          <p className="break-words whitespace-pre-wrap">
            {formatPreviewText(previewBodyText || `Enter text in ${languageLabel}`)}
          </p>
          {footerText ? (
            <p className="mt-2 text-xs whitespace-pre-wrap text-[#667781] dark:text-[#aebac1]">
              {formatPreviewText(footerText)}
            </p>
          ) : null}
          {previewButtons.length > 0 ? (
            <div className="-mx-3 mt-2 divide-y divide-black/10 border-t border-black/10 text-[#008f72] dark:divide-white/10 dark:border-white/10 dark:text-[#53bdeb]">
              {previewButtons.map((button, index) => (
                <div
                  key={`${button.type}-${button.text}-${index}`}
                  className="flex min-w-0 items-center justify-center gap-2 px-3 py-3 text-base font-medium"
                >
                  {button.type === "VISIT_WEBSITE" ? (
                    <Globe className="size-4" />
                  ) : button.type === "CALL_PHONE" ? (
                    <Phone className="size-4" />
                  ) : button.type === "COPY_CODE" ? (
                    <Copy className="size-4" />
                  ) : (
                    <CornerUpLeft className="size-4" />
                  )}
                  <span className="min-w-0 break-words">{button.text}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {isLocalhost ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>JSON</Label>
              <Button type="button" variant="ghost" size="sm" onClick={copyPreviewJson}>
                <Copy className="size-4" />
                Copy
              </Button>
            </div>
            <pre className="bg-muted/30 max-h-120 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap">
              {previewJsonText}
            </pre>
          </div>
        ) : null}
      </aside>
    </form>
  );
}
