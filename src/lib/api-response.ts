import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
  rawValue?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: ApiErrorDetail[] | Record<string, unknown> | null;
  timestamp: string;
}

/**
 * Enterprise standard API Response class ensuring uniform JSON payloads,
 * HTTP status codes, structured error representations, and audit timestamps across all endpoints.
 */
export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data?: T;
  public readonly errors?: ApiErrorDetail[] | Record<string, unknown> | null;
  public readonly meta?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    success: boolean,
    statusCode: number,
    message: string,
    data?: T,
    errors?: ApiErrorDetail[] | Record<string, unknown> | null,
    meta?: Record<string, unknown>,
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.errors = errors;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Converts the ApiResponse instance to a native Next.js NextResponse object.
   */
  public toResponse(): NextResponse {
    return NextResponse.json(
      {
        success: this.success,
        statusCode: this.statusCode,
        message: this.message,
        ...(this.data !== undefined ? { data: this.data } : {}),
        ...(this.errors ? { errors: this.errors } : {}),
        ...(this.meta ? { meta: this.meta } : {}),
        timestamp: this.timestamp,
      },
      { status: this.statusCode },
    );
  }

  /**
   * Generates a standardized 200 OK (or custom 2xx) success response.
   */
  static success<T>(
    data: T,
    message = "Operation completed successfully",
    statusCode = 200,
    meta?: Record<string, unknown>,
  ): NextResponse<ApiSuccessResponse<T>> {
    return new ApiResponse<T>(
      true,
      statusCode,
      message,
      data,
      null,
      meta,
    ).toResponse() as NextResponse<ApiSuccessResponse<T>>;
  }

  /**
   * Generates a standardized 201 Created response.
   */
  static created<T>(
    data: T,
    message = "Resource created successfully",
    meta?: Record<string, unknown>,
  ): NextResponse<ApiSuccessResponse<T>> {
    return ApiResponse.success(data, message, 201, meta);
  }

  /**
   * Generates a standardized 202 Accepted response for background/asynchronous jobs.
   */
  static accepted<T>(
    data: T,
    message = "Request accepted for background processing",
    meta?: Record<string, unknown>,
  ): NextResponse<ApiSuccessResponse<T>> {
    return ApiResponse.success(data, message, 202, meta);
  }

  /**
   * Generates a standardized error response with structured failure details.
   */
  static error(
    message = "An unexpected error occurred",
    statusCode = 500,
    errors?: ApiErrorDetail[] | Record<string, unknown> | null,
  ): NextResponse<ApiErrorResponse> {
    return new ApiResponse<undefined>(
      false,
      statusCode,
      message,
      undefined,
      errors,
    ).toResponse() as NextResponse<ApiErrorResponse>;
  }

  /**
   * 400 Bad Request: malformed input, missing headers, or invalid syntax.
   */
  static badRequest(
    message = "Bad request",
    errors?: ApiErrorDetail[] | Record<string, unknown> | null,
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(message, 400, errors);
  }

  /**
   * 401 Unauthorized: missing or invalid authentication token/session.
   */
  static unauthorized(
    message = "Authentication required. Please sign in to proceed.",
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(message, 401);
  }

  /**
   * 403 Forbidden: authenticated user lacks required privileges or tenant access.
   */
  static forbidden(
    message = "Access denied: insufficient permissions for this resource.",
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(message, 403);
  }

  /**
   * 404 Not Found: target resource or session does not exist.
   */
  static notFound(
    message = "The requested resource could not be found.",
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(message, 404);
  }

  /**
   * 409 Conflict: duplicate entry, unique constraint breach, or conflicting state.
   */
  static conflict(
    message = "Resource conflict detected.",
    errors?: ApiErrorDetail[] | Record<string, unknown> | null,
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(message, 409, errors);
  }

  /**
   * 422 Unprocessable Entity: semantic validation errors (e.g. Zod schema violations).
   */
  static unprocessable(
    message = "Validation failed: unprocessable entity.",
    errors?: ApiErrorDetail[] | Record<string, unknown> | null,
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(message, 422, errors);
  }

  /**
   * 500 Internal Server Error: unhandled system exceptions.
   */
  static internal(
    message = "Internal server error. Please try again later.",
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(message, 500);
  }
}
