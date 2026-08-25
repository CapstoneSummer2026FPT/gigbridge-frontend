import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BankAccountStatus, UserRole } from '../../../types';
import BankAccountManager from './BankAccountManager';

const api = vi.hoisted(() => ({
  getBankAccounts: vi.fn(),
  getSupportedBanks: vi.fn(),
  createBankAccount: vi.fn(),
  updateBankAccount: vi.fn(),
  deleteBankAccount: vi.fn(),
}));

const stable = vi.hoisted(() => ({
  translate: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
}));

vi.mock('../../../api/walletAPI/GET', () => ({
  walletGetAPI: {
    getBankAccounts: api.getBankAccounts,
    getSupportedBanks: api.getSupportedBanks,
  },
}));

vi.mock('../../../api/walletAPI/POST', () => ({
  walletPostAPI: {
    createBankAccount: api.createBankAccount,
    updateBankAccount: api.updateBankAccount,
    deleteBankAccount: api.deleteBankAccount,
  },
}));

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ role: UserRole.Freelancer }),
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: stable.translate,
  }),
}));

vi.mock('@gsap/react', () => ({ useGSAP: () => undefined }));
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn() } }));

const savedAccount = {
  bankAccountId: 'bank-account-1',
  userId: 'freelancer-1',
  bankBin: '970436',
  bankCode: 'VCB',
  bankName: 'Ngân hàng Vietcombank',
  accountNumberMasked: '********9012',
  accountName: 'NGUYEN VAN A',
  status: BankAccountStatus.Active,
  isDefault: true,
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: null,
};

const supportedBank = {
  bin: '970436',
  code: 'VCB',
  shortName: 'Vietcombank',
  name: 'Ngân hàng Vietcombank',
  logo: 'https://api.vietqr.io/img/VCB.png',
};

describe('BankAccountManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getBankAccounts.mockResolvedValue({ success: true, data: [] });
    api.getSupportedBanks.mockResolvedValue({ success: true, data: [supportedBank] });
    api.createBankAccount.mockResolvedValue({ success: true, data: savedAccount });
    api.updateBankAccount.mockResolvedValue({ success: true, data: savedAccount });
    api.deleteBankAccount.mockResolvedValue({ success: true, data: {} });
  });

  it('keeps saved accounts available and disables editing when VietQR is unavailable', async () => {
    const onBankAccountsChange = vi.fn();
    api.getBankAccounts.mockResolvedValue({ success: true, data: [savedAccount] });
    api.getSupportedBanks.mockResolvedValue({
      success: false,
      statusCode: 503,
      message: 'The supported-bank directory is temporarily unavailable.',
    });

    render(<BankAccountManager onBankAccountsChange={onBankAccountsChange} />);

    expect(await screen.findByTestId('bank-directory-unavailable')).toBeInTheDocument();
    expect(await screen.findByText('Ngân hàng Vietcombank')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ngân hàng Vietcombank logo' })).toHaveAttribute(
      'src',
      'https://api.vietqr.io/img/VCB.png'
    );
    expect(screen.getByRole('button', { name: 'Lưu tài khoản' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sửa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xóa' })).toBeEnabled();
    expect(onBankAccountsChange).toHaveBeenCalledWith([savedAccount]);
  });

  it('submits only canonical bank BIN and account fields', async () => {
    render(<BankAccountManager />);

    const selector = await screen.findByRole('button', { name: 'Chọn ngân hàng' });
    fireEvent.click(selector);
    fireEvent.change(screen.getByPlaceholderText(/Tìm kiếm ngân hàng/), {
      target: { value: 'VCB' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Ngân hàng Vietcombank/ }));
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: NGUYEN VAN A'), {
      target: { value: 'NGUYEN VAN A' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập số tài khoản'), {
      target: { value: '123456789012' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));

    await waitFor(() => expect(api.createBankAccount).toHaveBeenCalledTimes(1));
    expect(api.createBankAccount).toHaveBeenCalledWith({
      bankBin: '970436',
      accountName: 'NGUYEN VAN A',
      accountNumber: '123456789012',
      isDefault: true,
    });
  });
});
