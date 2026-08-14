export interface VerifyOtpRequest {
  email: string;
  otp: string;
  purpose: 'signup' | 'password_reset' | 'identity_verification';
  identityOrTaxCode?: string;
}
