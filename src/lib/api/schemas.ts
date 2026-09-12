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

export const TEMPLATE_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"] as const;

export { WHATSAPP_LANGUAGES as TEMPLATE_LANGUAGES } from "@/lib/whatsapp-languages";

const TEMPLATE_LANGUAGE_CODES = WHATSAPP_LANGUAGE_CODES;

export const createTemplateSchema = z.object({
  waba_id: z.string().min(1, "Select a WhatsApp Business Account"),
  // Meta only accepts lowercase letters, digits and underscores.
  name: z
    .string()
    .trim()
    .min(1, "Enter name")
    .max(512)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only"),
  language: z.enum(TEMPLATE_LANGUAGE_CODES, { message: "Select a language" }),
  category: z.enum(TEMPLATE_CATEGORIES),
  header_text: z.string().trim().max(60, "Header is limited to 60 characters"),
  body_text: z
    .string()
    .trim()
    .min(1, "Enter the message body")
    .max(1024, "Body is limited to 1024 characters"),
  footer_text: z.string().trim().max(60, "Footer is limited to 60 characters"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/** Flattens the form fields into the component array Meta expects. */
export function toTemplateComponents(values: CreateTemplateInput) {
  const components: Record<string, unknown>[] = [];
  if (values.header_text) {
    components.push({ type: "HEADER", format: "TEXT", text: values.header_text });
  }
  components.push({ type: "BODY", text: values.body_text });
  if (values.footer_text) {
    components.push({ type: "FOOTER", text: values.footer_text });
  }
  return components;
}
