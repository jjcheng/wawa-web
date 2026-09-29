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
  added_at: string;
  last_updated_at: string;
};

export type UserStatus = "ACTIVE" | "PENDING_PASSWORD" | "PENDING_ASSIGNMENT" | "INACTIVE";
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
  wa_error?: string;
  phone_number_ids?: number[];
  assigned_phone_numbers?: PhoneNumber[];
};

export type Dashboard = {
  active_phone_numbers?: number;
  active_customers?: number;
  messages_sent_last_30_days?: number;
  messages_delivered_last_30_days?: number;
};

export type BusinessPortfolio = DtoBase & {
  meta_business_portfolio_id?: string;
  name?: string;
  new?: boolean;
};

export type BusinessAccount = DtoBase & {
  waba_id?: string;
  name?: string;
  meta_business_portfolio_id?: string;
  meta_business_portfolio_name?: string;
};

export type Catalog = {
  id: string;
  name: string;
  website_id?: number | string;
  website_url?: string;
  website_status?: string;
  products_last_synced_at?: string;
  vertical?: string;
  product_count?: number;
};

export type Website = {
  id: number | string;
  business_account_id: number | string;
  meta_catalog_id: number;
  domain_name: string;
  catalog_name: string;
  business_name?: string;
  url?: string;
  about?: string;
  description?: string;
  profile_picture_url?: string;
  cover_image_url?: string;
  tagline?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  email?: string;
  contact_text?: string;
  copyright_text?: string;
  status?: string;
  products_last_synced_at?: string;
  added_at?: string;
};

export type WebsitePage = {
  id: number | string;
  website_id: number;
  title: string;
  description: string;
  slug: string;
  content: string;
  nav: boolean;
  rank: number;
};

export type PublicNavbarItem = {
  title?: string;
  slug?: string;
};

export type PublicWebsitePage = {
  title?: string;
  description?: string;
  slug?: string;
  content?: string;
};

export type CatalogSet = {
  id: string;
  name?: string;
  [key: string]: unknown;
};

export type CatalogSetListResponse = {
  items: CatalogSet[];
  number_of_pages?: number;
  number_of_items?: number;
  next_page_offset?: unknown;
  additional_data?: Record<string, unknown>;
};

export type Product = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price?: string | number | null;
  sale_price?: string | number | null;
  currency?: string;
  condition?: string;
  category?: string;
  availability?: string;
  status?: string;
  image_url?: string;
  additional_image_urls?: string[];
  [key: string]: unknown;
};

export type ProductListResponse = {
  items: Product[];
  number_of_pages?: number;
  number_of_items?: number;
  next_page_offset?: unknown;
  additional_data?: Record<string, unknown>;
};

export type GenericProductListResponse = ProductListResponse | Product[];

export type PhoneNumber = DtoBase & {
  wa_id?: string;
  display_phone_number?: string;
  meta_business_portfolio_id?: string;
  waba_id?: string;
  meta_phone_number_id?: string;
  meta_agent_id?: string;
  agent_running?: boolean;
  phone_number?: string;
  name?: string;
  user_name?: string;
  status?: string;
  assigned_users?: User[];
  business_portfolio?: BusinessPortfolio | null;
  business_account?: BusinessAccount | null;
};

export type BusinessProfile = {
  about?: string;
  description?: string;
  profile_picture_url?: string;
  address?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
};
export type PhoneNumberListResponse = {
  items: PhoneNumber[];
  number_of_pages?: number;
  next_page_offset?: unknown;
};

export type EmbeddedSignupResult = {
  user: User | null;
  phone_number: PhoneNumber | null;
  wa_error: string;
};

