import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getEloSummary: vi.fn(),
  getEloHistory: vi.fn(),
  getMyEloAppeals: vi.fn(),
  createEloAppeal: vi.fn(),
  cancelEloAppeal: vi.fn(),
}));
const translate = vi.hoisted(() => (key: string) => key);
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useTranslation', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) }));
vi.mock('../../../api/eloAPI/GET', () => ({
  eloGetAPI: { getEloSummary: api.getEloSummary, getEloHistory: api.getEloHistory, getMyEloAppeals: api.getMyEloAppeals },
}));
vi.mock('../../../api/eloAPI/POST', () => ({
  eloPostAPI: { createEloAppeal: api.createEloAppeal, cancelEloAppeal: api.cancelEloAppeal },
}));

import EloHistoryScreen from './EloHistoryScreen';

const transaction = {
  transactionId: 'tx-1',
  userId: 'user-1',
  pointsDelta: -10,
  pointsBefore: 130,
  pointsAfter: 120,
  reason: 8,
  sourceType: 1,
  mode: 0,
  createdAt: '2026-08-01T10:00:00Z',
};

const summary = {
  currentPoints: 120,
  totalGained: 40,
  totalLost: 20,
  totalTransactions: 3,
  recentTransactions: [],
};

const appeal = {
  appealId: 'appeal-1',
  userId: 'user-1',
  transactionId: 'tx-1',
  status: 0,
  resolution: null,
  reason: 'The penalty was applied twice.',
  createdAt: '2026-08-01T11:00:00Z',
  updatedAt: '2026-08-01T11:00:00Z',
};

const paginated = (items: unknown[], totalPages = 1) => ({
  success: true,
  data: {
    items,
    pageNumber: 1,
    totalPages,
    totalCount: totalPages * 15,
    pageSize: 15,
    hasPreviousPage: false,
    hasNextPage: totalPages > 1,
  },
});

describe('EloHistoryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getEloSummary.mockResolvedValue({ success: true, data: summary });
    api.getEloHistory.mockResolvedValue(paginated([transaction]));
    api.getMyEloAppeals.mockResolvedValue(paginated([appeal]));
    api.createEloAppeal.mockResolvedValue({ success: true, data: appeal });
    api.cancelEloAppeal.mockResolvedValue({ success: true, data: appeal });
  });

  it('renders the summary and history rows with accessible delta labels', async () => {
    render(<MemoryRouter><EloHistoryScreen /></MemoryRouter>);

    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByText('+40')).toBeInTheDocument();
    expect(screen.getByText('−20')).toBeInTheDocument();

    // History row: reason label, delta signed with an accessible label.
    expect(screen.getByText('elo.reasons.8')).toBeInTheDocument();
    const delta = screen.getByText('−10');
    expect(delta).toHaveAttribute('aria-label', 'elo.deltaLabel');
    expect(screen.getByText('elo.sourceTypes.1')).toBeInTheDocument();
  });

  it('sends the selected filter to the history API', async () => {
    render(<MemoryRouter><EloHistoryScreen /></MemoryRouter>);
    await screen.findByText('−10');

    fireEvent.click(screen.getByRole('button', { name: 'elo.filters.reviews' }));
    await waitFor(() =>
      expect(api.getEloHistory).toHaveBeenLastCalledWith({ page: 1, pageSize: 15, filter: 'Reviews' }),
    );
  });

  it('paginates the history list', async () => {
    api.getEloHistory.mockResolvedValue(paginated([transaction], 2));
    render(<MemoryRouter><EloHistoryScreen /></MemoryRouter>);
    await screen.findByText('−10');

    fireEvent.click(screen.getByRole('button', { name: 'elo.next' }));
    await waitFor(() =>
      expect(api.getEloHistory).toHaveBeenLastCalledWith({ page: 2, pageSize: 15, filter: 'All' }),
    );
  });

  it('opens the appeal modal and files an appeal with a reason', async () => {
    render(<MemoryRouter><EloHistoryScreen /></MemoryRouter>);
    await screen.findByText('−10');

    fireEvent.click(screen.getByRole('button', { name: 'elo.appeal.action' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'elo.appeal.submit' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('elo.appeal.reasonPlaceholder'), {
      target: { value: 'Penalty was double-applied to my score.' },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() =>
      expect(api.createEloAppeal).toHaveBeenCalledWith({
        transactionId: 'tx-1',
        reason: 'Penalty was double-applied to my score.',
        files: [],
      }),
    );
  });

  it('lists appeals and cancels a pending one', async () => {
    render(<MemoryRouter><EloHistoryScreen /></MemoryRouter>);
    await screen.findByText('−10');

    fireEvent.click(screen.getByRole('button', { name: 'elo.appealsTab' }));
    expect(await screen.findByText('The penalty was applied twice.')).toBeInTheDocument();
    expect(screen.getByText('elo.appealStatus.0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'elo.appeal.cancelAction' }));
    fireEvent.click(screen.getByRole('button', { name: 'elo.appeal.confirmCancel' }));

    await waitFor(() => expect(api.cancelEloAppeal).toHaveBeenCalledWith('appeal-1'));
  });
});
