/** Mirrors `dto.Response[T]` from the wawa-go API. */
export type ApiEnvelope<T> = {
  success: boolean;
  status_code: number;
  time_taken: number;
  data?: T;
  message?: string;
  input_errors?: InputError[];
};

export type InputError = {
  field: string;
  message: string;
};

type DtoBase = {
  id: number;
  entry_date: string;
  last_update: string;
};

export type UserStatus = "ACTIVE" | "PENDING_PASSWORD" | "INACTIVE";
export type UserType = "MASTER" | "OPERATOR" | "ACCOUNT";

export type User = DtoBase & {
  country_code?: string;
  name?: string;
  phone_number?: string;
  email?: string;
  description?: string;
  status?: UserStatus;
  type?: UserType;
  access_token?: string;
  access_token_expiry?: string;
  wa_activated?: boolean;
  wa_activation_error?: string;
};

export type BusinessPortfolio = DtoBase & {
  meta_business_portfolio_id?: string;
  name?: string;
  new?: boolean;
};

export type BusinessAccount = DtoBase & {
  meta_waba_id?: string;
  name?: string;
};

export type PhoneNumber = DtoBase & {
  wa_id?: string;
  meta_business_portfolio_id?: string;
  meta_waba_id?: string;
  meta_phone_number_id?: string;
  phone_number?: string;
  name?: string;
  business_portfolio?: BusinessPortfolio | null;
  business_account?: BusinessAccount | null;
};
export type PhoneNumberListResponse = {
  items: PhoneNumber[];
  number_of_pages?: number;
  next_page_offset?: unknown;
};

export type EmbeddedSignupResult = {
  user?: User;
  phone_number?: PhoneNumber;
};

export type Customer = {
  id: number;
  entry_date?: string;
  last_update?: string;
  display_name: string;
  country_code: string;
  phone_number: string;
  meta_user_id?: string;
  wa_id?: string;
  status?: string;
  remarks?: string;
  bsuid?: string;
  tags?: string[];
  additional_data?: Record<string, unknown>;
};

export type CustomerListResponse = {
  items: Customer[];
  number_of_pages?: number;
  number_of_items?: number;
  next_page_offset?: unknown;
  additional_data?: Record<string, unknown>;
};

export type CustomerImportContact = {
  display_name: string;
  phone_number: string;
  email?: string;
  address?: string;
  organization?: string;
  job_title?: string;
  birthday?: string;
  anniversary?: string;
  gender?: string;
  time_zone?: string;
  categories?: string;
  note?: string;
  photo?: string;
  url?: string;
  skipped?: boolean;
  skip_reason?: string;
};

export type CustomerImportResult = {
  imported_count: number;
  skipped: CustomerImportContact[];
  message: string;
};

export type TemplateQualityScore = {
  score?: string;
  date?: number;
  reasons?: string[];
};

export type Template = {
  id: string;
  meta_waba_id?: string;
  name?: string;
  status?: string;
  category?: string;
  language?: string;
  parameter_format?: string;
  raw_html?: string;
  raw_dark_html?: string;
  preview_html?: string;
  preview_dark_html?: string;
  components?: Record<string, unknown>[];
  quality_score?: TemplateQualityScore;
  rejected_reason?: string;
  previous_category?: string;
  meta_edit_template_url?: string;
};

export type SampleTemplate = {
  id: number;
  name?: string;
  category?: string;
  language?: string;
  parameter_format?: string;
  components?: Record<string, unknown>[];
  preview_html?: string;
  preview_dark_html?: string;
};

export type TemplateListResponse = {
  items: Template[];
  number_of_pages?: number;
  number_of_items?: number;
  next_page_offset?: unknown;
  additional_data?: Record<string, unknown>;
};

export type TemplateAnalyticsCost = {
  type: string;
  value: number;
};

export type TemplateAnalyticsDataPoint = {
  template_id: string;
  start: number;
  end: number;
  sent?: number;
  delivered?: number;
  read?: number;
  cost?: TemplateAnalyticsCost[];
};

export type TemplateAnalytics = {
  waba_timezone?: string;
  granularity?: string;
  product_type?: string;
  data_points: TemplateAnalyticsDataPoint[];
};

export type MessageAnalyticsDataPoint = {
  start: number;
  end: number;
  granularity?: string;
  phone_number?: string;
  country?: string;
  sent?: number;
  delivered?: number;
  received?: number;
};

export type MessageAnalytics = {
  phone_numbers?: string[];
  country_codes?: string[];
  granularity?: string;
  total_sent?: number;
  total_delivered?: number;
  data_points: MessageAnalyticsDataPoint[];
};

export type PhoneNumberMessageAnalytics = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  total_sent?: number;
  total_delivered?: number;
  analytics?: MessageAnalytics;
  data_points?: MessageAnalyticsDataPoint[];
};

export type ConversationAnalyticsDataPoint = {
  start: number;
  end: number;
  conversation?: number;
  conversation_count?: number;
  cost?: number;
  currency?: string;
  conversation_category?: string;
  conversation_type?: string;
  conversation_direction?: string;
  phone_number?: string;
  country?: string;
};

export type ConversationAnalytics = {
  data: { data_points: ConversationAnalyticsDataPoint[] | null; currency?: string }[] | null;
};

export type PricingAnalyticsDataPoint = {
  start: number;
  end: number;
  phone_number?: string;
  country?: string;
  tier?: string;
  pricing_type?: string;
  pricing_category?: string;
  volume?: number;
  cost?: number;
};

export type PricingAnalytics = {
  data: { data_points: PricingAnalyticsDataPoint[] | null }[] | null;
};