export type Customer = {
  id: number;
  added_at?: string;
  last_updated_at?: string;
  display_name: string;
  country_code: string;
  phone_number: string;
  sending_phone_number?: { display_phone_number?: string } | null;
  meta_user_id?: string;
  wa_id?: string;
  status?: string;
  remarks?: string;
  bsuid?: string;
  token?: string;
  tags?: string[];
  latest_message_content?: string;
  last_message_timestamp?: string | number;
  additional_data?: Record<string, unknown>;
};

export type CustomerListResponse = {
  items: Customer[];
  number_of_pages?: number;
  number_of_items?: number;
  next_page_offset?: unknown;
  additional_data?: Record<string, unknown>;
};

export type Notification = {
  id: number;
  added_at?: string;
  last_updated_at?: string;
  type: "SUCCESS" | "INFO" | "WARNING" | "ERROR";
  icon_type?: "CUSTOMER" | "BROADCAST" | "WEBSITE" | "CHAT" | "JOIN" | "TEMPLATE" | "TODO" | "DONE" | "ERROR" | "SUCCESS" | "WARNING";
  title: string;
  body: string;
  url?: string;
  read: boolean;
};

export type NotificationListResponse = {
  items: Notification[];
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

export type Broadcast = {
  id: number;
  added_at?: string;
  last_updated_at?: string;
  name: string;
  send_date: string;
  wa_template_id: string;
  customer_ids?: number[];
  recipient_count?: number;
  status: string;
  payload?: Record<string, unknown>;
  send_template_payload?: {
    components?: Record<string, unknown>[];
  };
};

export type BroadcastListResponse = {
  items: Broadcast[];
  number_of_pages?: number;
  number_of_items?: number;
  next_page_offset?: unknown;
  additional_data?: Record<string, unknown>;
};

export type BroadcastRecipientMessage = {
  status?: string;
  error_message?: string;
  attempts?: number;
  next_attempt_at?: string | null | { Time?: string; Valid?: boolean };
};

export type BroadcastRecipient = {
  id: number;
  customer_name: string;
  customer_wa_id: string;
  customer_country_code?: string;
  customer_phone_number?: string;
  broadcast_id: number;
  customer_id: number;
  status: string;
  attempts: number;
  next_attempt_at?: string | null | { Time?: string; Valid?: boolean };
  last_error?: string;
  message?: BroadcastRecipientMessage | null;
};

export type BroadcastRecipientListResponse = {
  items: BroadcastRecipient[];
  number_of_pages?: number;
  number_of_items?: number;
  next_page_offset?: unknown;
  additional_data?: Record<string, unknown> | null;
};

export type BroadcastStatisticsResponse = Record<string, number | string>;

export type TemplateQualityScore = {
  score?: string;
  date?: number;
  reasons?: string[];
};

export type Template = {
  id: string;
  by_api?: boolean;
  waba_id?: string;
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
  send_components?: SendTemplateComponent[];
  quality_score?: TemplateQualityScore;
  rejected_reason?: string;
  previous_category?: string;
  meta_edit_template_url?: string;
};

export type SendTemplateParameter = {
  type: string;
  parameter_name?: string;
  text?: string;
  source?: string;
  input_index?: number;
  input_title?: string;
  input_required?: boolean;
  input_max_length?: number;
  [key: string]: unknown;
};

export type SendTemplateComponent = {
  type: string;
  sub_type?: string;
  index?: string;
  parameters?: SendTemplateParameter[];
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

export type MessageStatusEventDetail = DtoBase & {
  wa_message_id?: string;
  status: string;
  timestamp: number;
  error_message?: string;
};

export type MessageDetail = DtoBase & {
  sending: boolean;
  phone_number_id: number;
  customer_id: number;
  wa_message_id: string;
  timestamp: number;
  type: string;
  status: string;
  payload?: Record<string, unknown>;
  broadcast_id?: number | null;
  attachment_url?: string;
  billable?: boolean;
  category?: string;
  billing_type?: string;
  error_message?: string;
  statuses?: MessageStatusEventDetail[];
  preview_html?: string;
  preview_dark_html?: string;
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
