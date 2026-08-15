export type ApiTransportError = 'network' | 'timeout';

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  transportError?: ApiTransportError;
}
