import type { InputError } from "./types";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly inputErrors: InputError[];

  constructor(message: string, statusCode: number, inputErrors: InputError[] = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.inputErrors = inputErrors;
  }

  get isUnauthorized() {
    return this.statusCode === 401;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error && error.message) return new ApiError(error.message, 0);
  return new ApiError("Unable to reach the API. Please try again.", 0);
}
