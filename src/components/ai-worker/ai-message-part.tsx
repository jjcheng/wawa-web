"use client";

import type { FormEvent } from "react";

import { LocalDateTime } from "@/components/local-date-time";
import { useHydrated } from "@/components/use-hydrated";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

export type AiDisplayType =
  | "TEXTBOX"
  | "TEXTAREA"
  | "READONLY_TABLE"
  | "SINGLE_CHOICE_TABLE"
  | "MULTI_CHOICE_TABLE";

export type AiInputFieldType = "TEXT" | "INT" | "FLOAT" | "DATE" | "DATETIME" | "BOOL";

export type AiPartInput = {
  name: string;
  description?: string;
  type?: AiInputFieldType;
  display_type?: AiDisplayType;
  reference_field_name?: string;
};

export type AiMessagePart = {
  // Only present on messages stored before display_type replaced it.
  type?: string;
  titles?: string[] | null;
  content: unknown;
  input?: AiPartInput | null;
};

type PartKind = "TEXT" | "OBJECT" | "TABLE" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "FIELD";

const LEGACY_DISPLAY_TYPES: Record<string, AiDisplayType> = {
  SINGLE_CHOICE_TABLE: "SINGLE_CHOICE_TABLE",
  MULTI_CHOICE_TABLE: "MULTI_CHOICE_TABLE",
  LIST: "READONLY_TABLE",
  TEXT_INPUT: "TEXTBOX",
  INT_INPUT: "TEXTBOX",
  DECIMAL_INPUT: "TEXTBOX",
  DATE_INPUT: "TEXTBOX",
};

const LEGACY_FIELD_TYPES: Record<string, AiInputFieldType> = {
  TEXT_INPUT: "TEXT",
  INT_INPUT: "INT",
  DECIMAL_INPUT: "FLOAT",
  DATE_INPUT: "DATE",
};

// Content may arrive as structured JSON or as a JSON-encoded string.
function parseContent(content: unknown) {
  if (typeof content !== "string") return content;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return content;
  }
}

function displayType(part: AiMessagePart) {
  return part.input?.display_type ?? (part.type ? LEGACY_DISPLAY_TYPES[part.type] : undefined);
}

function partKind(part: AiMessagePart): PartKind {
  const parsed = parseContent(part.content);
  const display = displayType(part);

  if (display === "SINGLE_CHOICE_TABLE" || display === "MULTI_CHOICE_TABLE" || display === "READONLY_TABLE") {
    // The title text above a table carries the same input as the table itself.
    if (!Array.isArray(parsed)) return "TEXT";
    if (display === "SINGLE_CHOICE_TABLE") return "SINGLE_CHOICE";
    return display === "MULTI_CHOICE_TABLE" ? "MULTI_CHOICE" : "TABLE";
  }
  if (part.type === "TEXT") return "TEXT";
  if (display === "TEXTBOX" || display === "TEXTAREA" || part.input) return "FIELD";
  if (part.type === "OBJECT") return "OBJECT";
  if (Array.isArray(parsed)) return parsed.every(Array.isArray) ? "TABLE" : "OBJECT";
  return "TEXT";
}

function isChoiceKind(kind: PartKind) {
  return kind === "SINGLE_CHOICE" || kind === "MULTI_CHOICE";
}

function fieldType(part: AiMessagePart): AiInputFieldType {
  return part.input?.type ?? (part.type ? LEGACY_FIELD_TYPES[part.type] : undefined) ?? "TEXT";
}

function inputName(part: AiMessagePart, index: number) {
  return part.input?.name || `part-${index}`;
}

function toRows(content: unknown): unknown[][] {
  const parsed = parseContent(content);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => (Array.isArray(row) ? row : [row]));
}

