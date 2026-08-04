export interface ResetPasswordRequest {
  otp: string;
  email: string;
  newPassword: string;
}
