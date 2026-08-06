import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getAdminEloAppeals: vi.fn() }));
const translate = vi.hoisted(() => (key: string) => key);
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useTranslation', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) }));
vi.mock('../../../api/adminAPI/GET', () => ({ adminGetAPI: { getAdminEloAppeals: api.getAdminEloAppeals } }));

import AdminEloAppealsScreen from './AdminEloAppealsScreen';

const appeal = {
  appealId: 'appeal-1',
  user: { userId: 'user-1', fullName: 'Client Nguyen', email: 'client@example.com', role: 0 },
  transactionId: 'tx-1',
  status: 0,
  resolution: null,
  reason: 'The dispute penalty was applied twice.',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
};

const paginated = (items: unknown[]) => ({
  success: true,
  data: {
    items,
    pageNumber: 1,
    totalPages: 1,
    totalCount: items.length,
    pageSize: 15,
    hasPreviousPage: false,
    hasNextPage: false,
  },
});

describe('AdminEloAppealsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAdminEloAppeals.mockResolvedValue(paginated([appeal]));
  });

  it('lists appeals with status and reason', async () => {
    render(<MemoryRouter><AdminEloAppealsScreen /></MemoryRouter>);

    expect(await screen.findByText('Client Nguyen')).toBeInTheDocument();
    expect(screen.getByText('The dispute penalty was applied twice.')).toBeInTheDocument();
    // Status renders both as the row badge and as a select filter option.
    expect(screen.getAllByText('elo.appealStatus.0').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'adminElo.view' })).toBeInTheDocument();
  });

  it('sends the selected status filter to the API', async () => {
    render(<MemoryRouter><AdminEloAppealsScreen /></MemoryRouter>);
    await screen.findByText('Client Nguyen');

    fireEvent.change(screen.getByDisplayValue('adminElo.filterAllStatuses'), { target: { value: '1' } });
    await waitFor(() =>
      expect(api.getAdminEloAppeals).toHaveBeenLastCalledWith({ page: 1, pageSize: 15, status: 1 }),
    );
  });

  it('sends the search query to the API', async () => {
    render(<MemoryRouter><AdminEloAppealsScreen /></MemoryRouter>);
    await screen.findByText('Client Nguyen');

    fireEvent.change(screen.getByPlaceholderText('adminElo.search'), { target: { value: 'Nguyen' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.searchAction' }));
    await waitFor(() =>
      expect(api.getAdminEloAppeals).toHaveBeenLastCalledWith({ page: 1, pageSize: 15, search: 'Nguyen' }),
    );
  });
});
