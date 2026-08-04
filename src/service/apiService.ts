import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse } from '../types/common';
import type { LoginResponse } from '../types/models/Auth';
import { secureStorage } from '../shared/utils/secureStorage';

type UnknownRecord = Record<string, unknown>;
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type LegacyEnvelope<T> = ApiResponse<T> & { Data?: T };
type LegacyLoginResponse = LoginResponse & { Token?: string };

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

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90_000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

let refreshRequest: Promise<string> | null = null;

const requestAccessToken = async (): Promise<string> => {
  const currentToken = localStorage.getItem('access_token');
  if (!currentToken) throw new Error('No access token is available for refresh.');

  const response = await axios.post<LegacyEnvelope<LegacyLoginResponse>>(
    `${API_BASE_URL}/auth/refresh`,
    { accessToken: currentToken },
    {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const loginData = response.data.data ?? response.data.Data;
  const token = loginData?.token ?? loginData?.Token;
  if (!token) throw new Error('Token refresh returned no access token.');

  localStorage.setItem('access_token', token);
  return token;
};

const refreshAccessToken = () => {
  if (!refreshRequest) {
    refreshRequest = requestAccessToken().finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url?.toLowerCase() ?? '';
    const isAuthRequest = [
      'auth/login',
      'auth/google',
      'auth/register',
      'auth/refresh',
    ].some(path => requestUrl.includes(path));

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        secureStorage.removeItem('gigbridge_user');
        secureStorage.removeItem('gigbridge_session');
        window.location.assign('/auth/login');
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

  return {
    success: false,
    statusCode: error.response?.status ?? 500,
    message: responseMessage(payload, error.message || 'An error occurred'),
    ...(errors ? { errors } : {}),
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

  async post<T>(
    endpoint: string,
    data: unknown = {},
    headers: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<unknown>(normalizeEndpoint(endpoint), data, { headers });
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
