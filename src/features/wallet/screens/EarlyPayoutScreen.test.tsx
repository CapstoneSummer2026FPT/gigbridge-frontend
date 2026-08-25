import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EarlyPayoutScreen from './EarlyPayoutScreen';

const api = vi.hoisted(() => ({
  getMyWallet: vi.fn(),
  getWithdrawals: vi.fn(),
  getWithdrawalSettings: vi.fn(),
  createWithdrawal: vi.fn(),
  syncWithdrawal: vi.fn(),
}));

const stable = vi.hoisted(() => ({
  navigate: vi.fn(),
  translate: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
}));

const savedAccount = vi.hoisted(() => ({
  bankAccountId: 'bank-account-1',
  userId: 'freelancer-1',
  bankBin: '970436',
  bankCode: 'VCB',
  bankName: 'Ngân hàng Vietcombank',
  accountNumberMasked: '********9012',
  accountName: 'NGUYEN VAN A',
  status: 0,
  isDefault: true,
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: null,
}));

vi.mock('../../../api/walletAPI/GET', () => ({
  walletGetAPI: {
    getMyWallet: api.getMyWallet,
    getWithdrawals: api.getWithdrawals,
    getWithdrawalSettings: api.getWithdrawalSettings,
  },
}));

vi.mock('../../../api/walletAPI/POST', () => ({
  walletPostAPI: {
    createWithdrawal: api.createWithdrawal,
    syncWithdrawal: api.syncWithdrawal,
  },
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: stable.translate }),
}));

vi.mock('react-router', () => ({ useNavigate: () => stable.navigate }));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../shared/components/GigCoinAmount', () => ({
  GigCoinLogo: () => <span>G</span>,
  GigCoinAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

vi.mock('../components/BankAccountManager', async () => {
  const React = await import('react');
  return {
    default: ({ onBankAccountsChange }: { onBankAccountsChange?: (accounts: typeof savedAccount[]) => void }) => {
      React.useEffect(() => {
        onBankAccountsChange?.([savedAccount]);
      }, [onBankAccountsChange]);
      return <div>Danh mục VietQR tạm thời không khả dụng</div>;
    },
  };
});

describe('EarlyPayoutScreen', () => {
  it('keeps withdrawal enabled for a saved active account when VietQR is unavailable', async () => {
    api.getMyWallet.mockResolvedValue({
      success: true,
      data: {
        depositedGigCoin: 0,
        withdrawableGigCoin: 100,
        pendingWithdrawalGigCoin: 0,
        depositedGigCoinVnd: 0,
        withdrawableGigCoinVnd: 100_000,
        pendingWithdrawalGigCoinVnd: 0,
      },
    });
    api.getWithdrawals.mockResolvedValue({ success: true, data: [] });
    api.getWithdrawalSettings.mockResolvedValue({
      success: true,
      data: {
        enabled: true,
        vndPerToken: 1_000,
        fixedFeeVnd: 0,
        minTokens: 10,
        maxTokens: 1_000,
        dailyMaxTokens: 1_000,
        provider: 'PayOS',
      },
    });

    render(<EarlyPayoutScreen />);

    expect(await screen.findByText('Ngân hàng Vietcombank')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo Yêu Cầu Rút Tiền' })).toBeEnabled();
  });
});
