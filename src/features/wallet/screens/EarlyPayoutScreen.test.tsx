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
        walletId: 'wallet-1',
        userId: 'user-1',
        depositedGigCoin: 500,
        withdrawableGigCoin: 500,
        heldGigCoin: 0,
        pendingWithdrawalGigCoin: 0,
        totalSpendableGigCoin: 1000,
        depositedGigCoinVnd: 500000,
        withdrawableGigCoinVnd: 500000,
        heldGigCoinVnd: 0,
        pendingWithdrawalGigCoinVnd: 0,
        totalSpendableGigCoinVnd: 1000000,
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

  it('caps withdrawals at earned GigCoin and ignores deposited GigCoin for eligibility', async () => {
    api.getMyWallet.mockResolvedValue({
      success: true,
      data: {
        walletId: 'wallet-1',
        userId: 'user-1',
        depositedGigCoin: 500,
        withdrawableGigCoin: 25,
        heldGigCoin: 0,
        pendingWithdrawalGigCoin: 0,
        totalSpendableGigCoin: 525,
        depositedGigCoinVnd: 500000,
        withdrawableGigCoinVnd: 25000,
        heldGigCoinVnd: 0,
        pendingWithdrawalGigCoinVnd: 0,
        totalSpendableGigCoinVnd: 525000,
      },
    });

    render(<EarlyPayoutScreen />);

    const amountInput = await screen.findByRole('spinbutton');
    const submit = document.querySelector('button.early-payout-submit');
    expect(submit).not.toBeNull();
    expect(amountInput).toHaveAttribute('max', '25');
    expect(submit).toBeDisabled();

    fireEvent.change(amountInput, { target: { value: '25' } });
    await waitFor(() => expect(submit).toBeEnabled());
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

  it('shows nonterminal withdrawals as automatically processed', async () => {
    api.getWithdrawals.mockResolvedValue({
      success: true,
      data: [{
        withdrawalId: 'withdrawal-1',
        userId: 'user-1',
        walletId: 'wallet-1',
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        bankAccountNumberMasked: '*****1234',
        bankAccountName: 'NGUYEN VAN A',
        tokenAmount: 10,
        vndAmount: 10000,
        feeVnd: 0,
        netVndAmount: 10000,
        status: 2,
        provider: 'PayOS',
        providerOrderCode: 'wd_1',
        createdAt: '2026-07-17T00:00:00Z',
        canRetry: true,
      }],
    });

    render(<EarlyPayoutScreen />);

    expect(await screen.findByText('Đang xử lý tự động')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kiểm tra trạng thái' })).toBeInTheDocument();
  });
});
