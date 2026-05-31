import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  EmailResendConfirmationRequest,
  ValidateResetTokenRequest,
  LoginResponse,
  UserDTO,
  SendOtpRequest,
  VerifyOtpRequest,
} from '../../types/models/Auth';

const authV1Url = 'auth';

export const authPostAPI = {
  /**
   * Login with email and password
   * POST /v1/auth/login
   */
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiService.post<LoginResponse>(`${authV1Url}/login`, credentials);
  },

  /**
   * Register new user
   * POST /v1/auth/register
   */
  register: async (data: RegisterRequest): Promise<ApiResponse<UserDTO>> => {
    return apiService.post<UserDTO>(`${authV1Url}/register`, data);
  },

  /**
   * Refresh access token
   * POST /v1/auth/refresh
   */
  refreshToken: async (accessToken: string): Promise<ApiResponse<LoginResponse>> => {
    return apiService.post<LoginResponse>(`${authV1Url}/refresh`, { accessToken });
  },

  /**
   * Forgot password - send reset email
   * POST /v1/auth/forgot-password
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authV1Url}/forgot-password`, data);
  },

  /**
   * Reset password with token
   * POST /v1/auth/password-reset
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authV1Url}/password-reset`, data);
  },

  /**
   * Resend email confirmation
   * POST /v1/auth/resend-email
   */
  resendEmailConfirmation: async (data: EmailResendConfirmationRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authV1Url}/resend-email`, data);
  },

  /**
   * Validate reset token
   * POST /v1/auth/validate-reset-token
   */
  validateResetToken: async (data: ValidateResetTokenRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authV1Url}/validate-reset-token`, data);
  },

  /**
   * Google login
   * POST /v1/auth/google
   */
  googleLogin: async (authCode: string, role?: number): Promise<ApiResponse<LoginResponse>> => {
    return apiService.post<LoginResponse>(`${authV1Url}/google`, { authCode, role });
  },

  /**
   * Send OTP verification code
   * POST /auth/send-otp
   */
  sendOtp: async (data: SendOtpRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authV1Url}/send-otp`, data);
  },

  /**
   * Verify OTP verification code
   * POST /auth/verify-otp
   */
  verifyOtp: async (data: VerifyOtpRequest): Promise<ApiResponse<null>> => {
    return apiService.post<null>(`${authV1Url}/verify-otp`, data);
  },
};

