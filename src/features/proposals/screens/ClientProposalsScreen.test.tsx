import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposalStatus } from '../../../types/models/Proposal';
import ClientProposalsScreen from './ClientProposalsScreen';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getProposalsByJobPost: vi.fn(),
  getProposalDetail: vi.fn(),
  updateProposalStatus: vi.fn(),
  acceptForNegotiation: vi.fn(),
  startNegotiationFromProposal: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ search: '?job=job-1' }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../shared/components/MarkdownEditor', () => ({
  MarkdownPreview: ({ value }: { value: string }) => <div>{value}</div>,
}));

vi.mock('../../../api/jobAPI', () => ({
  jobAPI: {
    getMyJobPosts: vi.fn().mockResolvedValue({
      success: true,
      data: [{ jobPostsId: 'job-1', title: 'Marketplace request', description: 'Build a marketplace' }],
    }),
  },
}));

vi.mock('../../../api/proposalAPI/GET', () => ({
  proposalGetAPI: {
    getProposalsByJobPost: mocks.getProposalsByJobPost,
    getProposalDetail: mocks.getProposalDetail,
  },
}));

vi.mock('../../../api/proposalAPI/PATCH', () => ({
  proposalPatchAPI: { updateProposalStatus: mocks.updateProposalStatus },
}));

vi.mock('../../../api/proposalAPI/POST', () => ({
  proposalPostAPI: { acceptForNegotiation: mocks.acceptForNegotiation },
}));

vi.mock('../../../api/messageAPI/POST', () => ({
  messagePostAPI: { startNegotiationFromProposal: mocks.startNegotiationFromProposal },
}));

const listProposal = (status = ProposalStatus.Pending) => ({
  proposalsId: 'proposal-1',
  freelancerName: 'Ada Freelancer',
  status,
  proposedBudget: 1200,
  proposedDuration: '3 weeks',
  analysisSummaryPreview: 'A considered project analysis',
  workItemCount: 2,
  milestoneCount: 2,
  milestoneTotal: 1200,
  submittedAt: '2026-07-01T00:00:00Z',
});

const detailProposal = (status = ProposalStatus.Pending) => ({
  proposalId: 'proposal-1',
  jobPostId: 'job-1',
  freelancerProfileId: 'freelancer-1',
  freelancerName: 'Ada Freelancer',
  status,
  coverLetter: 'Experienced marketplace developer.',
  proposedBudget: 1200,
  proposedDuration: '3 weeks',
  analysisSummary: '**Requirement analysis**',
  solutionApproach: 'Incremental delivery',
  workBreakdownItems: [{
    id: 'work-1',
    title: 'Foundation',
    description: 'Set up architecture',
    deliverables: 'Working application shell',
    estimatedDuration: '1 week',
    orderIndex: 0,
  }],
  milestonePlans: [{
    id: 'milestone-1',
    title: 'Foundation delivery',
    description: 'Core setup',
    amount: 1200,
    estimatedDuration: '1 week',
    deliverables: 'Application shell',
    acceptanceCriteria: 'Build passes',
    orderIndex: 0,
  }],
});

const arrangeProposal = (status = ProposalStatus.Pending) => {
  mocks.getProposalsByJobPost.mockResolvedValue({
    success: true,
    data: [listProposal(status)],
  });
  mocks.getProposalDetail.mockResolvedValue({
    success: true,
    data: detailProposal(status),
  });
};

describe('ClientProposalsScreen Phase 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    arrangeProposal();
    mocks.updateProposalStatus.mockResolvedValue({ success: true, data: { success: true, status: ProposalStatus.Shortlisted } });
    mocks.acceptForNegotiation.mockResolvedValue({ success: true, data: 'conversation-1' });
    mocks.startNegotiationFromProposal.mockResolvedValue({ success: true, data: 'conversation-2' });
  });

  it('renders the comparison table and the complete proposal plan', async () => {
    render(<ClientProposalsScreen />);

    expect(screen.getByRole('heading', { name: 'Proposal Comparison' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Analysis summary' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Work items' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Milestone total' })).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByText('Ada Freelancer').length).toBeGreaterThan(0));
    expect(await screen.findByText('Requirement analysis')).toBeInTheDocument();
    expect(screen.getByText('1. Foundation')).toBeInTheDocument();
    expect(screen.getByText('1. Foundation delivery')).toBeInTheDocument();
    expect(screen.getByText(/Build passes/)).toBeInTheDocument();
  });

  it('wires pending proposal action buttons to the proposal APIs', async () => {
    const user = userEvent.setup();
    render(<ClientProposalsScreen />);

    await screen.findByTitle('Shortlist');
    await user.click(screen.getByTitle('Shortlist'));
    expect(mocks.updateProposalStatus).toHaveBeenCalledWith('proposal-1', { status: ProposalStatus.Shortlisted });

    await user.click(screen.getByTitle('Start negotiation'));
    expect(mocks.acceptForNegotiation).toHaveBeenCalledWith('proposal-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/messages', { state: { activeConvId: 'conversation-1' } });

    await user.click(screen.getByTitle('Reject'));
    expect(mocks.updateProposalStatus).toHaveBeenCalledWith('proposal-1', { status: ProposalStatus.Rejected });
  });

  it('opens an existing accepted proposal negotiation from the detail panel', async () => {
    const user = userEvent.setup();
    arrangeProposal(ProposalStatus.Accepted);

    render(<ClientProposalsScreen />);

    await user.click(await screen.findByRole('button', { name: /open negotiation/i }));

    expect(mocks.startNegotiationFromProposal).toHaveBeenCalledWith('proposal-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/messages', { state: { activeConvId: 'conversation-2' } });
  });
});
