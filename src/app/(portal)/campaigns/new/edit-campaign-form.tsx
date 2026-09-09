"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoogleLocationInput } from "@/components/google-location-input";
import { MediaDropzone } from "@/components/media-dropzone";
import { TemplateRawPreview } from "@/components/template-raw-preview";
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
import type { Customer, Template } from "@/lib/api/types";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const SCHEDULES = ["Send now", "Send later"] as const;

type EditCampaignInput = {
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
  key: string;
  label: string;
  placeholder: string;
  variable: string;
};

function buttonInputs(component?: Record<string, unknown>): TemplateButtonInput[] {
  if (!component || !Array.isArray(component.buttons)) return [];
  return component.buttons.flatMap((button, index) => {
    if (!button || typeof button !== "object") return [];
    const record = button as Record<string, unknown>;
    const type = String(record.type ?? "").toUpperCase();
    const label = typeof record.text === "string" ? record.text : `Button ${index + 1}`;
    const variables = [...stringVariables(record.url), ...stringVariables(record.text)];
    if (variables.length > 0) {
      return variables.map((variable) => ({
        buttonIndex: index,
        key: `button:${index}:${variable}`,
        label,
        placeholder: `Enter ${variable}`,
        variable,
      }));
    }
    if (type === "COPY_CODE") {
      return [
        {
          buttonIndex: index,
          key: `button:${index}:code`,
          label,
          placeholder: "Enter code",
          variable: "code",
        },
      ];
    }
    return [];
  });
}

function customerParameterValue(
  customer: Customer | undefined,
  source: CustomerParameterSource,
) {
  if (!customer || source === "custom") return "";
  return `${customer.display_name} (example)`;
}

