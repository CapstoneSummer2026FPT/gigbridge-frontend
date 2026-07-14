import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getMyWallet: vi.fn(),
  getBankAccounts: vi.fn(),
  getWithdrawals: vi.fn(),
  getWithdrawalSettings: vi.fn(),
  getSupportedBanks: vi.fn(),
  createWithdrawal: vi.fn(),
  updateBankAccount: vi.fn(),
  createBankAccount: vi.fn(),
  deleteBankAccount: vi.fn(),
  syncWithdrawal: vi.fn(),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../shared/components/GigCoinAmount', () => ({
  GigCoinAmount: ({ amount }: { amount: number }) => <span>{amount} GC</span>,
}));
vi.mock('../../../api/walletAPI/GET', () => ({
  walletGetAPI: {
    getMyWallet: api.getMyWallet,
    getBankAccounts: api.getBankAccounts,
    getWithdrawals: api.getWithdrawals,
    getWithdrawalSettings: api.getWithdrawalSettings,
    getSupportedBanks: api.getSupportedBanks,
  },
}));
vi.mock('../../../api/walletAPI/POST', () => ({
  walletPostAPI: {
    createWithdrawal: api.createWithdrawal,
    updateBankAccount: api.updateBankAccount,
    createBankAccount: api.createBankAccount,
    deleteBankAccount: api.deleteBankAccount,
    syncWithdrawal: api.syncWithdrawal,
  },
}));

import EarlyPayoutScreen from './EarlyPayoutScreen';

describe('EarlyPayoutScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMyWallet.mockResolvedValue({
      success: true,
      data: {
        availableTokens: 500,
        withdrawableTokens: 500,
        heldTokens: 0,
        pendingWithdrawalTokens: 0,
        availableVnd: 500000,
        withdrawableVnd: 500000,
        heldVnd: 0,
        pendingWithdrawalVnd: 0,
      },
    });
    api.getBankAccounts.mockResolvedValue({
      success: true,
      data: [{
        bankAccountId: 'bank-1',
        userId: 'user-1',
        bankBin: '970436',
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        accountNumberMasked: '*****1234',
        accountName: 'NGUYEN VAN A',
        status: 0,
        isDefault: true,
        createdAt: '2026-07-15T00:00:00Z',
      }],
    });
    api.getWithdrawals.mockResolvedValue({ success: true, data: [] });
    api.getWithdrawalSettings.mockResolvedValue({
      success: true,
      data: {
        enabled: true,
        vndPerToken: 1000,
        fixedFeeVnd: 0,
        minTokens: 10,
        maxTokens: 100000,
        dailyMaxTokens: 500000,
        provider: 'PayOS',
      },
    });
    api.getSupportedBanks.mockResolvedValue({
      success: true,
      data: [{ bin: '970436', code: 'VCB', shortName: 'VCB', name: 'Vietcombank' }],
    });
    api.createWithdrawal.mockResolvedValue({ success: false, message: 'Network response was lost.' });
  });

  it('reuses the idempotency key when the same draft is retried', async () => {
    render(<EarlyPayoutScreen />);

    const submit = await screen.findByRole('button', { name: /Tạo yêu cầu rút tiền/i });
    await waitFor(() => expect(submit).toBeEnabled());

    fireEvent.click(submit);
    await waitFor(() => expect(api.createWithdrawal).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    await waitFor(() => expect(api.createWithdrawal).toHaveBeenCalledTimes(2));

    expect(api.createWithdrawal.mock.calls[1][0].idempotencyKey)
      .toBe(api.createWithdrawal.mock.calls[0][0].idempotencyKey);
  });

  it('shows a disabled bank account for repair but does not allow it for withdrawal', async () => {
    api.getBankAccounts.mockResolvedValue({
      success: true,
      data: [{
        bankAccountId: 'bank-disabled',
        userId: 'user-1',
        bankBin: null,
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        accountNumberMasked: '*****1234',
        accountName: 'NGUYEN VAN A',
        status: 1,
        isDefault: false,
        createdAt: '2026-07-15T00:00:00Z',
      }],
    });

    render(<EarlyPayoutScreen />);

    expect(await screen.findByText(/Cần chọn lại ngân hàng và nhập lại số tài khoản/i)).toBeInTheDocument();
    expect(screen.getByText(/Chưa có tài khoản ngân hàng/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    expect(screen.getByPlaceholderText('Nhập lại số tài khoản')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cập nhật tài khoản/i }));
    expect(api.updateBankAccount).not.toHaveBeenCalled();
  });
});
