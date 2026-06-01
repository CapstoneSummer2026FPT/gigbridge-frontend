export interface ResetPasswordRequest {
  passwordResetToken: string;
  email: string;
  newPassword: string;
}
