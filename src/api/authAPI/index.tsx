export { authGetAPI } from './GET';
export { authPostAPI } from './POST';
export { authPutAPI } from './PUT';

// Combined auth API for convenience
import { authGetAPI } from './GET';
import { authPostAPI } from './POST';
import { authPutAPI } from './PUT';

export const authAPI = {
  login: authPostAPI.login,
  register: authPostAPI.register,
  refreshToken: authPostAPI.refreshToken,
  forgotPassword: authPostAPI.forgotPassword,
  resetPassword: authPostAPI.resetPassword,
  resendEmailConfirmation: authPostAPI.resendEmailConfirmation,
  validateResetToken: authPostAPI.validateResetToken,
  googleLogin: authPostAPI.googleLogin,
  verifyEmail: authGetAPI.verifyEmail,
  testAuth: authGetAPI.testAuth,
  markSetupComplete: authPutAPI.markSetupComplete,
  sendOtp: authPostAPI.sendOtp,
  verifyOtp: authPostAPI.verifyOtp,
};

