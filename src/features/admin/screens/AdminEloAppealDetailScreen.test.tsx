import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getAdminEloAppealDetail: vi.fn(), resolveEloAppeal: vi.fn() }));
const translate = vi.hoisted(() => (key: string) => key);
vi.mock('react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useParams: () => ({ appealId: 'appeal-1' }),
}));
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useTranslation', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) }));
vi.mock('../../../api/adminAPI/GET', () => ({ adminGetAPI: { getAdminEloAppealDetail: api.getAdminEloAppealDetail } }));
vi.mock('../../../api/adminAPI/POST', () => ({ adminPostAPI: { resolveEloAppeal: api.resolveEloAppeal } }));

import AdminEloAppealDetailScreen from './AdminEloAppealDetailScreen';

const detail = {
  appeal: {
    appealId: 'appeal-1',
    user: { userId: 'user-1', fullName: 'Client Nguyen', email: 'client@example.com', role: 0 },
    transactionId: 'tx-1',
    status: 0,
    resolution: null,
    reason: 'The dispute penalty was applied twice.',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  transaction: {
    transactionId: 'tx-1',
    userId: 'user-1',
    pointsDelta: -25,
    pointsBefore: 150,
    pointsAfter: 125,
    reason: 8,
    sourceType: 1,
    mode: 0,
    createdAt: '2026-08-01T09:00:00Z',
  },
  evidence: [
    {
      evidenceId: 'ev-1',
      appealId: 'appeal-1',
      uploadedById: 'user-1',
      fileName: 'payment-proof.png',
      fileUrl: 'https://cdn.example.test/proof.png',
      fileSize: 2048,
      createdAt: '2026-08-01T10:05:00Z',
    },
  ],
  userSummary: {
    user: { userId: 'user-1', fullName: 'Client Nguyen', email: 'client@example.com', role: 0 },
    currentPoints: 125,
    totalGained: 60,
    totalLost: 25,
    totalTransactions: 3,
    recentTransactions: [],
  },
};

describe('AdminEloAppealDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAdminEloAppealDetail.mockResolvedValue({ success: true, data: detail });
    api.resolveEloAppeal.mockResolvedValue({ success: true, data: detail.appeal });
  });

  it('shows the appeal reason, evidence and current score', async () => {
    render(<MemoryRouter><AdminEloAppealDetailScreen /></MemoryRouter>);

    expect(await screen.findByText('The dispute penalty was applied twice.')).toBeInTheDocument();
    expect(screen.getByText('payment-proof.png')).toBeInTheDocument();
    expect(screen.getByText('elo.appealStatus.0')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
    expect(screen.getByText('elo.reasons.8')).toBeInTheDocument();
  });

  it('submits a full reversal resolution', async () => {
    render(<MemoryRouter><AdminEloAppealDetailScreen /></MemoryRouter>);
    await screen.findByText('The dispute penalty was applied twice.');

    fireEvent.click(screen.getByRole('button', { name: 'adminElo.resolutionFullReversal' }));
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.resolveConfirm' }));

    await waitFor(() =>
      expect(api.resolveEloAppeal).toHaveBeenCalledWith('appeal-1', {
        status: 2,
        resolution: 1,
        correctedDelta: null,
        resolutionNote: null,
      }),
    );
  });

  it('submits a partial correction with a non-zero delta', async () => {
    render(<MemoryRouter><AdminEloAppealDetailScreen /></MemoryRouter>);
    await screen.findByText('The dispute penalty was applied twice.');

    fireEvent.click(screen.getByRole('button', { name: 'adminElo.resolutionPartialCorrection' }));
    fireEvent.change(screen.getByLabelText('adminElo.correctedDelta'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.resolveConfirm' }));

    await waitFor(() =>
      expect(api.resolveEloAppeal).toHaveBeenCalledWith('appeal-1', {
        status: 3,
        resolution: 2,
        correctedDelta: 15,
        resolutionNote: null,
      }),
    );
  });

  it('blocks a partial correction without a delta', async () => {
    render(<MemoryRouter><AdminEloAppealDetailScreen /></MemoryRouter>);
    await screen.findByText('The dispute penalty was applied twice.');

    fireEvent.click(screen.getByRole('button', { name: 'adminElo.resolutionPartialCorrection' }));
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.resolveConfirm' }));

    expect(await screen.findByText('adminElo.adjustInvalidAmount')).toBeInTheDocument();
    expect(api.resolveEloAppeal).not.toHaveBeenCalled();
  });
});
