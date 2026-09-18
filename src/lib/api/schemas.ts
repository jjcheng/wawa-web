import { z } from "zod";

import { WHATSAPP_LANGUAGE_CODES } from "@/lib/whatsapp-languages";

// Mirrors helper.IsValidPhoneNumber in wawa-go.
const phoneNumber = z
  .string()
  .trim()
  .regex(/^\+?\d{8,15}$/, "Enter a valid phone number, e.g. 6590909090");

// Mirrors helper.ValidatePassword in wawa-go.
const password = z
  .string()
  .min(8, "Password must be between 8 and 20 characters")
  .max(20, "Password must be between 8 and 20 characters")
  .regex(/\p{L}/u, "Password must contain at least 1 letter")
  .regex(/\p{N}/u, "Password must contain at least 1 number");

export const loginSchema = z.object({
  country_code: z.string().trim().min(1, "Select a country code"),
  phone_number: phoneNumber,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  description: z.string().trim().min(1, "Enter a description"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Enter your current password"),
    new_password: password,
    confirm_new_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.new_password === values.confirm_new_password, {
    path: ["confirm_new_password"],
    message: "Passwords do not match",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const setInitialPasswordSchema = z
  .object({
    new_password: password,
    confirm_new_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.new_password === values.confirm_new_password, {
    path: ["confirm_new_password"],
    message: "Passwords do not match",
  });
export type SetInitialPasswordInput = z.infer<typeof setInitialPasswordSchema>;

export const embeddedSignupSchema = z.object({
  type: z.literal("WA_EMBEDDED_SIGNUP"),
  event: z.literal("FINISH"),
  data: z.object({
    phone_number_id: z.string().min(1),
    waba_id: z.string().min(1),
    business_id: z.string().min(1),
    page_ids: z.array(z.string()).optional(),
    catalog_ids: z.array(z.string()).optional(),
    dataset_ids: z.array(z.string()).optional(),
    instagram_account_ids: z.array(z.string()).optional(),
  }),
  authorization_code: z.string().min(1),
});
export type EmbeddedSignupInput = z.infer<typeof embeddedSignupSchema>;

export const TEMPLATE_CATEGORIES = ["MARKETING", "UTILITY"] as const;
export const TEMPLATE_MEDIA_SAMPLE_TYPES = ["NONE", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"] as const;

export { WHATSAPP_LANGUAGES as TEMPLATE_LANGUAGES } from "@/lib/whatsapp-languages";

const TEMPLATE_LANGUAGE_CODES = WHATSAPP_LANGUAGE_CODES;
export const TEMPLATE_NAME_MAX_LENGTH = 508;
export const HEADER_TEXT_MAX_LENGTH = 60;
export const BODY_TEXT_MAX_LENGTH = 1024;
export const FOOTER_TEXT_MAX_LENGTH = 60;
export const TEMPLATE_VARIABLE_MAX_LENGTH = 50;
const WHATSAPP_DIRECT_LINK_PATTERN = /(?:https?:\/\/)?(?:www\.)?wa\.me\b/i;

function countTemplateVariables(value: string) {
  return value.match(/\{\{\s*\d+\s*\}\}/g)?.length ?? 0;
}

function templateVariableNames(value: string) {
  const names: string[] = [];
  for (const match of value.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    const name = match[1];
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function startsOrEndsWithTemplateVariable(value: string) {
  const trimmedValue = value.trim();
  return /^\{\{\s*\d+\s*\}\}/.test(trimmedValue) || /\{\{\s*\d+\s*\}\}$/.test(trimmedValue);
}

export const createTemplateSchema = z
  .object({
    waba_id: z.string().min(1, "Select a WhatsApp Business Account"),
    // Meta only accepts lowercase letters, digits and underscores.
    name: z
      .string()
      .trim()
      .min(1, "Enter name")
      .max(TEMPLATE_NAME_MAX_LENGTH)
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only"),
    language: z.enum(TEMPLATE_LANGUAGE_CODES, { message: "Select a language" }),
    category: z.enum(TEMPLATE_CATEGORIES),
    media_sample: z.enum(TEMPLATE_MEDIA_SAMPLE_TYPES),
    header_text: z
      .string()
      .trim()
      .max(HEADER_TEXT_MAX_LENGTH, "Header is limited to 60 characters")
      .refine((value) => countTemplateVariables(value) <= 1, {
        message: "Header can include at most 1 variable",
      }),
    header_variable_samples: z.array(z.string().trim()),
    body_text: z
      .string()
      .trim()
      .min(1, "Enter the message body")
      .max(BODY_TEXT_MAX_LENGTH, "Body is limited to 1024 characters")
      .refine((value) => !startsOrEndsWithTemplateVariable(value), {
        message: "Body cannot start or end with a variable",
      })
      .refine((value) => !/ {5,}/.test(value), {
        message: "Avoid using more than four consecutive spaces",
      })
      .refine((value) => !WHATSAPP_DIRECT_LINK_PATTERN.test(value), {
        message: "Do not include direct links to WhatsApp (wa.me)",
      }),
    body_variable_samples: z.array(z.string().trim()),
    footer_text: z.string().trim().max(FOOTER_TEXT_MAX_LENGTH, "Footer is limited to 60 characters"),
  })
  .superRefine((values, context) => {
    templateVariableNames(values.header_text).forEach((variable, index) => {
      if (!values.header_variable_samples[index]?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["header_variable_samples", index],
          message: `Enter sample text for header variable {{${variable}}}`,
        });
      }
    });
    templateVariableNames(values.body_text).forEach((variable, index) => {
      if (!values.body_variable_samples[index]?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["body_variable_samples", index],
          message: `Enter sample text for body variable {{${variable}}}`,
        });
      }
    });
  });
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/** Flattens the form fields into the component array Meta expects. */
export function toTemplateComponents(values: CreateTemplateInput) {
  const components: Record<string, unknown>[] = [];
  if (values.media_sample !== "NONE") {
    components.push({ type: "HEADER", format: values.media_sample });
  } else if (values.header_text) {
    const headerVariables = templateVariableNames(values.header_text);
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: values.header_text,
      ...(headerVariables.length > 0
        ? {
            example: {
              header_text: headerVariables.map(
                (_, index) => values.header_variable_samples[index],
              ),
            },
          }
        : {}),
    });
  }
  const bodyVariables = templateVariableNames(values.body_text);
  components.push({
    type: "BODY",
    text: values.body_text,
    ...(bodyVariables.length > 0
      ? {
          example: {
            body_text: [
              bodyVariables.map((_, index) => values.body_variable_samples[index]),
            ],
          },
        }
      : {}),
  });
  if (values.footer_text) {
    components.push({ type: "FOOTER", text: values.footer_text });
  }
  return components;
}
