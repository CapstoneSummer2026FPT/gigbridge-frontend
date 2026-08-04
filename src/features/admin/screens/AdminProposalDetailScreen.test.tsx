import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminProposalDetailScreen from './AdminProposalDetailScreen';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useParams: () => ({ proposalId: '11111111-1111-1111-1111-111111111111' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../../service/apiService', () => ({
  apiService: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { apiService } from '../../../service/apiService';

const ok = (data: unknown) => ({ success: true, statusCode: 200, message: 'ok', data });

describe('Admin proposal detail', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('renders aggregate sections without crashing when optional collections are missing', async () => {
    vi.mocked(apiService.get).mockResolvedValue(ok({
      proposalId: '11111111-1111-1111-1111-111111111111',
      jobPostTitle: 'Build app',
      lifecycleStatus: 1,
      moderationStatus: 0,
      client: { userId: 'c1', name: 'Client' },
      freelancer: { userId: 'f1', name: 'Freelancer', summary: 'dev' },
    }));
    render(<MemoryRouter><AdminProposalDetailScreen /></MemoryRouter>);

    // Overview: parties render from the partial payload.
    expect(await screen.findByText('Build app')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Freelancer')).toBeInTheDocument();

    // Each tab renders its empty-state instead of crashing on undefined arrays.
    fireEvent.click(screen.getByRole('tab', { name: 'Answers' }));
    expect(await screen.findByText('No proposal questions or answers.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Milestones & Work Items' }));
    expect(await screen.findByText('No proposed milestones.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'AI Interview' }));
    expect(await screen.findByText('No AI interview data.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Negotiation' }));
    expect(await screen.findByText('No negotiation offers.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Contract' }));
    expect(await screen.findByText('No contract has been created.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Reports & Disputes' }));
    expect(await screen.findByText('No related reports.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Internal Notes' }));
    expect(await screen.findByText('No internal notes.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Audit History' }));
    expect(await screen.findByText('No moderation audit events.')).toBeInTheDocument();
  });

  it('renders populated aggregate sections', async () => {
    vi.mocked(apiService.get).mockResolvedValue(ok({
      proposalId: '11111111-1111-1111-1111-111111111111',
      jobPostTitle: 'Build app',
      lifecycleStatus: 2,
      moderationStatus: 0,
      client: { userId: 'c1', name: 'Client' },
      freelancer: { userId: 'f1', name: 'Freelancer' },
      answers: [{ questionId: 'q1', question: 'What stack?', order: 0, required: true, answer: 'React' }],
      milestones: [{ milestoneId: 'm1', title: 'M1', amount: 100, order: 0, workItems: [] }],
      negotiationHistory: [{
        offerId: 'o1', conversationId: 'cv', createdByUserId: 'c1', createdByName: 'Client',
        createdByAvatar: null, budget: 100, startDate: null, endDate: null, scope: 'full',
        status: 0, createdAt: '2026-08-01T00:00:00Z', respondedAt: null, milestones: [],
      }],
      contract: {
        contractId: 'ct1', title: 'Contract A', status: 1, budget: 100, startDate: null, endDate: null,
        createdAt: '2026-08-01T00:00:00Z', milestoneCount: 1, escrowFunded: 50, escrowReleased: null,
        contractReportCount: 0, disputeCount: 0,
      },
      internalNotes: [{ noteId: 'n1', adminId: 'a1', adminName: 'Admin', adminAvatar: null, content: 'reviewed', createdAt: '2026-08-01T00:00:00Z' }],
      auditHistory: [{ auditId: 'au1', adminId: 'a1', adminName: 'Admin', adminAvatar: null, action: 'ProposalInvalidated', oldValues: null, newValues: '{}', correlationId: 'corr', createdAt: '2026-08-01T00:00:00Z' }],
    }));
    render(<MemoryRouter><AdminProposalDetailScreen /></MemoryRouter>);
    expect(await screen.findByText('Build app')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Answers' }));
    expect(await screen.findByText(/What stack\?/)).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Contract' }));
    expect(await screen.findByText('Contract A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Internal Notes' }));
    expect(await screen.findByText('reviewed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Audit History' }));
    expect(await screen.findByText('ProposalInvalidated')).toBeInTheDocument();
  });

  it('calls invalidateProposal with the reason and refreshes on success', async () => {
    vi.mocked(apiService.get).mockResolvedValue(ok({
      proposalId: '11111111-1111-1111-1111-111111111111',
      jobPostTitle: 'Build app', lifecycleStatus: 1, moderationStatus: 0,
      client: { userId: 'c1', name: 'Client' },
      freelancer: { userId: 'f1', name: 'Freelancer' },
    }));
    vi.mocked(apiService.patch).mockResolvedValue(ok({
      proposalId: '11111111-1111-1111-1111-111111111111',
      jobPostTitle: 'Build app', lifecycleStatus: 1, moderationStatus: 1,
      client: { userId: 'c1', name: 'Client' },
      freelancer: { userId: 'f1', name: 'Freelancer' },
    }));
    render(<MemoryRouter><AdminProposalDetailScreen /></MemoryRouter>);
    await screen.findByText('Build app');

    fireEvent.click(screen.getByRole('button', { name: 'Invalidate' }));
    const reason = screen.getByLabelText('Moderation reason');
    fireEvent.change(reason, { target: { value: 'Violates policy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(apiService.patch).toHaveBeenCalledWith(
        '/Proposals/admin/11111111-1111-1111-1111-111111111111/invalidate',
        expect.objectContaining({ reason: 'Violates policy' }),
      );
    });
  });

  it('shows an error state and retries the request', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({ success: false, statusCode: 500, message: 'boom', data: undefined })
      .mockResolvedValue(ok({ proposalId: 'x', jobPostTitle: 'Build app', client: { userId: 'c', name: 'C' }, freelancer: { userId: 'f', name: 'F' } }));
    render(<MemoryRouter><AdminProposalDetailScreen /></MemoryRouter>);

    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Build app')).toBeInTheDocument();
    expect(apiService.get).toHaveBeenCalledTimes(2);
  });
});
