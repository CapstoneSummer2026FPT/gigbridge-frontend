import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WalletHistoryScreen from '../WalletHistoryScreen';
import { walletGetAPI } from '../../../../api/walletAPI/GET';
import type { WalletTransactionResponse, WalletTransactionsSummaryResponse } from '../../../../types/models/Financial';

vi.mock('../../../../api/walletAPI/GET', () => ({
  walletGetAPI: {
    getTransactions: vi.fn(),
    getTransactionsSummary: vi.fn(),
  },
}));

vi.mock('../../../../api/walletAPI/POST', () => ({
  walletPostAPI: {
    syncPayOsTopUp: vi.fn(),
  },
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function tx(overrides: Partial<WalletTransactionResponse>): WalletTransactionResponse {
  return {
    walletTransactionId: 'tx-1',
    walletId: 'wallet-1',
    userId: 'user-1',
    tokenAmount: 25,
    vndAmount: 25000,
    type: 3, // EscrowRelease
    status: 1,
    balanceSource: 1,
    isCredit: true,
    depositedAmount: null,
    earnedAmount: 25,
    idempotencyKey: null,
    gatewayProvider: null,
    gatewayOrderCode: null,
    gatewayTransactionCode: null,
    contractId: null,
    contractEscrowId: null,
    note: 'Remaining escrow balance released to freelancer.',
    createdAt: '2026-08-11T09:00:00Z',
    completedAt: '2026-08-11T09:00:00Z',
    ...overrides,
  };
}

const emptySummary: WalletTransactionsSummaryResponse = {
  totalDeposits: 0,
  totalEscrow: 0,
  totalRefunds: 0,
  totalWithdrawn: 0,
  pendingCount: 0,
  totalTransactions: 0,
};

describe('WalletHistoryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an EscrowRelease transaction with isCredit=true as a positive/green amount', async () => {
    const freelancerCredit = tx({ walletTransactionId: 'tx-credit', isCredit: true, tokenAmount: 25 });
    vi.mocked(walletGetAPI.getTransactions).mockResolvedValue({
      success: true, statusCode: 200, message: 'ok', data: [freelancerCredit],
    });
    vi.mocked(walletGetAPI.getTransactionsSummary).mockResolvedValue({
      success: true, statusCode: 200, message: 'ok', data: emptySummary,
    });

    render(<WalletHistoryScreen />);

    await waitFor(() => {
      expect(screen.getByText('+')).toBeInTheDocument();
    });
    const prefix = screen.getByText('+');
    expect(prefix.closest('[class*="text-green"]')).not.toBeNull();
  });

  it('renders an EscrowRelease transaction with isCredit=false as a negative/red amount', async () => {
    const clientDebit = tx({ walletTransactionId: 'tx-debit', isCredit: false, tokenAmount: 25 });
    vi.mocked(walletGetAPI.getTransactions).mockResolvedValue({
      success: true, statusCode: 200, message: 'ok', data: [clientDebit],
    });
    vi.mocked(walletGetAPI.getTransactionsSummary).mockResolvedValue({
      success: true, statusCode: 200, message: 'ok', data: emptySummary,
    });

    render(<WalletHistoryScreen />);

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });
    const prefix = screen.getByText('-');
    expect(prefix.closest('[class*="text-red"]')).not.toBeNull();
  });
});
