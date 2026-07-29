import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  LoginResponse,
  UserDTO,
  SendOtpRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ChangePasswordProfileRequest,
} from '../../types/models/Auth';

const authUrl = 'auth';


export const authPostAPI = {
  /**
   * Login with email and password
   * POST /v1/auth/login
   */
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiService.post<LoginResponse>(`${authUrl}/login`, credentials);
  },

  /**
   * Register new user
   * POST /v1/auth/register
   */
  register: async (data: RegisterRequest): Promise<ApiResponse<UserDTO>> => {
    return apiService.post<UserDTO>(`${authUrl}/register`, data);
  },

  /**
   * Forgot password - send reset email
   * POST /v1/auth/forgot-password
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authUrl}/forgot-password`, data);
  },

  /**
   * Reset password with token
   * POST /v1/auth/password-reset
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authUrl}/password-reset`, data);
  },

  /**
   * Google login
   * POST /v1/auth/google
   */
  googleLogin: async (authCode: string, role?: number, isFromSignIn?: boolean): Promise<ApiResponse<LoginResponse>> => {
    return apiService.post<LoginResponse>(`${authUrl}/google`, { authCode, role, isFromSignIn });
  },

  /**
   * Send OTP verification code
   * POST /auth/send-otp
   */
  sendOtp: async (data: SendOtpRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authUrl}/send-otp`, data);
  },

  /**
   * Verify OTP verification code
   * POST /auth/verify-otp
   */
  verifyOtp: async (data: VerifyOtpRequest): Promise<ApiResponse<VerifyOtpResponse>> => {
    return apiService.post<VerifyOtpResponse>(`${authUrl}/verify-otp`, data);
  },

  /**
   * Change user password (authenticated)
   * POST /v1/auth/change-password
   */
  changePassword: async (data: ChangePasswordProfileRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authUrl}/change-password`, data);
  },
};

