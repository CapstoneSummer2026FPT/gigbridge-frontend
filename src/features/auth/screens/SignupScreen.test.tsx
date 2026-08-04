import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignupScreen from './SignupScreen';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signup: vi.fn(),
  googleLogin: vi.fn(),
  requestCode: vi.fn(),
  scrollIntoView: vi.fn(),
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
      'auth.policyAgreement': 'Tôi đã đọc và đồng ý với Bộ chính sách GigBridge ',
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

const fillAndVerifyEmailSignupForm = async (): Promise<void> => {
  fireEvent.change(screen.getByPlaceholderText('Họ và Tên'), {
    target: { value: 'Nguyễn Văn A' },
  });
  fireEvent.change(screen.getByPlaceholderText('Email'), {
    target: { value: 'a@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('Mật khẩu'), {
    target: { value: 'Password123!' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP' }));
  await waitFor(() => expect(mocks.sendOtp).toHaveBeenCalledWith({
    email: 'a@example.com',
    purpose: 'signup',
  }));

  fireEvent.change(screen.getByPlaceholderText('Mã OTP'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Xác thực OTP/ }));
  await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledWith({
    email: 'a@example.com',
    otp: '123456',
    purpose: 'signup',
  }));
};

const verificationTicket =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });
  mocks.verifyOtp.mockResolvedValue({
    success: true,
    message: 'OTP verified',
    data: { verificationTicket },
  });
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

  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: mocks.scrollIntoView,
  });
});

afterEach(() => cleanup());

describe('SignupScreen policy acceptance', () => {
  it('keeps the form usable and explains the policy requirement for Google signup', async () => {
    render(<SignupScreen />);
    chooseClient();

    const agreement = screen.getByRole('checkbox', {
      name: 'Tôi đã đọc và đồng ý với Bộ chính sách GigBridge',
    });
    const googleButton = screen.getByRole('button', { name: 'Đăng ký với Google' });
    const submitButton = screen.getByRole('button', { name: 'Tạo tài khoản' });
    const passwordInput = screen.getByPlaceholderText('Mật khẩu');

    expect(agreement).not.toBeChecked();
    expect(screen.getByPlaceholderText('Họ và Tên')).toBeEnabled();
    expect(screen.getByPlaceholderText('Email')).toBeEnabled();
    expect(passwordInput).toBeEnabled();
    expect(submitButton).toBeDisabled();
    expect(
      passwordInput.compareDocumentPosition(agreement) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      agreement.compareDocumentPosition(submitButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(screen.getByRole('link', { name: 'Điều Khoản Dịch Vụ' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Điều Khoản Dịch Vụ' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Chính Sách Bảo Mật' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Chính Sách Bảo Mật' })).toHaveAttribute('rel', 'noopener noreferrer');

    await waitFor(() => expect(googleButton).toBeEnabled());
    fireEvent.click(googleButton);
    expect(mocks.requestCode).not.toHaveBeenCalled();
    const policyAlert = screen.getByRole('alert');
    expect(policyAlert).toHaveTextContent(
      'Bạn cần đồng ý với Bộ chính sách GigBridge trước khi đăng ký.',
    );
    expect(policyAlert).toHaveAttribute('id', 'policy-acceptance-error');
    expect(agreement).toHaveAttribute('aria-invalid', 'true');
    expect(agreement).toHaveAttribute('aria-describedby', policyAlert.id);
    expect(agreement).toHaveFocus();
    expect(mocks.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });

    fireEvent.click(agreement);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(agreement).not.toHaveAttribute('aria-invalid');
    expect(agreement).not.toHaveAttribute('aria-describedby');
    fireEvent.click(googleButton);
    expect(mocks.requestCode).toHaveBeenCalledTimes(1);
  });

  it('blocks final email signup without clearing verified form data', async () => {
    render(<SignupScreen />);
    chooseClient();

    await fillAndVerifyEmailSignupForm();
    const agreement = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: 'Tạo tài khoản' });
    await waitFor(() => expect(submitButton).toBeEnabled());

    fireEvent.click(submitButton);
    expect(mocks.signup).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bạn cần đồng ý với Bộ chính sách GigBridge trước khi đăng ký.',
    );
    expect(agreement).toHaveFocus();

    fireEvent.click(agreement);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(agreement);
    expect(screen.getByPlaceholderText('Họ và Tên')).toHaveValue('Nguyễn Văn A');
    expect(screen.getByPlaceholderText('Email')).toHaveValue('a@example.com');
    expect(screen.getByPlaceholderText('Mã OTP')).toHaveValue('123456');
    expect(screen.getByPlaceholderText('Mật khẩu')).toHaveValue('Password123!');
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);
    expect(mocks.signup).not.toHaveBeenCalled();
    fireEvent.click(agreement);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(submitButton);

    await waitFor(() => expect(mocks.signup).toHaveBeenCalledWith(
      'a@example.com',
      'Password123!',
      'Nguyễn Văn A',
      0,
      verificationTicket,
    ));
  });

  it('disables signup controls while email registration is in progress', async () => {
    let finishSignup: (() => void) | undefined;
    mocks.signup.mockImplementation(() => new Promise<void>(resolve => {
      finishSignup = resolve;
    }));

    render(<SignupScreen />);
    chooseClient();

    await fillAndVerifyEmailSignupForm();
    const agreement = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: 'Tạo tài khoản' });
    fireEvent.click(agreement);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(agreement).toBeDisabled();
      expect(screen.getByPlaceholderText('Họ và Tên')).toBeDisabled();
      expect(screen.getByPlaceholderText('Email')).toBeDisabled();
      expect(screen.getByPlaceholderText('Mật khẩu')).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    if (finishSignup) {
      finishSignup();
    }
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/onboarding/profile-setup'));
  });
});