export function EditCampaignForm({
  campaignId,
  customers,
  templates,
}: {
  campaignId?: string;
  customers: Customer[];
  templates: Template[];
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const {
    register,
    handleSubmit,
    control,
    clearErrors,
    setError,
    setValue,
    formState: { errors },
  } = useForm<EditCampaignInput>({
    defaultValues: {
      name: "",
      customer_ids: customers.map((customer) => customer.id),
      template_id: "",
      schedule: SCHEDULES[0],
      send_date: "",
    },
  });
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
  const headerFormat = String(headerComponent?.format ?? "TEXT").toUpperCase();
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
  const [headerLocation, setHeaderLocation] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [highlightedVariable, setHighlightedVariable] = useState<{
    name: string;
    occurrenceIndexes: number[];
  } | null>(null);
  const [highlightedButton, setHighlightedButton] = useState<{
    index: number;
    label: string;
  } | null>(null);
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
  const previewVariableSubstitutions = [
    ...headerVariables.map((variable) => ({
      name: variable,
      occurrenceIndexes: variableOccurrenceIndexes(
        selectedTemplate,
        headerComponent,
        variable,
      ),
      value: resolvedVariableValue(variable),
    })),
    ...bodyVariables.map((variable) => ({
      name: variable,
      occurrenceIndexes: variableOccurrenceIndexes(selectedTemplate, bodyComponent, variable),
      value: resolvedVariableValue(`body:${variable}`),
    })),
  ];
  const variableKeys = [
    ...headerVariables,
    ...bodyVariables.map((variable) => `body:${variable}`),
    ...buttons.map((button) => button.key),
  ];
  const missingVariableKeys = new Set(
    variableKeys.filter((key) => !resolvedVariableValue(key).trim()),
  );
  const templatesByCategory = templates.reduce<Record<string, Template[]>>(
    (groups, template) => {
      const category = template.category || "Other";
      (groups[category] ??= []).push(template);
      return groups;
    },
    {},
  );

  const mutation = useMutation({
    mutationFn: async (values: EditCampaignInput) => {
      throw new Error(`Campaigns aren't backed by the API yet (${values.name}).`);
    },
    onSuccess: () => {
      toast.success(campaignId ? "Campaign updated." : "Campaign created.");
      router.push("/campaigns");
    },
    onError: (error) => toast.error(error.message),
  });

  function submitCampaign(values: EditCampaignInput) {
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
      }
    }
    if (
      missingVariableKeys.size > 0 ||
      (mediaHeader && !headerFile) ||
      (locationHeader && !headerLocation.trim())
    ) {
      invalid = true;
    }
    if (!invalid) mutation.mutate(values);
  }

  return (
    <form
      onSubmit={handleSubmit(submitCampaign)}
      className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:space-y-0 lg:gap-x-6"
    >
      <div className="max-w-xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            placeholder="Enter campaign name"
            {...register("name", {
              validate: (value) => value.trim().length > 0,
            })}
          />
          {errors.name ? (
            <p className="text-destructive text-sm">Enter a campaign name.</p>
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
              setValue("schedule", value as EditCampaignInput["schedule"]);
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
                min={new Date().toISOString().slice(0, 16)}
                value={sendDate}
                {...register("send_date")}
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
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Header
              </p>
              {mediaHeader ? (
                <div className="space-y-2">
                  <Label>{headerFormat}</Label>
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
                  <Label>Location</Label>
                  <GoogleLocationInput value={headerLocation} onChange={setHeaderLocation} />
                  {validationAttempted && !headerLocation.trim() ? (
                    <p className="text-destructive text-sm">Select a location.</p>
                  ) : null}
                </div>
              ) : null}
              {headerVariables.map((variable) => (
                <div key={variable} className="space-y-2">
                  <button
                    type="button"
                    className="text-sm font-medium hover:underline"
                    onClick={() => {
                      setHighlightedVariable({
                        name: variable,
                        occurrenceIndexes: variableOccurrenceIndexes(
                          selectedTemplate,
                          headerComponent,
                          variable,
                        ),
                      });
                      setHighlightedButton(null);
                    }}
                  >
                    {`{{${variable}}}`}
                  </button>
                  <TemplateVariableInput
                    id={`template-variable-${variable}`}
                    source={variableSources[variable] ?? "custom"}
                    value={variableValues[variable] ?? ""}
                    mappedValue={customerParameterValue(
                      previewCustomer,
                      variableSources[variable] ?? "custom",
                    )}
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
                    placeholder={`Enter ${variable}`}
                  />
                  {validationAttempted && missingVariableKeys.has(variable) ? (
                    <p className="text-destructive text-sm">
                      Enter a value for {`{{${variable}}}`}.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {bodyVariables.length > 0 ? (
            <div className="space-y-3 pt-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Body
              </p>
              {bodyVariables.map((variable) => (
                <div key={`body-${variable}`} className="space-y-2">
                  <button
                    type="button"
                    className="text-sm font-medium hover:underline"
                    onClick={() => {
                      setHighlightedVariable({
                        name: variable,
                        occurrenceIndexes: variableOccurrenceIndexes(
                          selectedTemplate,
                          bodyComponent,
                          variable,
                        ),
                      });
                      setHighlightedButton(null);
                    }}
                  >
                    {`{{${variable}}}`}
                  </button>
                  <TemplateVariableInput
                    id={`template-body-variable-${variable}`}
                    source={variableSources[`body:${variable}`] ?? "custom"}
                    value={variableValues[`body:${variable}`] ?? ""}
                    mappedValue={customerParameterValue(
                      previewCustomer,
                      variableSources[`body:${variable}`] ?? "custom",
                    )}
                    onSourceChange={(source) =>
                      setVariableSources((currentSources) => ({
                        ...currentSources,
                        [`body:${variable}`]: source,
                      }))
                    }
                    onValueChange={(value) =>
                      setVariableValues((currentValues) => ({
                        ...currentValues,
                        [`body:${variable}`]: value,
                      }))
                    }
                    placeholder={`Enter ${variable}`}
                  />
                  {validationAttempted && missingVariableKeys.has(`body:${variable}`) ? (
                    <p className="text-destructive text-sm">
                      Enter a value for {`{{${variable}}}`}.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {buttons.length > 0 ? (
            <div className="space-y-3 pt-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Buttons
              </p>
              {buttons.map((button) => (
                <div key={button.key} className="space-y-2">
                  <button
                    type="button"
                    className="text-sm font-medium hover:underline"
                    title={button.label}
                    onClick={() => {
                      setHighlightedVariable(null);
                      setHighlightedButton({
                        index: button.buttonIndex,
                        label: button.label,
                      });
                    }}
                  >
                    {`{{${button.variable}}}`}
                  </button>
                  <TemplateVariableInput
                    id={`template-${button.key}`}
                    source={variableSources[button.key] ?? "custom"}
                    value={variableValues[button.key] ?? ""}
                    mappedValue={customerParameterValue(
                      previewCustomer,
                      variableSources[button.key] ?? "custom",
                    )}
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
                  {validationAttempted && missingVariableKeys.has(button.key) ? (
                    <p className="text-destructive text-sm">
                      Enter a value for {`{{${button.variable}}}`}.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Button type="submit" className={MEDIUM_BUTTON_HEIGHT} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {campaignId ? "Save campaign" : "Start campaign"}
        </Button>
      </div>
      {(resolvedTheme === "dark" ? selectedTemplate?.raw_dark_html : selectedTemplate?.raw_html) ? (
        <div className="min-w-0 self-start lg:col-start-2 lg:row-start-1">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Preview
          </p>
          <TemplateRawPreview
            html={
              (resolvedTheme === "dark"
                ? selectedTemplate?.raw_dark_html || selectedTemplate?.raw_html
                : selectedTemplate?.raw_html || selectedTemplate?.raw_dark_html) ?? ""
            }
            highlightedVariable={highlightedVariable}
            variableSubstitutions={previewVariableSubstitutions}
            highlightedButton={highlightedButton}
          />
        </div>
      ) : null}
    </form>
  );
}
