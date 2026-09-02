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
  name?: string;
  phone_number?: string;
  email?: string;
  description?: string;
  status?: UserStatus;
  type?: UserType;
  access_token?: string;
  access_token_expiry?: string;
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
  meta_business_portfolio_id?: string;
  meta_waba_id?: string;
  meta_phone_number_id?: string;
  phone_number?: string;
  name?: string;
  business_portfolio?: BusinessPortfolio | null;
  business_account?: BusinessAccount | null;
};

export type EmbeddedSignupResult = {
  user?: User;
  phone_number?: PhoneNumber;
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
  components?: Record<string, unknown>[];
  quality_score?: TemplateQualityScore;
  rejected_reason?: string;
  previous_category?: string;
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
  data_points: MessageAnalyticsDataPoint[];
};

export type PhoneNumberMessageAnalytics = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  analytics: MessageAnalytics;
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
