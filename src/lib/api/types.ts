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
export type UserType = "ADMIN" | "STAFF";

export type User = DtoBase & {
  name?: string;
  phone_number?: string;
  email?: string;
  description?: string;
  status?: UserStatus;
  type?: UserType;
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
