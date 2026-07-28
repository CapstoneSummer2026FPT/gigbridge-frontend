import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PremiumSubscription } from '../types';
import { PremiumStatusProvider } from './PremiumStatusProvider';
import { usePremiumStatus } from './usePremiumStatus';

const mocks = vi.hoisted(() => ({
  clientCurrentSubscription: vi.fn(),
  freelancerCurrentSubscription: vi.fn(),
}));

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({
    user: { id: 'client-1' },
    role: 0,
    isLoading: false,
  }),
}));

vi.mock('../api', () => ({
  clientPremiumAPI: {
    currentSubscription: mocks.clientCurrentSubscription,
  },
  premiumAPI: {
    currentSubscription: mocks.freelancerCurrentSubscription,
  },
}));

const activeSubscription: PremiumSubscription = {
  id: 'subscription-1',
  planId: 'plan-1',
  planName: 'Client Premium',
  status: 0,
  startDate: '2026-07-01T00:00:00.000Z',
  endDate: '2099-08-01T00:00:00.000Z',
  autoRenew: true,
  isPremium: true,
  createdAt: '2026-07-01T00:00:00.000Z',
};

function PremiumConsumer({ label }: { label: string }) {
  const status = usePremiumStatus();
  return (
    <div>
      <span>{label}:{status.loading ? 'loading' : status.error ? 'error' : status.isPremium ? 'premium' : 'free'}</span>
      {status.error && <button onClick={() => void status.refresh()}>Retry</button>}
    </div>
  );
}

describe('PremiumStatusProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shares one Premium request between multiple consumers', async () => {
    mocks.clientCurrentSubscription.mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: activeSubscription,
    });

    render(
      <PremiumStatusProvider>
        <PremiumConsumer label="header" />
        <PremiumConsumer label="page" />
      </PremiumStatusProvider>,
    );

    expect(screen.getByText('header:loading')).toBeInTheDocument();
    expect(screen.getByText('page:loading')).toBeInTheDocument();
    await screen.findByText('header:premium');
    expect(screen.getByText('page:premium')).toBeInTheDocument();
    expect(mocks.clientCurrentSubscription).toHaveBeenCalledOnce();
  });

  it('exposes an unresolved error and retries without marking the user free', async () => {
    mocks.clientCurrentSubscription
      .mockResolvedValueOnce({
        success: false,
        statusCode: 503,
        message: 'Premium service unavailable',
      })
      .mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: activeSubscription,
      });

    render(
      <PremiumStatusProvider>
        <PremiumConsumer label="page" />
      </PremiumStatusProvider>,
    );

    await screen.findByText('page:error');
    expect(screen.queryByText('page:free')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('page:premium')).toBeInTheDocument();
    });
    expect(mocks.clientCurrentSubscription).toHaveBeenCalledTimes(2);
  });
});