function toObjectValues(content: unknown, titles: string[]): unknown[] {
  const parsed = parseContent(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    return titles.map((title) => (parsed as Record<string, unknown>)[title]);
  }
  return [];
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function referenceColumn(part: AiMessagePart) {
  const reference = part.input?.reference_field_name?.trim().toLowerCase();
  if (!reference) return 0;
  return (part.titles ?? []).findIndex((title) => title.trim().toLowerCase() === reference);
}

// Hides parts whose value is already supplied by another part.
function hiddenPartIndexes(parts: AiMessagePart[], kinds: PartKind[]) {
  const hidden = new Set<number>();
  parts.forEach((part, index) => {
    const reference = part.input?.reference_field_name;
    if (reference && parts.some((other, otherIndex) => otherIndex !== index && other.input?.name === reference)) {
      hidden.add(index);
    }
    if (
      kinds[index] === "FIELD" &&
      part.input?.name &&
      parts.some((other, otherIndex) => isChoiceKind(kinds[otherIndex]) && other.input?.name === part.input?.name)
    ) {
      hidden.add(index);
    }
  });
  // The backend emits each field's description as a TEXT part right before the field.
  parts.forEach((part, index) => {
    const next = parts[index + 1];
    if (kinds[index] === "TEXT" && kinds[index + 1] === "FIELD" && part.content === next.input?.description) {
      hidden.add(index);
    }
  });
  return hidden;
}

function readFieldValue(part: AiMessagePart, formData: FormData, name: string): unknown {
  const raw = formData.getAll(name).map((value) => String(value).trim());
  switch (fieldType(part)) {
    case "INT":
      return Number.parseInt(raw[0] ?? "", 10);
    case "FLOAT":
      return Number.parseFloat(raw[0] ?? "");
    case "BOOL":
      return raw[0] === "true";
    case "DATETIME":
      return raw[0] ? new Date(raw[0]).toISOString() : "";
    default:
      return raw[0] ?? "";
  }
}

function sanitizeNumber(value: string, allowDecimal: boolean) {
  const sign = value.trimStart().startsWith("-") ? "-" : "";
  const digits = value.replace(allowDecimal ? /[^\d.]/g : /\D/g, "");
  if (!allowDecimal) return sign + digits;
  const [whole, ...fraction] = digits.split(".");
  return sign + whole + (fraction.length > 0 ? `.${fraction.join("")}` : "");
}

const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

function CellValue({ value }: { value: unknown }) {
  if (typeof value === "string" && ISO_DATE_TIME_PATTERN.test(value)) {
    // Go's zero time.Time means the value is unset.
    if (value.startsWith("0001-01-01")) return "—";
    if (!Number.isNaN(new Date(value).getTime())) return <LocalDateTime value={value} />;
  }
  return formatValue(value);
}

export function AiMessagePartsView({
  parts,
  feature,
  disabled,
  onSubmitForm,
}: {
  parts: AiMessagePart[];
  feature?: string;
  disabled: boolean;
  onSubmitForm: (feature: string, form: Record<string, unknown>) => void;
}) {
  const hydrated = useHydrated();
  const isLocalhost = hydrated && window.location.hostname === "localhost";
  const kinds = parts.map(partKind);
  const hidden = hiddenPartIndexes(parts, kinds);
  const visibleIndexes = parts.flatMap((_, index) => (hidden.has(index) ? [] : [index]));
  const interactiveIndexes = visibleIndexes.filter(
    (index) => kinds[index] === "FIELD" || isChoiceKind(kinds[index]),
  );

  const content = visibleIndexes.map((index) => (
    <AiMessagePartView
      key={index}
      part={parts[index]}
      kind={kinds[index]}
      name={inputName(parts[index], index)}
      disabled={disabled}
    />
  ));

  if (interactiveIndexes.length === 0) return content;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const form: Record<string, unknown> = {};

    for (const index of interactiveIndexes) {
      const part = parts[index];
      const name = inputName(part, index);

      if (kinds[index] === "FIELD") {
        form[name] = readFieldValue(part, formData, name);
        continue;
      }

      const column = referenceColumn(part);
      if (column < 0) {
        toast.error(`Cannot find the "${part.input?.reference_field_name}" column to submit ${name}.`);
        return;
      }
      const rows = toRows(part.content);
      const selected = formData.getAll(name).map((rowIndex) => rows[Number(rowIndex)]?.[column]);
      if (selected.length === 0) {
        toast.error("Please select at least one row.");
        return;
      }
      form[name] = kinds[index] === "MULTI_CHOICE" ? selected : selected[0];
    }

    onSubmitForm(String(formData.get("feature") ?? ""), form);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="hidden" name="feature" value={feature ?? ""} />
      {content}
      <div className="flex items-center justify-between gap-2">
        {isLocalhost ? <JsonDebugButton value={{ feature, parts }} /> : <span />}
        <Button type="submit" size="sm" disabled={disabled}>
          Submit
        </Button>
      </div>
    </form>
  );
}

