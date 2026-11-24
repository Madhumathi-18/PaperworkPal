export type ErrorCode =
  | 'bad_request'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'rate_limited'
  | 'ai_unavailable'
  | 'ai_bad_response'
  | 'not_configured'
  | 'internal';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  internal: 500,
  ai_bad_response: 503,
  ai_unavailable: 503,
  not_configured: 503,
};

/** Error with a stable code and a message that is safe to show to end users. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string };
}

/** Converts any thrown value into a client-safe body. Unknown errors are never leaked. */
export function toErrorBody(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: { code: error.code, message: error.message } } };
  }
  return {
    status: 500,
    body: {
      error: { code: 'internal', message: 'Something went wrong on our side. Please try again.' },
    },
  };
}
