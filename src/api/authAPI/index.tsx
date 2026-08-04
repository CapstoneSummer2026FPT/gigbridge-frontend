import { authPostAPI } from './POST';

export const authAPI = {
  login: authPostAPI.login,
  register: authPostAPI.register,
  forgotPassword: authPostAPI.forgotPassword,
  resetPassword: authPostAPI.resetPassword,
  googleLogin: authPostAPI.googleLogin,
  sendOtp: authPostAPI.sendOtp,
  verifyOtp: authPostAPI.verifyOtp,
};

