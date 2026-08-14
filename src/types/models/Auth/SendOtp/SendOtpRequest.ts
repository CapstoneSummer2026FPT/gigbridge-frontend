export interface SendOtpRequest {
  email: string;
  purpose: 'signup' | 'identity_verification';
}
