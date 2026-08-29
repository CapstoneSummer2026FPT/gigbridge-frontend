import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosProgressEvent,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse, ApiTransportError } from '../types/common';
import type { LoginResponse } from '../types/models/Auth';
import { secureStorage } from '../shared/utils/secureStorage';
import {
  ACCESS_TOKEN_REFRESH_THRESHOLD_MS,
  accessTokenExpiresWithin,
  authSessionManager,
  classifyRefreshFailureStatus,
  getAccessTokenExpirationMs,
} from '../features/auth/services/authSessionManager';

type UnknownRecord = Record<string, unknown>;
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type LegacyEnvelope<T> = ApiResponse<T> & { Data?: T };
type LegacyLoginResponse = LoginResponse & { Token?: string };

export interface UploadTransferProgress {
  loadedBytes: number;
  totalBytes?: number;
  percent: number | null;
}

export interface UploadRequestOptions {
  onUploadProgress?: (progress: UploadTransferProgress) => void;
  timeout?: number;
}

export const DEFAULT_UPLOAD_TIMEOUT_MS = 300_000;

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

// Production defaults to a same-origin reverse-proxy path, never localhost.
export const API_BASE_URL =
  configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5222/api' : '/api');

const getApiRootUrl = () => API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');

export const getChatHubUrl = () => `${getApiRootUrl()}/hubs/chat`;
export const getNotificationHubUrl = () => `${getApiRootUrl()}/hubs/notification`;
export const getSystemTrackingHubUrl = () => `${getApiRootUrl()}/hubs/system-tracking`;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeEndpoint = (endpoint: string) => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const baseIncludesApi = /\/api\/?$/i.test(API_BASE_URL);
  const clean = endpoint.replace(/^\/+/, '');
  return baseIncludesApi ? clean.replace(/^api\//i, '') : clean;
};

