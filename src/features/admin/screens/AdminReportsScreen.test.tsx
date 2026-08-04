import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminReportsScreen from './AdminReportsScreen';

const api = vi.hoisted(() => ({
  getAdminReports: vi.fn(),
  getAdminSummary: vi.fn(),
  updateStatus: vi.fn(),
  resolve: vi.fn(),
}));
vi.mock('../../../api/reportAPI', () => ({ reportAPI: api }));
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const ok = (data: unknown) => ({ success: true, statusCode: 200, message: 'ok', data });

const summary = { total: 5, pending: 2, reviewing: 1, resolved: 1, dismissed: 1, open: 3 };

const report = {
  id: 'report-1',
  reporter: { id: 'reporter-1', fullName: 'Reporter One', email: 'r@test.dev', role: 1 },
  reportedEntityId: 'job-1',
  reportedEntityType: 'JobPost',
  type: 1,
  status: 0,
  reason: 'Fraudulent job listing',
  createdAt: '2026-08-01T00:00:00Z',
};

const userReport = {
  ...report,
  id: 'user-report-1',
  reportedEntityId: 'user-1',
  reportedEntityType: 'User',
  reason: 'Harassing messages after a failed deal',
  targetSummary: { title: 'User One', email: 'u@test.dev', role: 0 },
};

describe('AdminReportsScreen (report flow entry)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getAdminSummary.mockResolvedValue(ok(summary));
    api.getAdminReports.mockResolvedValue(ok({
      items: [report],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    }));
  });

  it('renders server-backed report rows and summary stats', async () => {
    render(<MemoryRouter><AdminReportsScreen /></MemoryRouter>);

    expect(await screen.findAllByText('Fraudulent job listing')).toHaveLength(2); // desktop table + mobile card
    expect(screen.getAllByText('Reporter One').length).toBeGreaterThan(0);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(api.getAdminSummary).toHaveBeenCalledTimes(1);
    expect(api.getAdminReports).toHaveBeenCalledTimes(1);
  });

  it('routes into the Contract Reports queue from the entry card', async () => {
    render(<MemoryRouter><AdminReportsScreen /></MemoryRouter>);

    await screen.findAllByText('Fraudulent job listing');
    const contract = screen.getByRole('link', { name: /Contract Reports/i });
    expect(contract).toHaveAttribute('href', '/admin/reports/contracts');
    expect(screen.queryByRole('link', { name: /Account Reports/i })).not.toBeInTheDocument();
  });

  it('links User reports to the account-enforcement detail screen', async () => {
    api.getAdminReports.mockResolvedValue(ok({
      items: [userReport],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    }));
    render(<MemoryRouter><AdminReportsScreen /></MemoryRouter>);

    expect(await screen.findAllByText('Harassing messages after a failed deal')).toHaveLength(2);
    const detailLinks = screen.getAllByRole('link', { name: /Account enforcement/i });
    expect(detailLinks.length).toBeGreaterThan(0);
    for (const link of detailLinks) {
      expect(link).toHaveAttribute('href', '/admin/reports/accounts/user-report-1');
    }
  });

  it('shows the error banner and empty state when the report list fails', async () => {
    api.getAdminReports.mockResolvedValue({ success: false, statusCode: 500, message: 'boom', data: undefined });
    render(<MemoryRouter><AdminReportsScreen /></MemoryRouter>);

    expect(await screen.findByText(/boom/)).toBeInTheDocument();
    expect(screen.getByText('No reports found')).toBeInTheDocument();
    await waitFor(() => expect(api.getAdminReports).toHaveBeenCalledTimes(1));
  });
});
