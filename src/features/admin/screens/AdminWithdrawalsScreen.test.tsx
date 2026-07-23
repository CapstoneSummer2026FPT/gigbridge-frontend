import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WithdrawalStatus } from '../../../types';

const api = vi.hoisted(() => ({
  getWithdrawals: vi.fn(),
  syncWithdrawal: vi.fn(),
  retryWithdrawal: vi.fn(),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../shared/components/GigCoinAmount', () => ({
  GigCoinAmount: ({ amount }: { amount: number }) => <span>{amount} GC</span>,
}));
vi.mock('../../../api/adminAPI', () => ({ adminAPI: api }));

import AdminWithdrawalsScreen from './AdminWithdrawalsScreen';

const withdrawal = {
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
  status: WithdrawalStatus.SyncRequired,
  provider: 'PayOS',
  providerOrderCode: 'wd_1',
  providerRawStatus: 'HTTP_403',
  lastSyncError: 'PayOS payout request failed: IP is not allowed.',
  createdAt: '2026-07-17T00:00:00Z',
  canRetry: true,
};

describe('AdminWithdrawalsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getWithdrawals.mockResolvedValue({ success: true, data: [withdrawal] });
    api.syncWithdrawal.mockResolvedValue({ success: true, data: withdrawal });
    api.retryWithdrawal.mockResolvedValue({ success: true, data: withdrawal });
  });

  it('shows sync for every nonterminal withdrawal and retry only when allowed', async () => {
    render(<AdminWithdrawalsScreen />);

    expect(await screen.findByRole('button', { name: 'Sync' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('reports retry as queued instead of completed', async () => {
    render(<AdminWithdrawalsScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(api.retryWithdrawal).toHaveBeenCalledWith('withdrawal-1'));
    expect(screen.getByText('Withdrawal retry queued; worker will process automatically.')).toBeInTheDocument();
  });

  it('does not show retry when the backend disallows it', async () => {
    api.getWithdrawals.mockResolvedValue({
      success: true,
      data: [{ ...withdrawal, status: WithdrawalStatus.Processing, canRetry: false }],
    });

    render(<AdminWithdrawalsScreen />);

    expect(await screen.findByRole('button', { name: 'Sync' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