const normalizeErrors = (value: unknown): Record<string, string[]> | undefined => {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value).flatMap(([field, messages]) => {
    if (!Array.isArray(messages) || !messages.every(message => typeof message === 'string')) {
      return [];
    }
    return [[field, messages] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const responseMessage = (source: UnknownRecord, fallback: string) => {
  const value = source.message ?? source.Message;
  return typeof value === 'string' && value.trim() ? value : fallback;
};

const authRequestPaths = [
  'auth/login',
  'auth/google',
  'auth/register',
  'auth/refresh',
];

const isAuthRequestUrl = (url?: string): boolean => {
  const normalizedUrl = url?.toLowerCase() ?? '';
  return authRequestPaths.some(path => normalizedUrl.includes(path));
};

const clearAuthenticationStorage = (): void => {
  localStorage.removeItem('access_token');
  secureStorage.removeItem('gigbridge_user');
  secureStorage.removeItem('gigbridge_session');
};

const hardLogout = (reason: string): void => {
  clearAuthenticationStorage();
  authSessionManager.clearSession(reason);

  if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
    window.location.assign('/auth/login');
  }
};

class IdleSessionError extends Error {
  constructor() {
    super('Your session expired because it was inactive.');
    this.name = 'IdleSessionError';
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90_000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let refreshRequest: Promise<string> | null = null;
let refreshRetryNotBefore = 0;
let lastTransientRefreshError: unknown = null;

const requestAccessToken = async (currentToken: string): Promise<string> => {
  const response = await axios.post<LegacyEnvelope<LegacyLoginResponse>>(
    `${API_BASE_URL}/auth/refresh`,
    { accessToken: currentToken },
    {
      withCredentials: true,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const loginData = response.data.data ?? response.data.Data;
  const token = loginData?.token ?? loginData?.Token;
  if (!token) throw new Error('Token refresh returned no access token.');

  localStorage.setItem('access_token', token);
  authSessionManager.notifyTokenRefreshed();
  return token;
};

export const refreshAccessToken = (tokenBeingReplaced?: string): Promise<string> => {
  if (Date.now() < refreshRetryNotBefore && lastTransientRefreshError) {
    return Promise.reject(lastTransientRefreshError);
  }

  if (!refreshRequest) {
    const currentToken = tokenBeingReplaced ?? localStorage.getItem('access_token');
    if (!currentToken) {
      return Promise.reject(new Error('No access token is available for refresh.'));
    }

    refreshRequest = authSessionManager
      .withRefreshLock(currentToken, () => requestAccessToken(currentToken))
      .then(token => {
        refreshRetryNotBefore = 0;
        lastTransientRefreshError = null;
        return token;
      })
      .catch((error: unknown) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (classifyRefreshFailureStatus(status) === 'permanent') {
          hardLogout('refresh-rejected');
        } else {
          lastTransientRefreshError = error;
          refreshRetryNotBefore = Date.now() + 5_000;
        }
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
};

export const ensureFreshAccessToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  if (authSessionManager.isIdleExpired()) {
    hardLogout('idle-expired');
    throw new IdleSessionError();
  }

  if (
    !authSessionManager.hasRecentActivity() ||
    !accessTokenExpiresWithin(token, ACCESS_TOKEN_REFRESH_THRESHOLD_MS)
  ) {
    return token;
  }

  try {
    return await refreshAccessToken(token);
  } catch (error) {
    const expiration = getAccessTokenExpirationMs(token);
    const sessionWasPreserved = localStorage.getItem('access_token') === token;
    if (sessionWasPreserved && expiration !== null && expiration > Date.now()) {
      return token;
    }
    throw error;
  }
};

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    if (isAuthRequestUrl(config.url)) return config;

    const token = await ensureFreshAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const isAuthRequest = isAuthRequestUrl(originalRequest?.url);

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      const currentToken = localStorage.getItem('access_token');
      if (!currentToken) {
        return Promise.reject(error);
      }

      if (authSessionManager.isIdleExpired()) {
        hardLogout('idle-expired');
        return Promise.reject(error);
      }

      // Background polling and hidden tabs must not keep an AFK session alive.
      // A meaningful user event makes the session eligible for refresh again.
      if (!authSessionManager.hasRecentActivity()) {
        return Promise.reject(error);
      }

      try {
        const newAccessToken = await refreshAccessToken(currentToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

const handleResponse = <T>(response: AxiosResponse<unknown>): ApiResponse<T> => {
  const { data, status } = response;

  if (isRecord(data)) {
    const isEnvelope =
      'success' in data ||
      'Success' in data ||
      'statusCode' in data ||
      'StatusCode' in data;

    if (isEnvelope) {
      const success = data.success ?? data.Success;
      const statusCode = data.statusCode ?? data.StatusCode;
      const responseData = data.data ?? data.Data;
      const errors = normalizeErrors(data.errors ?? data.Errors);

      return {
        success: typeof success === 'boolean' ? success : status >= 200 && status < 300,
        statusCode: typeof statusCode === 'number' ? statusCode : status,
        message: responseMessage(data, 'Success'),
        ...(responseData === undefined ? {} : { data: responseData as T }),
        ...(errors ? { errors } : {}),
      };
    }
  }

  return {
    success: status >= 200 && status < 300,
    statusCode: status,
    message: 'Success',
    data: data as T,
  };
};

const handleFailure = <T>(error: unknown): ApiResponse<T> => {
  if (!axios.isAxiosError(error)) {
    return {
      success: false,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }

  const payload = isRecord(error.response?.data) ? error.response.data : {};
  const errors = normalizeErrors(payload.errors ?? payload.Errors);
  const transportError: ApiTransportError | undefined = error.response
    ? undefined
    : error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? 'timeout'
      : 'network';

  return {
    success: false,
    statusCode: error.response?.status ?? 500,
    message: responseMessage(payload, error.message || 'An error occurred'),
    ...(errors ? { errors } : {}),
    ...(transportError ? { transportError } : {}),
  };
};

const mapUploadProgress = (event: AxiosProgressEvent): UploadTransferProgress => {
  const totalBytes = typeof event.total === 'number' && event.total > 0
    ? event.total
    : undefined;
  const loadedBytes = Math.max(0, event.loaded);

  const percent = totalBytes === undefined
    ? null
    : loadedBytes >= totalBytes
      ? 100
      : Math.min(99, Math.max(0, Math.floor((loadedBytes / totalBytes) * 100)));

  return {
    loadedBytes,
    ...(totalBytes === undefined ? {} : { totalBytes }),
    percent,
  };
};

export const apiService = {
  async get<T>(
    endpoint: string,
    params: unknown = {},
    headers: Record<string, string> = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<unknown>(normalizeEndpoint(endpoint), { params, headers, signal });
      return handleResponse<T>(response);
    } catch (error: unknown) {
      return handleFailure<T>(error);
    }
  },

  async download(endpoint: string, params: unknown = {}): Promise<ApiResponse<Blob>> {
    try {
      const response = await apiClient.get<Blob>(normalizeEndpoint(endpoint), {
        responseType: 'blob',
        params,
      });

      return {
        success: true,
        statusCode: response.status,
        message: 'Success',
        data: response.data,
      };
    } catch (error: unknown) {
      return handleFailure<Blob>(error);
    }
  },

  async postDownload(endpoint: string, data: unknown = {}): Promise<ApiResponse<Blob>> {
    try {
      const response = await apiClient.post<Blob>(normalizeEndpoint(endpoint), data, {
        responseType: 'blob',
      });

      return {
        success: true,
        statusCode: response.status,
        message: 'Success',
        data: response.data,
      };
    } catch (error: unknown) {
      return handleFailure<Blob>(error);
    }
  },

  async post<T>(
    endpoint: string,
    data: unknown = {},
    headers: Record<string, string> = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<unknown>(normalizeEndpoint(endpoint), data, { headers, signal });
      return handleResponse<T>(response);
    } catch (error: unknown) {
      return handleFailure<T>(error);
    }
  },

  async upload<T>(
    endpoint: string,
    data: FormData,
    options: UploadRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<unknown>(normalizeEndpoint(endpoint), data, {
        timeout: options.timeout ?? DEFAULT_UPLOAD_TIMEOUT_MS,
        onUploadProgress: options.onUploadProgress
          ? event => options.onUploadProgress?.(mapUploadProgress(event))
          : undefined,
      });
      return handleResponse<T>(response);
    } catch (error: unknown) {
      return handleFailure<T>(error);
    }
  },

  async put<T>(endpoint: string, data: unknown = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<unknown>(normalizeEndpoint(endpoint), data);
      return handleResponse<T>(response);
    } catch (error: unknown) {
      return handleFailure<T>(error);
    }
  },

  async patch<T>(endpoint: string, data: unknown = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.patch<unknown>(normalizeEndpoint(endpoint), data);
      return handleResponse<T>(response);
    } catch (error: unknown) {
      return handleFailure<T>(error);
    }
  },

  async delete<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<unknown>(normalizeEndpoint(endpoint), { data });
      return handleResponse<T>(response);
    } catch (error: unknown) {
      return handleFailure<T>(error);
    }
  },
};
