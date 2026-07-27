import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import type { ContractEscrowDto } from '../../../types/models/Contract';
import { toast } from 'sonner';
import { ClientEscrowFundingCard } from './ClientEscrowFundingCard';

vi.mock('../../../api/contractAPI/POST', () => ({
  contractPostAPI: {
    fundEscrow: vi.fn(),
  },
}));

vi.mock('../../../api/walletAPI/GET', () => ({
  walletGetAPI: {
    getMyWallet: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'common.loading': 'Loading...',
        'contracts.secureContractEscrow': 'Secure Contract Escrow',
        'contracts.escrowFundingDesc': 'Fund the contract.',
        'contracts.escrowHeldTokens': 'Held in escrow',
        'contracts.escrowFundingFee': `Funding fee (${String(values?.percent ?? '')}%)`,
        'contracts.totalWalletDebit': 'Total wallet debit',
        'contracts.yourWalletBalance': 'Wallet balance',
        'contracts.shortOf': `Short by ${String(values?.amount ?? '')}`,
        'contracts.insufficientTokensDesc': 'Insufficient balance.',
        'contracts.topUpWallet': 'Top Up Wallet',
        'contracts.fundEscrowNow': 'Fund Escrow Now',
        'contracts.fundingEscrow': 'Funding escrow...',
        'contracts.escrowQuoteUnavailable': 'Quote unavailable.',
        'contracts.walletLoadFailed': 'Wallet failed.',
        'contracts.escrowFundingFailed': 'Funding failed.',
        'contracts.escrowFundedSuccess': 'Escrow funded.',
        'contracts.retry': 'Retry',
      };
      return translations[key] ?? key;
    },
  }),
}));

const quote: ContractEscrowDto = {
  contractEscrowId: 'escrow-1',
  requiredAmount: 1_000_000,
  requiredTokens: 1_000,
  fundingFeeRate: 0.01,
  fundingFeeVnd: 10_000,
  fundingFeeTokens: 10,
  totalDebitTokens: 1_010,
  fundedAmount: 0,
  releasedAmount: 0,
  requiredPercentage: 1,
  currency: 'VND',
  status: 0,
  createdAt: '2026-07-28T00:00:00.000Z',
  fundedAt: null,
};

const renderCard = (
  onFunded = vi.fn(),
  onRetryQuote = vi.fn()
) => render(
  <MemoryRouter>
    <ClientEscrowFundingCard
      contractId="contract-1"
      escrow={quote}
      onFunded={onFunded}
      onRetryQuote={onRetryQuote}
    />
  </MemoryRouter>
);

describe('ClientEscrowFundingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows funding when the wallet exactly covers escrow and fee', async () => {
    const user = userEvent.setup();
    const onFunded = vi.fn();
    vi.mocked(walletGetAPI.getMyWallet).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Loaded',
      data: {
        walletId: 'wallet-1',
        userId: 'client-1',
        availableTokens: 1_010,
        withdrawableTokens: 0,
        heldTokens: 0,
        pendingWithdrawalTokens: 0,
        availableVnd: 1_010_000,
        withdrawableVnd: 0,
        heldVnd: 0,
        pendingWithdrawalVnd: 0,
      },
    });
    vi.mocked(contractPostAPI.fundEscrow).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Funded',
    });

    renderCard(onFunded);

    const fundButton = await screen.findByRole('button', { name: 'Fund Escrow Now' });
    await waitFor(() => expect(fundButton).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'Top Up Wallet' })).not.toBeInTheDocument();
    expect(screen.getAllByText('1,010 G-coin')).toHaveLength(2);

    await user.dblClick(fundButton);

    await waitFor(() => {
      expect(contractPostAPI.fundEscrow).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Escrow funded.');
      expect(onFunded).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the precise shortfall and does not call funding when balance is insufficient', async () => {
    vi.mocked(walletGetAPI.getMyWallet).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Loaded',
      data: {
        walletId: 'wallet-1',
        userId: 'client-1',
        availableTokens: 1_009.9999,
        withdrawableTokens: 0,
        heldTokens: 0,
        pendingWithdrawalTokens: 0,
        availableVnd: 1_009_999.9,
        withdrawableVnd: 0,
        heldVnd: 0,
        pendingWithdrawalVnd: 0,
      },
    });

    renderCard();

    expect(await screen.findByText('Short by 0.0001 G-coin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Top Up Wallet/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fund Escrow Now' })).not.toBeInTheDocument();
    expect(contractPostAPI.fundEscrow).not.toHaveBeenCalled();
  });

  it('shows retry instead of a false insufficient-balance state when wallet loading fails', async () => {
    vi.mocked(walletGetAPI.getMyWallet).mockResolvedValue({
      success: false,
      statusCode: 503,
      message: 'Wallet unavailable',
    });

    renderCard();

    expect(await screen.findByText('Wallet unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Top Up Wallet' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fund Escrow Now' })).not.toBeInTheDocument();
  });
});