function JsonDebugButton({ value }: { value: unknown }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline underline-offset-2"
        >
          Show JSON
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Message JSON</DialogTitle>
        </DialogHeader>
        <pre className="bg-muted max-h-[60vh] !overflow-auto rounded-md p-3 text-xs whitespace-pre">
          {JSON.stringify(value, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

function AiMessagePartView({
  part,
  kind,
  name,
  disabled,
}: {
  part: AiMessagePart;
  kind: PartKind;
  name: string;
  disabled: boolean;
}) {
  const titles = part.titles ?? [];

  if (kind === "FIELD") {
    return <AiInputField part={part} name={name} disabled={disabled} />;
  }

  if (kind === "TEXT") {
    const text = typeof part.content === "string" ? part.content : parseContent(part.content);
    return <p className="whitespace-pre-wrap">{formatValue(text)}</p>;
  }

  if (kind === "OBJECT") {
    const values = toObjectValues(part.content, titles);
    return (
      <Table containerClassName="rounded-md border bg-background">
        <TableBody>
          {titles.map((title, index) => (
            <TableRow key={`${title}-${index}`}>
              <TableCell className="text-muted-foreground w-1/3 align-top">{title}</TableCell>
              <TableCell className="whitespace-pre-wrap">
                <CellValue value={values[index]} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const rows = toRows(part.content);
  const choice = isChoiceKind(kind);

  return (
    <Table containerClassName="rounded-md border bg-background">
      {titles.length > 0 || choice ? (
        <TableHeader>
          <TableRow>
            {choice ? (
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
            ) : null}
            {titles.map((title, index) => (
              <TableHead key={`${title}-${index}`}>{title}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
      ) : null}
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {choice ? (
              <TableCell>
                {kind === "MULTI_CHOICE" ? (
                  <Checkbox
                    name={name}
                    value={rowIndex}
                    aria-label={`Select row ${rowIndex + 1}`}
                    disabled={disabled}
                  />
                ) : (
                  <input
                    type="radio"
                    name={name}
                    value={rowIndex}
                    required
                    aria-label={`Select row ${rowIndex + 1}`}
                    disabled={disabled}
                    className="accent-primary size-4 cursor-pointer"
                  />
                )}
              </TableCell>
            ) : null}
            {row.map((value, cellIndex) => (
              <TableCell key={cellIndex}>
                <CellValue value={value} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AiInputField({
  part,
  name,
  disabled,
}: {
  part: AiMessagePart;
  name: string;
  disabled: boolean;
}) {
  const type = fieldType(part);
  const description = part.input?.description;
  const parsed = parseContent(part.content);
  const defaultValue = typeof parsed === "string" || typeof parsed === "number" ? parsed : undefined;

  let control;
  if (type === "BOOL") {
    control = (
      <select
        name={name}
        required
        disabled={disabled}
        defaultValue={typeof parsed === "boolean" ? String(parsed) : ""}
        aria-label={description}
        className="border-input bg-background text-foreground h-9 w-full rounded-lg border px-2.5 text-sm"
      >
        <option value="" disabled>
          Required
        </option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  } else if (type === "INT" || type === "FLOAT") {
    const allowDecimal = type === "FLOAT";
    control = (
      <Input
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        pattern={allowDecimal ? "-?\\d*\\.?\\d+" : "-?\\d+"}
        title={allowDecimal ? "Enter a number" : "Enter a whole number"}
        name={name}
        placeholder="Required"
        required
        disabled={disabled}
        defaultValue={defaultValue}
        onInput={(event) => {
          event.currentTarget.value = sanitizeNumber(event.currentTarget.value, allowDecimal);
        }}
        aria-label={description}
        className="bg-background text-foreground"
      />
    );
  } else if (type === "TEXT" && displayType(part) === "TEXTAREA") {
    control = (
      <Textarea
        name={name}
        placeholder="Required"
        required
        disabled={disabled}
        defaultValue={defaultValue}
        aria-label={description}
        className="bg-background text-foreground"
      />
    );
  } else {
    control = (
      <Input
        type={type === "DATE" ? "date" : type === "DATETIME" ? "datetime-local" : "text"}
        name={name}
        placeholder="Required"
        required
        disabled={disabled}
        defaultValue={defaultValue}
        aria-label={description}
        className="bg-background text-foreground"
      />
    );
  }

  if (!description) return control;
  return (
    <label className="block space-y-1.5">
      <span className="block">{description}</span>
      {control}
    </label>
  );
}
