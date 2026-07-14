import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/common';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5222/api';

export const getApiRootUrl = () => API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');

export const getChatHubUrl = () => `${getApiRootUrl()}/hubs/chat`;
export const getNotificationHubUrl = () => `${getApiRootUrl()}/hubs/notification`;

const normalizeEndpoint = (endpoint: string) => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const baseIncludesApi = /\/api\/?$/i.test(API_BASE_URL);
  const clean = endpoint.replace(/^\/+/, '');
  return baseIncludesApi ? clean.replace(/^api\//i, '') : clean;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - attach token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✓ Token attached to request:', config.url);
    } else {
      console.warn('✗ No token found in localStorage for:', config.url);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    const isAuthRequest = originalRequest?.url && (
      originalRequest.url.includes('auth/login') ||
      originalRequest.url.includes('auth/google') ||
      originalRequest.url.includes('auth/register') ||
      originalRequest.url.includes('auth/refresh')
    );

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const currentToken = localStorage.getItem('access_token');
        if (!currentToken) {
          console.warn('No access token found in localStorage. Skipping token refresh.');
          return Promise.reject(error);
        }
        
        // Don't send Authorization header for refresh request to avoid infinite loop
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { accessToken: currentToken },
          { 
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        // Response structure: ApiResponse<LoginResponse>
        const apiResponse = refreshResponse.data;
        const loginData = apiResponse.data ?? apiResponse.Data; // LoginResponse
        const newAccessToken = loginData?.token ?? loginData?.Token;

        if (newAccessToken) {
          // Save new token
          localStorage.setItem('access_token', newAccessToken);
          
          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          // Retry the original request with new token
          return apiClient(originalRequest);
        } else {
          throw new Error('No token in refresh response');
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('gigbridge_user');
        localStorage.removeItem('gigbridge_session');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const handleResponse = <T>(response: AxiosResponse<any>): ApiResponse<T> => {
  const { data, status } = response;

  const normalizeApiResponse = (raw: any): ApiResponse<T> => ({
    success: raw.success ?? raw.Success ?? (status >= 200 && status < 300),
    statusCode: raw.statusCode ?? raw.StatusCode ?? status,
    message: raw.message ?? raw.Message ?? 'Success',
    data: (raw.data ?? raw.Data) as T,
    errors: raw.errors ?? raw.Errors,
  });

  // Backend returns ApiResponse<T> directly with success, statusCode, message
  if (data && typeof data === 'object' && (('success' in data && 'statusCode' in data) || ('Success' in data && 'StatusCode' in data))) {
    return normalizeApiResponse(data);
  }

  // If data has 'data' property, it's wrapped response
  if (data && typeof data === 'object' && ('data' in data || 'Data' in data)) {
    return normalizeApiResponse(data);
  }

  // Fallback - wrap raw data in ApiResponse
  return {
    success: status >= 200 && status < 300,
    statusCode: status,
    message: 'Success',
    data: data as T,
  };
};

export const apiService = {
  async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<ApiResponse<T>>(normalizeEndpoint(endpoint), { params });
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.response?.data?.Message || error.message || 'An error occurred',
        errors: error.response?.data?.errors,
        data: undefined,
      };
    }
  },

  async post<T>(endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<ApiResponse<T>>(normalizeEndpoint(endpoint), data, { headers });
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.response?.data?.Message || error.message || 'An error occurred',
        errors: error.response?.data?.errors,
        data: undefined,
      };
    }
  },

  async put<T>(endpoint: string, data: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<ApiResponse<T>>(normalizeEndpoint(endpoint), data);
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.response?.data?.Message || error.message || 'An error occurred',
        errors: error.response?.data?.errors,
        data: undefined,
      };
    }
  },

  async patch<T>(endpoint: string, data: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.patch<ApiResponse<T>>(normalizeEndpoint(endpoint), data);
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.response?.data?.Message || error.message || 'An error occurred',
        errors: error.response?.data?.errors,
        data: undefined,
      };
    }
  },

  async delete<T>(endpoint: string, data?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(normalizeEndpoint(endpoint), { data });
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.response?.data?.Message || error.message || 'An error occurred',
        errors: error.response?.data?.errors,
        data: undefined,
      };
    }
  },
};
