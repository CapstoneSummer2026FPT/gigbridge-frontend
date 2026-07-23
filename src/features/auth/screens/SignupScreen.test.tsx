import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignupScreen from './SignupScreen';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signup: vi.fn(),
  googleLogin: vi.fn(),
  requestCode: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ signup: mocks.signup, googleLogin: mocks.googleLogin }),
}));

vi.mock('../../../api/authAPI', () => ({
  authAPI: {
    sendOtp: mocks.sendOtp,
    verifyOtp: mocks.verifyOtp,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

vi.mock('gsap', () => ({
  default: {
    from: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn((_target, options) => options?.onComplete?.()),
  },
}));

vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'app.name': 'GigBridge',
      'auth.imClient': "I'm a Client",
      'auth.imClientDesc': 'Hire freelancers',
      'auth.imFreelancer': "I'm a Freelancer",
      'auth.imFreelancerDesc': 'Find work',
      'auth.policyAgreement': 'Tôi đã đọc và đồng ý với Bộ chính sách GigBridge phiên bản 1.0-DATN',
      'auth.policyAcceptanceRequired': 'Bạn cần đồng ý với Bộ chính sách GigBridge trước khi đăng ký.',
      'auth.googleSignup': 'Đăng ký với Google',
      'auth.fullName': 'Họ và Tên',
      'auth.email': 'Email',
      'auth.otpCode': 'Mã OTP',
      'auth.password': 'Mật khẩu',
      'auth.sendOtp': 'Gửi OTP',
      'auth.verifyOtp': 'Xác thực OTP',
      'auth.verified': 'Đã xác thực',
      'auth.createAccount': 'Tạo tài khoản',
      'footer.termsOfService': 'Điều Khoản Dịch Vụ',
      'footer.privacyPolicy': 'Chính Sách Bảo Mật',
      'projects.client': 'Client',
      'projects.freelancer': 'Freelancer',
    }[key] || key),
  }),
}));

const chooseClient = () => {
  fireEvent.click(screen.getByRole('button', { name: /I'm a Client/i }));
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });
  mocks.verifyOtp.mockResolvedValue({ success: true, message: 'OTP verified' });
  mocks.signup.mockResolvedValue(undefined);

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  });

  Object.defineProperty(window, 'google', {
    configurable: true,
    value: {
      accounts: {
        oauth2: {
          initCodeClient: vi.fn(() => ({ requestCode: mocks.requestCode })),
        },
      },
    },
  });
});

afterEach(() => cleanup());

describe('SignupScreen policy acceptance', () => {
  it('blocks both email and Google signup until the policy is accepted', async () => {
    render(<SignupScreen />);
    chooseClient();

    const agreement = screen.getByRole('checkbox', {
      name: 'Tôi đã đọc và đồng ý với Bộ chính sách GigBridge phiên bản 1.0-DATN',
    });
    const googleButton = screen.getByRole('button', { name: 'Đăng ký với Google' });
    const submitButton = screen.getByRole('button', { name: 'Tạo tài khoản' });

    expect(agreement).not.toBeChecked();
    expect(googleButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Điều Khoản Dịch Vụ' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Chính Sách Bảo Mật' })).toHaveAttribute('target', '_blank');

    fireEvent.submit(submitButton.closest('form')!);
    expect(mocks.signup).not.toHaveBeenCalled();
    expect(mocks.requestCode).not.toHaveBeenCalled();

    fireEvent.click(agreement);
    await waitFor(() => expect(googleButton).toBeEnabled());
    fireEvent.click(googleButton);
    expect(mocks.requestCode).toHaveBeenCalledTimes(1);
  });

  it('keeps the existing email registration payload after acceptance', async () => {
    render(<SignupScreen />);
    chooseClient();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText('Họ và Tên'), { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Mật khẩu'), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP' }));
    await waitFor(() => expect(mocks.sendOtp).toHaveBeenCalledWith({ email: 'a@example.com' }));

    fireEvent.change(screen.getByPlaceholderText('Mã OTP'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác thực OTP/ }));
    await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledWith({ email: 'a@example.com', otp: '123456' }));

    const submitButton = screen.getByRole('button', { name: 'Tạo tài khoản' });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() => expect(mocks.signup).toHaveBeenCalledWith(
      'a@example.com',
      'Password123!',
      'Nguyễn Văn A',
      0,
    ));
  });
});
