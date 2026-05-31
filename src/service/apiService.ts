import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/common';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5222/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - attach token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const currentToken = localStorage.getItem('access_token');
        
        // Don't send Authorization header for refresh request to avoid infinite loop
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/v1/auth/refresh`,
          { accessToken: currentToken },
          { 
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        // Response structure: ApiResponse<LoginResponse>
        const apiResponse = refreshResponse.data;
        const loginData = apiResponse.data; // LoginResponse
        const newAccessToken = loginData?.token;

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

  // Backend returns ApiResponse<T> directly with success, statusCode, message
  if (data && typeof data === 'object' && 'success' in data && 'statusCode' in data) {
    return data as ApiResponse<T>;
  }

  // If data has 'data' property, it's wrapped response
  if (data && typeof data === 'object' && 'data' in data) {
    return data as ApiResponse<T>;
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
      const response = await apiClient.get<ApiResponse<T>>(endpoint, { params });
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.message || 'An error occurred',
        data: undefined,
      };
    }
  },

  async post<T>(endpoint: string, data: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<ApiResponse<T>>(endpoint, data);
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.message || 'An error occurred',
        data: undefined,
      };
    }
  },

  async put<T>(endpoint: string, data: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<ApiResponse<T>>(endpoint, data);
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.message || 'An error occurred',
        data: undefined,
      };
    }
  },

  async patch<T>(endpoint: string, data: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.patch<ApiResponse<T>>(endpoint, data);
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.message || 'An error occurred',
        data: undefined,
      };
    }
  },

  async delete<T>(endpoint: string, data?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(endpoint, { data });
      return handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || error.message || 'An error occurred',
        data: undefined,
      };
    }
  },
};
