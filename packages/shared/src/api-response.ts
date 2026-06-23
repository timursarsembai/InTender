import { ErrorCode } from './error-codes';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
  };
}
