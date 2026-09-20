"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Copy,
  CornerUpLeft,
  FileText,
  Globe,
  ImageIcon,
  Loader2,
  Phone,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/toast";

import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { FormSubmitError } from "@/components/form-submit-error";
import {
  GoogleLocationInput,
  type GoogleLocationSelection,
} from "@/components/google-location-input";
import { MediaDropzone } from "@/components/media-dropzone";
import {
  TemplateVariableInput,
  type CustomerParameterSource,
} from "@/components/template-variable-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer, SendTemplateParameter, Template } from "@/lib/api/types";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const SCHEDULES = ["Send now", "Send later"] as const;
const GOOGLE_STATIC_MAPS_URL = "https://maps.googleapis.com/maps/api/staticmap";

function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function minimumScheduledDate() {
  return new Date(Date.now() + 5 * 60 * 1000);
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

function highlightPreviewText(value: string, highlightedValue?: string) {
  if (!highlightedValue) return value;
  const index = value.indexOf(highlightedValue);
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className="rounded bg-yellow-300 px-0.5 text-black ring-2 ring-yellow-400">
        {highlightedValue}
      </mark>
      {value.slice(index + highlightedValue.length)}
    </>
  );
}

function previewText(value: string, highlightedValue?: string) {
  const parts: ReactNode[] = [];
  let remaining = value;
  let key = 0;
  while (remaining) {
    if (highlightedValue && remaining.startsWith(highlightedValue)) {
      parts.push(
        <mark
          key={key++}
          className="rounded bg-yellow-300 px-0.5 text-black ring-2 ring-yellow-400"
        >
          {highlightedValue}
        </mark>,
      );
      remaining = remaining.slice(highlightedValue.length);
      continue;
    }
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
            {highlightPreviewText(
              remaining.slice(monospaceMarker.length, closingIndex),
              highlightedValue,
            )}
          </code>,
        );
        remaining = remaining.slice(closingIndex + monospaceMarker.length);
        continue;
      }
    }
    const marker = remaining[0];
    if (["*", "_", "~"].includes(marker)) {
      const closingIndex = remaining.indexOf(marker, 1);
      if (closingIndex > 1) {
        const text = remaining.slice(1, closingIndex);
        parts.push(
          marker === "*" ? (
            <strong key={key++}>{highlightPreviewText(text, highlightedValue)}</strong>
          ) : marker === "_" ? (
            <em key={key++}>{highlightPreviewText(text, highlightedValue)}</em>
          ) : (
            <del key={key++}>{highlightPreviewText(text, highlightedValue)}</del>
          ),
        );
        remaining = remaining.slice(closingIndex + 1);
        continue;
      }
    }
    const nextMarker = remaining.search(/[\*_~`]/);
    const length = nextMarker <= 0 ? 1 : nextMarker;
    parts.push(
      <span key={key++}>
        {highlightPreviewText(remaining.slice(0, length), highlightedValue)}
      </span>,
    );
    remaining = remaining.slice(length);
  }
  return parts;
}

function replacePreviewVariables(value: string, values: Record<string, string>) {
  return value.replace(
    /{{\s*([^}]+?)\s*}}/g,
    (match, variable: string) => values[variable.trim()]?.trim() || match,
  );
}

function locationPreviewImageUrl(location: GoogleLocationSelection | null) {
  const latitude = location?.latitude ?? 1.32;
  const longitude = location?.longitude ?? 103.85;
  const url = new URL(GOOGLE_STATIC_MAPS_URL);
  const coordinates = `${latitude},${longitude}`;
  url.searchParams.set("center", coordinates);
  url.searchParams.set("zoom", "17");
  url.searchParams.set("size", "450x450");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("markers", `color:red|${coordinates}`);
  url.searchParams.set("key", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "");
  return url.toString();
}

type EditBroadcastInput = {
  name: string;
  customer_ids: number[];
  template_id: string;
  schedule: (typeof SCHEDULES)[number];
  send_date: string;
};

function componentVariables(component?: Record<string, unknown>) {
  if (!component || typeof component.text !== "string") return [];
  const variables = new Set<string>();
  for (const match of component.text.matchAll(/{{\s*([^}]+?)\s*}}/g)) {
    variables.add(match[1]);
  }
  return [...variables];
}

function variableOccurrenceIndexes(
  template: Template | undefined,
  targetComponent: Record<string, unknown> | undefined,
  targetVariable: string,
) {
  const indexes: number[] = [];
  let occurrenceIndex = 0;
  for (const component of template?.components ?? []) {
    if (typeof component.text !== "string") continue;
    for (const match of component.text.matchAll(/{{\s*([^}]+?)\s*}}/g)) {
      if (match[1].trim() !== targetVariable) continue;
      if (component === targetComponent) indexes.push(occurrenceIndex);
      occurrenceIndex += 1;
    }
  }
  return indexes;
}

function stringVariables(value: unknown) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map((match) => match[1]);
}

type TemplateButtonInput = {
  buttonIndex: number;
  buttonType: string;
  key: string;
  label: string;
  placeholder: string;
  url?: string;
  variable: string;
};

function buttonInputs(component?: Record<string, unknown>): TemplateButtonInput[] {
  if (!component || !Array.isArray(component.buttons)) return [];
  return component.buttons.flatMap((button, index) => {
    if (!button || typeof button !== "object") return [];
    const record = button as Record<string, unknown>;
    const type = String(record.type ?? "").toUpperCase();
    const label = typeof record.text === "string" ? record.text : `Button ${index + 1}`;
    const url = typeof record.url === "string" ? record.url : undefined;
    const variables = [...stringVariables(record.url), ...stringVariables(record.text)];
    if (variables.length > 0) {
      return variables.map((variable) => ({
        buttonIndex: index,
        buttonType: type,
        key: `button:${index}:${variable}`,
        label,
        placeholder: `Enter variable {{${variable}}}`,
        url,
        variable,
      }));
    }
    if (type === "COPY_CODE") {
      return [
        {
          buttonIndex: index,
          buttonType: type,
          key: `button:${index}:code`,
          label,
          placeholder: "Enter code",
          url,
          variable: "code",
        },
      ];
    }
    return [];
  });
}

function sendInput(
  template: Template | undefined,
  type: string,
  parameterIndex: number,
  componentIndex?: string,
): SendTemplateParameter | undefined {
  return template?.send_components?.find(
    (component) =>
      component.type.toLowerCase() === type &&
      (componentIndex === undefined || component.index === componentIndex),
  )?.parameters?.[parameterIndex];
}

function variableMaxLength(
  template: Template | undefined,
  key: string,
  headerVariables: string[],
  bodyVariables: string[],
  buttons: TemplateButtonInput[],
): number | undefined {
  let param: SendTemplateParameter | undefined;
  let isCouponCode = false;

  if (headerVariables.includes(key)) {
    const index = headerVariables.indexOf(key);
    param = sendInput(template, "header", index);
  } else if (key.startsWith("body:")) {
    const varName = key.slice(5);
    const index = bodyVariables.indexOf(varName);
    param = sendInput(template, "body", index);
  } else if (key.startsWith("button:")) {
    const button = buttons.find((b) => b.key === key);
    if (button) {
      param = sendInput(template, "button", 0, String(button.buttonIndex));
      if (button.variable === "code" || param?.type === "coupon_code") {
        isCouponCode = true;
      }
    }
  }

  if (param?.type === "coupon_code") {
    isCouponCode = true;
  }

  if (param?.input_max_length && param.input_max_length > 0) {
    return param.input_max_length;
  }

  if (isCouponCode) {
    return 6;
  }

  return undefined;
}

function fieldConstraintsLabel(required?: boolean, maxLength?: number): string | null {
  const parts: string[] = [];
  if (required) parts.push("required");
  if (maxLength) parts.push(`max length ${maxLength}`);
  if (parts.length === 0) return null;
  return `(${parts.join(", ")})`;
}

function buildSendComponents(
  components: Record<string, unknown>[] | undefined,
  variableValues: Record<string, string>,
  variableSources: Record<string, CustomerParameterSource>,
  previewCustomer: Customer | undefined,
  headerVariables: string[],
  bodyVariables: string[],
  buttons: TemplateButtonInput[],
  headerMediaUrl?: string,
  headerLocation?: GoogleLocationSelection | null,
) {
  const getParameter = (variable: string | undefined) => {
    if (!variable) return undefined;
    const source = variableSources[variable] ?? "custom";
    const customValue = variableValues[variable] ?? variableValues[`body:${variable}`] ?? "";
    return source === "custom" ? { text: customValue } : { source };
  };

  return (components ?? []).map((component) => {
    const type = String(component.type ?? "").toLowerCase();
    const index = String(component.index ?? "0");
    const variables =
      type === "header"
        ? headerVariables
        : type === "body"
          ? bodyVariables.map((variable) => `body:${variable}`)
          : buttons
              .filter((button) => String(button.buttonIndex) === index)
              .map((button) => button.key);
    let parameterIndex = 0;
    const parameters = Array.isArray(component.parameters)
      ? component.parameters
          .map((parameter) => {
            const currentParameterIndex = parameterIndex++;
            const variable = variables[currentParameterIndex];
            const input =
              parameter && typeof parameter === "object"
                ? (parameter as SendTemplateParameter)
                : undefined;
            if (
              variable &&
              !input?.input_required &&
              (variableSources[variable] ?? "custom") === "custom" &&
              !(variableValues[variable] ?? variableValues[`body:${variable}`] ?? "").trim()
            ) {
              return null;
            }
            if (
              type === "header" &&
              headerMediaUrl &&
              parameter &&
              typeof parameter === "object"
            ) {
              const mediaType = String(parameter.type ?? "").toLowerCase();
              if (["image", "video", "document"].includes(mediaType)) {
                return { ...parameter, [mediaType]: { link: headerMediaUrl } };
              }
            }
            if (
              type === "header" &&
              headerLocation &&
              parameter &&
              typeof parameter === "object" &&
              String(parameter.type ?? "").toLowerCase() === "location"
            ) {
              return {
                ...parameter,
                location: {
                  latitude: headerLocation.latitude,
                  longitude: headerLocation.longitude,
                  name: headerLocation.name.trim(),
                  address: headerLocation.address.trim(),
                },
              };
            }
            if (parameter && typeof parameter === "object" && variable) {
              return { ...parameter, ...getParameter(variable) };
            }
            return parameter;
          })
          .filter((parameter): parameter is Record<string, unknown> => parameter !== null)
      : component.parameters;
    return { ...component, parameters };
  });
}

function customerParameterValue(
  customer: Customer | undefined,
  source: CustomerParameterSource,
) {
  if (!customer || source === "custom") return "";
  if (source === "customer.token")
    return `${customer.token || customer.bsuid || "token"} (example)`;
  return `${customer.display_name} (example)`;
}

export function EditBroadcastForm({
  broadcastId,
  customers,
  templates,
}: {
  broadcastId?: string;
  customers: Customer[];
  templates: Template[];
}) {
  const router = useRouter();
  const isLocalhost = useSyncExternalStore(
    subscribeToLocationSnapshot,
    isLocalhostSnapshot,
    serverIsLocalhostSnapshot,
  );
  const {
    register,
    handleSubmit,
    control,
    clearErrors,
    setError,
    setValue,
    formState: { errors },
  } = useForm<EditBroadcastInput>({
    mode: "onChange",
    defaultValues: {
      name: "",
      customer_ids: customers.map((customer) => customer.id),
      template_id: "",
      schedule: SCHEDULES[0],
      send_date: "",
    },
  });
  const broadcastName = useWatch({ control, name: "name" }) ?? "";
  const schedule = useWatch({ control, name: "schedule" });
  const sendDate = useWatch({ control, name: "send_date" });
  const selectedCustomerIds = useWatch({ control, name: "customer_ids" });
  const selectedTemplateId = useWatch({ control, name: "template_id" });
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const headerComponent = selectedTemplate?.components?.find(
    (component) => String(component.type ?? "").toUpperCase() === "HEADER",
  );
  const bodyComponent = selectedTemplate?.components?.find(
    (component) => String(component.type ?? "").toUpperCase() === "BODY",
  );
  const buttonsComponent = selectedTemplate?.components?.find(
    (component) => String(component.type ?? "").toUpperCase() === "BUTTONS",
  );
  const footerComponent = selectedTemplate?.components?.find(
    (component) => String(component.type ?? "").toUpperCase() === "FOOTER",
  );
  const headerFormat = String(headerComponent?.format ?? "TEXT").toUpperCase();
  const headerExampleHandle = (
    headerComponent?.example as { header_handle?: string[] } | undefined
  )?.header_handle?.[0];
  const headerVariables = componentVariables(headerComponent);
  const bodyVariables = componentVariables(bodyComponent);
  const buttons = buttonInputs(buttonsComponent);
  const mediaHeader = ["IMAGE", "DOCUMENT", "VIDEO"].includes(headerFormat);
  const locationHeader = headerFormat === "LOCATION";
  const headerNeedsInput = mediaHeader || locationHeader || headerVariables.length > 0;
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [variableSources, setVariableSources] = useState<
    Record<string, CustomerParameterSource>
  >({});
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [headerLocation, setHeaderLocation] = useState("");
  const [headerLocationDetails, setHeaderLocationDetails] =
    useState<GoogleLocationSelection | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [highlightedVariable, setHighlightedVariable] = useState<{
    name: string;
    component: "header" | "body";
    occurrenceIndexes: number[];
  } | null>(null);
  const [highlightedButton, setHighlightedButton] = useState<{
    index: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (!headerFile) {
      queueMicrotask(() => setPreviewMediaUrl(null));
      return;
    }
    const url = URL.createObjectURL(headerFile);
    let active = true;
    queueMicrotask(() => {
      if (active) setPreviewMediaUrl(url);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [headerFile]);
  const selectedCustomers = customers.filter((customer) =>
    selectedCustomerIds.includes(customer.id),
  );
  const previewCustomer = customers.find((customer) =>
    selectedCustomerIds.includes(customer.id),
  );
  const resolvedVariableValue = (key: string) => {
    const source = variableSources[key] ?? "custom";
    return source === "custom"
      ? (variableValues[key] ?? "")
      : customerParameterValue(previewCustomer, source);
  };
  const headerPreviewValues = Object.fromEntries(
    headerVariables.map((variable) => [variable, resolvedVariableValue(variable)]),
  );
  const bodyPreviewValues = Object.fromEntries(
    bodyVariables.map((variable) => [variable, resolvedVariableValue(`body:${variable}`)]),
  );
  const previewValues = Object.fromEntries([
    ...Object.entries(headerPreviewValues),
    ...Object.entries(bodyPreviewValues),
  ]);
  const highlightedHeaderValue =
    highlightedVariable?.component === "header"
      ? headerPreviewValues[highlightedVariable.name]?.trim() ||
        `{{${highlightedVariable.name}}}`
      : undefined;
  const highlightedBodyValue =
    highlightedVariable?.component === "body"
      ? bodyPreviewValues[highlightedVariable.name]?.trim() ||
        `{{${highlightedVariable.name}}}`
      : undefined;
  const previewButtons = Array.isArray(buttonsComponent?.buttons)
    ? buttonsComponent.buttons.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const button = item as Record<string, unknown>;
        const type = String(button.type ?? "").toUpperCase();
        const text = typeof button.text === "string" ? button.text : "Copy offer code";
        return [{ type, text: replacePreviewVariables(text, previewValues) }];
      })
    : [];
  const previewJson = {
    name: broadcastName.trim(),
    send_date: schedule === "Send later" && sendDate ? new Date(sendDate).toISOString() : null,
    wa_template_id: selectedTemplateId,
    send_template: {
      components: buildSendComponents(
        selectedTemplate?.send_components,
        variableValues,
        variableSources,
        previewCustomer,
        headerVariables,
        bodyVariables,
        buttons,
        undefined,
        headerLocationDetails,
      ),
    },
    customer_ids: selectedCustomerIds,
  };
  const previewJsonText = JSON.stringify(previewJson, null, 2);
  const variableKeys = [
    ...headerVariables,
    ...bodyVariables.map((variable) => `body:${variable}`),
    ...buttons.map((button) => button.key),
  ];
  const requiredVariableKeys = new Set([
    ...headerVariables.filter(
      (_, index) => sendInput(selectedTemplate, "header", index)?.input_required,
    ),
    ...bodyVariables
      .filter((_, index) => sendInput(selectedTemplate, "body", index)?.input_required)
      .map((variable) => `body:${variable}`),
    ...buttons
      .filter(
        (button) =>
          sendInput(selectedTemplate, "button", 0, String(button.buttonIndex))?.input_required,
      )
      .map((button) => button.key),
  ]);
  const missingVariableKeys = new Set(
    variableKeys.filter(
      (key) => requiredVariableKeys.has(key) && !resolvedVariableValue(key).trim(),
    ),
  );
  const tooLongVariableKeys = new Map<string, { max: number; label: string }>();
  for (const key of variableKeys) {
    const val = resolvedVariableValue(key).trim();
    if (!val) continue;
    const max = variableMaxLength(
      selectedTemplate,
      key,
      headerVariables,
      bodyVariables,
      buttons,
    );
    if (max && val.length > max) {
      const isCoupon =
        (key.startsWith("button:") && (key.endsWith(":code") || key.includes("code"))) ||
        sendInput(
          selectedTemplate,
          "button",
          0,
          key.startsWith("button:") ? key.split(":")[1] : undefined,
        )?.type === "coupon_code";
      tooLongVariableKeys.set(key, {
        max,
        label: isCoupon
          ? "Coupon code must be at most 6 characters."
          : `Must be at most ${max} characters.`,
      });
    }
  }
  const templatesByCategory = templates.reduce<Record<string, Template[]>>(
    (groups, template) => {
      const category = template.category || "Other";
      (groups[category] ??= []).push(template);
      return groups;
    },
    {},
  );

  const mutation = useMutation({
    mutationFn: async (values: EditBroadcastInput) => {
      let headerMediaUrl: string | undefined;
      if (mediaHeader) {
        if (!headerFile) {
          throw new Error(`Upload a ${headerFormat.toLowerCase()} file.`);
        }
        const media = await apiFetch<{ url?: string }>("v1/wa/media", {
          method: "POST",
          rawBody: headerFile,
          contentType: headerFile.type,
          query: {
            to_meta: "false",
            filename: headerFile.name,
            content_type: headerFile.type,
          },
        });
        headerMediaUrl = media.url;
        if (!headerMediaUrl) throw new Error("Media upload did not return a URL.");
      }
      return apiFetch("v1/broadcasts", {
        method: "POST",
        body: {
          name: values.name.trim(),
          send_date:
            values.schedule === "Send later" ? new Date(values.send_date).toISOString() : null,
          wa_template_id: values.template_id,
          send_template: {
            components: buildSendComponents(
              selectedTemplate?.send_components,
              variableValues,
              variableSources,
              previewCustomer,
              headerVariables,
              bodyVariables,
              buttons,
              headerMediaUrl,
              headerLocationDetails,
            ),
          },
          customer_ids: values.customer_ids,
        },
      });
    },
    onSuccess: () => {
      setSubmitError(null);
      toast.success(broadcastId ? "Broadcast updated." : "Broadcast created.");
      router.push("/broadcasts");
    },
    onError: (error) => {
      const message = toApiError(error).message;
      setSubmitError(message);
      toast.error(message);
    },
  });

  function submitBroadcast(values: EditBroadcastInput) {
    setValidationAttempted(true);
    clearErrors(["customer_ids", "template_id"]);
    let invalid = false;

    if (values.customer_ids.length === 0) {
      setError("customer_ids", { message: "Select at least one customer." });
      invalid = true;
    }
    if (!values.template_id) {
      setError("template_id", { message: "Select a template." });
      invalid = true;
    }
    if (values.schedule === "Send later") {
      if (!values.send_date) {
        setError("send_date", { message: "Select a date and time." });
        invalid = true;
      } else if (new Date(values.send_date).getTime() < minimumScheduledDate().getTime()) {
        setError("send_date", {
          message: "Schedule the broadcast at least 5 minutes from now.",
        });
        invalid = true;
      }
    }
    if (
      missingVariableKeys.size > 0 ||
      tooLongVariableKeys.size > 0 ||
      (mediaHeader && !headerFile) ||
      (locationHeader &&
        (!headerLocationDetails ||
          !headerLocationDetails.name.trim() ||
          !headerLocationDetails.address.trim() ||
          !Number.isFinite(headerLocationDetails.latitude) ||
          !Number.isFinite(headerLocationDetails.longitude)))
    ) {
      invalid = true;
    }
    if (!invalid) {
      const payload = {
        name: values.name.trim(),
        send_date:
          values.schedule === "Send later" ? new Date(values.send_date).toISOString() : null,
        wa_template_id: values.template_id,
        send_template: {
          components: buildSendComponents(
            selectedTemplate?.send_components,
            variableValues,
            variableSources,
            previewCustomer,
            headerVariables,
            bodyVariables,
            buttons,
            undefined,
            headerLocationDetails,
          ),
        },
        customer_ids: values.customer_ids,
      };
      console.log("Broadcast payload", payload);
      mutation.mutate(values);
    }
  }

  async function copyPreviewJson() {
    try {
      await navigator.clipboard.writeText(previewJsonText);
      toast.success("JSON copied.");
    } catch {
      toast.error("Could not copy JSON.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submitBroadcast)}
      className="grid w-full max-w-full min-w-0 items-start gap-6 min-[769px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <div className="w-full min-w-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Broadcast name</Label>
          <Input
            id="name"
            placeholder="Enter broadcast name"
            {...register("name", {
              validate: (value) => value.trim().length > 0,
            })}
          />
          {errors.name ? (
            <p className="text-destructive text-sm">Enter a broadcast name.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Customers</Label>
          <div className="border-input flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border px-2 py-1">
            {selectedCustomers.length > 0 ? (
              <span className="text-sm">
                {selectedCustomers
                  .slice(0, 5)
                  .map((customer) => customer.display_name)
                  .join(", ")}
                {selectedCustomers.length > 5
                  ? `, and ${selectedCustomers.length - 5} more...`
                  : null}
              </span>
            ) : null}
            {selectedCustomerIds.length === 0 ? (
              <span className="text-muted-foreground text-sm">Select customers</span>
            ) : null}
          </div>
          {errors.customer_ids ? (
            <p className="text-destructive text-sm">{errors.customer_ids.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule</Label>
          <Select
            value={schedule}
            onValueChange={(value) => {
              setValue("schedule", value as EditBroadcastInput["schedule"]);
              if (value === "Send now") clearErrors("send_date");
            }}
          >
            <SelectTrigger id="schedule" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULES.map((schedule) => (
                <SelectItem key={schedule} value={schedule}>
                  {schedule}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {schedule === "Send later" ? (
            <div className="space-y-2">
              <Label htmlFor="send-date">Date and time</Label>
              <Input
                id="send-date"
                type="datetime-local"
                min={localDateTimeValue(minimumScheduledDate())}
                value={sendDate}
                {...register("send_date", {
                  validate: (value) => {
                    if (schedule !== "Send later" || !value) return true;
                    return new Date(value).getTime() >= minimumScheduledDate().getTime()
                      ? true
                      : "Schedule the broadcast at least 5 minutes from now.";
                  },
                })}
              />
              {errors.send_date ? (
                <p className="text-destructive text-sm">{errors.send_date.message}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={(value) => {
              setValue("template_id", value);
              clearErrors("template_id");
              setVariableValues({});
              setVariableSources({});
              setHeaderFile(null);
              setHeaderLocation("");
              setHeaderLocationDetails(null);
              setHighlightedVariable(null);
              setHighlightedButton(null);
              setValidationAttempted(false);
            }}
          >
            <SelectTrigger id="template" className="w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                <SelectGroup key={category}>
                  <SelectLabel>{category}</SelectLabel>
                  {categoryTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name || template.id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {errors.template_id ? (
            <p className="text-destructive text-sm">{errors.template_id.message}</p>
          ) : null}
          {headerNeedsInput ? (
            <div className="space-y-3 pt-2">
              <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                Header
              </p>
              {mediaHeader ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>
                      {headerFormat[0]}
                      {headerFormat.slice(1).toLowerCase()}
                    </Label>
                    {headerExampleHandle ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={async () => {
                          try {
                            const response = await fetch(headerExampleHandle);
                            const blob = await response.blob();
                            const filename =
                              headerExampleHandle.split("/").pop()?.split("?")[0] ||
                              `example.${headerFormat === "IMAGE" ? "png" : headerFormat === "VIDEO" ? "mp4" : "pdf"}`;
                            const file = new File([blob], filename, {
                              type:
                                blob.type ||
                                (headerFormat === "IMAGE"
                                  ? "image/png"
                                  : headerFormat === "VIDEO"
                                    ? "video/mp4"
                                    : "application/pdf"),
                            });
                            setHeaderFile(file);
                          } catch {
                            toast.error("Could not load example file.");
                          }
                        }}
                      >
                        Use example file
                      </Button>
                    ) : null}
                  </div>
                  <MediaDropzone
                    format={headerFormat}
                    file={headerFile}
                    onChange={setHeaderFile}
                  />
                  {validationAttempted && !headerFile ? (
                    <p className="text-destructive text-sm">
                      Upload a {headerFormat.toLowerCase()} file.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {locationHeader ? (
                <div className="space-y-2">
                  <Label>Search Location</Label>
                  <GoogleLocationInput
                    value={headerLocation}
                    onChange={setHeaderLocation}
                    onPlaceSelect={setHeaderLocationDetails}
                  />
                  {headerLocationDetails ? (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="header-location-name">Location name</Label>
                        <Input
                          id="header-location-name"
                          value={headerLocationDetails.name}
                          onChange={(event) =>
                            setHeaderLocationDetails((currentLocation) =>
                              currentLocation
                                ? { ...currentLocation, name: event.target.value }
                                : currentLocation,
                            )
                          }
                        />
                        {validationAttempted && !headerLocationDetails.name.trim() ? (
                          <p className="text-destructive text-sm">Enter a location name.</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="header-location-address">Location address</Label>
                        <Input
                          id="header-location-address"
                          value={headerLocationDetails.address}
                          onChange={(event) =>
                            setHeaderLocationDetails((currentLocation) =>
                              currentLocation
                                ? { ...currentLocation, address: event.target.value }
                                : currentLocation,
                            )
                          }
                        />
                        {validationAttempted && !headerLocationDetails.address.trim() ? (
                          <p className="text-destructive text-sm">Enter a location address.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {validationAttempted &&
                  (!headerLocationDetails ||
                    !Number.isFinite(headerLocationDetails.latitude) ||
                    !Number.isFinite(headerLocationDetails.longitude)) ? (
                    <p className="text-destructive text-sm">
                      Select a location from the search results.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {headerVariables.map((variable) => {
                const param = sendInput(
                  selectedTemplate,
                  "header",
                  headerVariables.indexOf(variable),
                );
                const maxLen = variableMaxLength(
                  selectedTemplate,
                  variable,
                  headerVariables,
                  bodyVariables,
                  buttons,
                );
                const constraints = fieldConstraintsLabel(param?.input_required, maxLen);
                return (
                  <div key={variable} className="space-y-2">
                    <button
                      type="button"
                      className="text-sm font-medium hover:underline"
                      onClick={() => {
                        setHighlightedVariable({
                          name: variable,
                          component: "header",
                          occurrenceIndexes: variableOccurrenceIndexes(
                            selectedTemplate,
                            headerComponent,
                            variable,
                          ),
                        });
                        setHighlightedButton(null);
                      }}
                    >
                      {param?.input_title || `{{${variable}}}`}
                      {constraints ? (
                        <span className="text-muted-foreground ml-1 font-normal">
                          {constraints}
                        </span>
                      ) : null}
                    </button>
                    <TemplateVariableInput
                      id={`template-variable-${variable}`}
                      source={variableSources[variable] ?? "custom"}
                      value={variableValues[variable] ?? ""}
                      mappedValue={customerParameterValue(
                        previewCustomer,
                        variableSources[variable] ?? "custom",
                      )}
                      maxLength={maxLen}
                      onSourceChange={(source) =>
                        setVariableSources((currentSources) => ({
                          ...currentSources,
                          [variable]: source,
                        }))
                      }
                      onValueChange={(value) =>
                        setVariableValues((currentValues) => ({
                          ...currentValues,
                          [variable]: value,
                        }))
                      }
                      placeholder={`Enter variable {{${variable}}}`}
                    />
                    {validationAttempted && missingVariableKeys.has(variable) ? (
                      <p className="text-destructive text-sm">
                        Enter a value for {`{{${variable}}}`}.
                      </p>
                    ) : validationAttempted && tooLongVariableKeys.has(variable) ? (
                      <p className="text-destructive text-sm">
                        {tooLongVariableKeys.get(variable)?.label}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {bodyVariables.length > 0 ? (
            <div className="space-y-3 pt-5">
              <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                Body
              </p>
              {bodyVariables.map((variable, index) => {
                const key = `body:${variable}`;
                const param = sendInput(selectedTemplate, "body", index);
                const maxLen = variableMaxLength(
                  selectedTemplate,
                  key,
                  headerVariables,
                  bodyVariables,
                  buttons,
                );
                const constraints = fieldConstraintsLabel(param?.input_required, maxLen);
                return (
                  <div key={`body-${variable}`} className="space-y-2">
                    <button
                      type="button"
                      className="text-sm font-medium hover:underline"
                      onClick={() => {
                        setHighlightedVariable({
                          name: variable,
                          component: "body",
                          occurrenceIndexes: variableOccurrenceIndexes(
                            selectedTemplate,
                            bodyComponent,
                            variable,
                          ),
                        });
                        setHighlightedButton(null);
                      }}
                    >
                      {param?.input_title || `{{${variable}}}`}
                      {constraints ? (
                        <span className="text-muted-foreground ml-1 font-normal">
                          {constraints}
                        </span>
                      ) : null}
                    </button>
                    <TemplateVariableInput
                      id={`template-body-variable-${variable}`}
                      source={variableSources[key] ?? "custom"}
                      value={variableValues[key] ?? ""}
                      mappedValue={customerParameterValue(
                        previewCustomer,
                        variableSources[key] ?? "custom",
                      )}
                      maxLength={maxLen}
                      onSourceChange={(source) =>
                        setVariableSources((currentSources) => ({
                          ...currentSources,
                          [key]: source,
                        }))
                      }
                      onValueChange={(value) =>
                        setVariableValues((currentValues) => ({
                          ...currentValues,
                          [key]: value,
                        }))
                      }
                      placeholder={`Enter variable {{${variable}}}`}
                    />
                    {validationAttempted && missingVariableKeys.has(key) ? (
                      <p className="text-destructive text-sm">
                        Enter a value for {`{{${variable}}}`}.
                      </p>
                    ) : validationAttempted && tooLongVariableKeys.has(key) ? (
                      <p className="text-destructive text-sm">
                        {tooLongVariableKeys.get(key)?.label}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {buttons.length > 0 ? (
            <div className="space-y-3 pt-5">
              <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                Buttons
              </p>
              {buttons.map((button) => {
                const param = sendInput(
                  selectedTemplate,
                  "button",
                  0,
                  String(button.buttonIndex),
                );
                const maxLen = variableMaxLength(
                  selectedTemplate,
                  button.key,
                  headerVariables,
                  bodyVariables,
                  buttons,
                );
                const constraints = fieldConstraintsLabel(param?.input_required, maxLen);
                const buttonTitle =
                  button.buttonType === "URL"
                    ? "Visit website"
                    : button.buttonType === "COPY_CODE" ||
                        param?.type.toLowerCase() === "coupon_code"
                      ? "Copy offer code"
                      : param?.input_title || `{{${button.variable}}}`;
                const ButtonIcon =
                  button.buttonType === "URL"
                    ? Globe
                    : button.buttonType === "PHONE_NUMBER"
                      ? Phone
                      : button.buttonType === "COPY_CODE"
                        ? Copy
                        : CornerUpLeft;
                return (
                  <div key={button.key} className="mb-4 space-y-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium hover:underline"
                      title={button.label}
                      onClick={() => {
                        setHighlightedVariable(null);
                        setHighlightedButton({
                          index: button.buttonIndex,
                          label: button.label,
                        });
                      }}
                    >
                      <ButtonIcon className="size-4" />
                      {buttonTitle}
                      {constraints ? (
                        <span className="text-muted-foreground ml-1 font-normal">
                          {constraints}
                        </span>
                      ) : null}
                    </button>
                    <TemplateVariableInput
                      id={`template-${button.key}`}
                      source={variableSources[button.key] ?? "custom"}
                      value={variableValues[button.key] ?? ""}
                      mappedValue={customerParameterValue(
                        previewCustomer,
                        variableSources[button.key] ?? "custom",
                      )}
                      maxLength={maxLen}
                      alphanumericOnly={
                        button.variable === "code" ||
                        param?.type.toLowerCase() === "coupon_code"
                      }
                      onSourceChange={(source) =>
                        setVariableSources((currentSources) => ({
                          ...currentSources,
                          [button.key]: source,
                        }))
                      }
                      onValueChange={(value) =>
                        setVariableValues((currentValues) => ({
                          ...currentValues,
                          [button.key]: value,
                        }))
                      }
                      placeholder={button.placeholder}
                    />
                    {button.buttonType === "URL" && button.url ? (
                      <p className="text-muted-foreground w-full truncate text-left text-sm">
                        Full URL:{" "}
                        {replacePreviewVariables(button.url, {
                          [button.variable]: resolvedVariableValue(button.key),
                        })}
                      </p>
                    ) : null}
                    {validationAttempted && missingVariableKeys.has(button.key) ? (
                      <p className="text-destructive text-sm">
                        Enter a value for {`{{${button.variable}}}`}.
                      </p>
                    ) : validationAttempted && tooLongVariableKeys.has(button.key) ? (
                      <p className="text-destructive text-sm">
                        {tooLongVariableKeys.get(button.key)?.label}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <Button type="submit" className={MEDIUM_BUTTON_HEIGHT} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {broadcastId ? "Save broadcast" : "Start broadcast"}
        </Button>
        <FormSubmitError message={submitError} />
      </div>
      {selectedTemplate ? (
        <div className="min-w-0 self-start lg:col-start-2 lg:row-start-1">
          <p className="mb-1 text-sm font-medium tracking-wide">Preview</p>
          <div className="border-border w-full max-w-[425px] overflow-hidden rounded-[7.5px] border bg-white px-3 pt-2 text-sm text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
            {headerFormat === "IMAGE" && (previewMediaUrl || headerExampleHandle) ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewMediaUrl || headerExampleHandle}
                  alt="Template header"
                  className="block h-auto max-h-56 w-full rounded-none object-contain"
                />
              </div>
            ) : headerFormat === "VIDEO" && (previewMediaUrl || headerExampleHandle) ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                <video
                  src={previewMediaUrl || headerExampleHandle}
                  controls
                  preload="metadata"
                  className="block h-auto max-h-56 w-full rounded-none object-contain"
                />
              </div>
            ) : headerFormat === "DOCUMENT" && (previewMediaUrl || headerExampleHandle) ? (
              <div className="-mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)]">
                <iframe
                  src={previewMediaUrl || headerExampleHandle}
                  title="Template header document"
                  className="block h-56 w-full border-0"
                />
              </div>
            ) : headerFormat === "IMAGE" ? (
              <div className="bg-muted/70 text-muted-foreground -mx-3 -mt-2 mb-2 flex min-h-24 w-[calc(100%+1.5rem)] items-center justify-center gap-3 rounded-none px-3 py-4 text-center text-sm dark:bg-white/10">
                <ImageIcon className="size-5 shrink-0" />
                <span>Sample image</span>
              </div>
            ) : headerFormat === "VIDEO" ? (
              <div className="bg-muted/70 text-muted-foreground -mx-3 -mt-2 mb-2 flex min-h-24 w-[calc(100%+1.5rem)] items-center justify-center gap-3 rounded-none px-3 py-4 text-sm dark:bg-white/10">
                <Video className="size-5 shrink-0" />
                <span>Sample video</span>
              </div>
            ) : headerFormat === "DOCUMENT" ? (
              <div className="bg-muted/70 text-muted-foreground -mx-3 -mt-2 mb-2 flex min-h-24 w-[calc(100%+1.5rem)] items-center justify-center gap-3 rounded-none px-3 py-4 text-sm dark:bg-white/10">
                <FileText className="size-5 shrink-0" />
                <span className="min-w-0 truncate">Sample document</span>
              </div>
            ) : headerFormat === "LOCATION" ? (
              <div className="bg-muted/50 -mx-3 -mt-2 mb-2 w-[calc(100%+1.5rem)] overflow-hidden dark:bg-white/10">
                <Image
                  src={locationPreviewImageUrl(headerLocationDetails)}
                  alt="Location map preview"
                  width={450}
                  height={450}
                  unoptimized
                  className="h-38 w-full object-cover"
                />
                <div className="space-y-0.5 px-3 py-2">
                  <p className="font-medium">
                    {headerLocationDetails?.name || "Location name"}
                  </p>
                  <p className="text-xs text-[#667781] dark:text-[#aebac1]">
                    {headerLocationDetails?.address || "Location address"}
                  </p>
                </div>
              </div>
            ) : typeof headerComponent?.text === "string" ? (
              <p className="mb-1.5 font-medium break-words whitespace-pre-wrap">
                {previewText(
                  replacePreviewVariables(headerComponent.text, headerPreviewValues),
                  highlightedHeaderValue,
                )}
              </p>
            ) : null}
            <p className="break-words whitespace-pre-wrap">
              {previewText(
                replacePreviewVariables(
                  typeof bodyComponent?.text === "string" ? bodyComponent.text : "",
                  bodyPreviewValues,
                ),
                highlightedBodyValue,
              )}
            </p>
            {typeof footerComponent?.text === "string" ? (
              <p className="mt-2 text-xs whitespace-pre-wrap text-[#667781] dark:text-[#aebac1]">
                {previewText(footerComponent.text)}
              </p>
            ) : null}
            {previewButtons.length > 0 ? (
              <div className="-mx-3 mt-2 divide-y divide-black/10 border-t border-black/10 text-[#008f72] dark:divide-white/10 dark:border-white/10 dark:text-[#53bdeb]">
                {previewButtons.map((button, index) => {
                  const Icon =
                    button.type === "URL"
                      ? Globe
                      : button.type === "PHONE_NUMBER"
                        ? Phone
                        : button.type === "COPY_CODE"
                          ? Copy
                          : CornerUpLeft;
                  return (
                    <div
                      key={`${button.type}-${index}`}
                      className={`flex items-center justify-center gap-2 px-3 py-3 text-base font-medium ${highlightedButton?.index === index ? "bg-yellow-100 text-black ring-2 ring-yellow-400 ring-inset" : ""}`}
                    >
                      <Icon className="size-4" />
                      {button.text}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          {isLocalhost ? (
            <div className="mt-2 space-y-2">
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
        </div>
      ) : null}
    </form>
  );
}
