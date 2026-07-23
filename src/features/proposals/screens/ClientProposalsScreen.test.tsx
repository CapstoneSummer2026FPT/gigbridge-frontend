import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposalStatus } from '../../../types/models/Proposal';
import ClientProposalsScreen from './ClientProposalsScreen';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getMyJobPosts: vi.fn(),
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
    getMyJobPosts: mocks.getMyJobPosts,
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
    milestoneOrderIndex: 0,
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
    mocks.getMyJobPosts.mockResolvedValue({
      success: true,
      data: [{
        jobPostsId: 'job-1',
        title: 'Marketplace request',
        description: 'Build a marketplace',
        status: 1,
        visibility: 0,
      }],
    });
    arrangeProposal();
    mocks.updateProposalStatus.mockResolvedValue({ success: true, data: { success: true, status: ProposalStatus.Shortlisted } });
    mocks.acceptForNegotiation.mockResolvedValue({ success: true, data: 'conversation-1' });
    mocks.startNegotiationFromProposal.mockResolvedValue({ success: true, data: 'conversation-2' });
  });

  it('renders the comparison table and the complete proposal plan', async () => {
    const user = userEvent.setup();
    render(<ClientProposalsScreen />);

    expect(screen.getByRole('heading', { name: 'Proposal Comparison' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Work items' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Milestone total' })).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByText('Ada Freelancer').length).toBeGreaterThan(0));

    // Open detail modal by clicking row
    await user.click((await screen.findAllByText('Ada Freelancer'))[0]);

    // Click on the tab 'freelancer Project Proposal'
    await user.click(await screen.findByRole('button', { name: /freelancer project proposal/i }));

    expect(await screen.findByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('1. Foundation')).toBeInTheDocument();
    expect(screen.getByText('1. Foundation delivery')).toBeInTheDocument();
    expect(screen.getByText(/Build passes/)).toBeInTheDocument();
  });

  it('wires pending proposal action buttons to the proposal APIs', async () => {
    const user = userEvent.setup();
    render(<ClientProposalsScreen />);

    // Open modal first
    await user.click(await screen.findByText('Ada Freelancer'));

    const shortlistBtn = await screen.findByRole('button', { name: /shortlist/i });
    await user.click(shortlistBtn);
    expect(mocks.updateProposalStatus).toHaveBeenCalledWith('proposal-1', { status: ProposalStatus.Shortlisted });

    const negotiateBtn = screen.getByRole('button', { name: /start negotiation/i });
    await user.click(negotiateBtn);
    expect(mocks.acceptForNegotiation).toHaveBeenCalledWith('proposal-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/messages', { state: { activeConvId: 'conversation-1' } });

    const rejectBtn = screen.getByRole('button', { name: /reject/i });
    await user.click(rejectBtn);
    expect(mocks.updateProposalStatus).toHaveBeenCalledWith('proposal-1', { status: ProposalStatus.Rejected });
  });

  it('opens an existing accepted proposal negotiation from the detail panel', async () => {
    const user = userEvent.setup();
    arrangeProposal(ProposalStatus.Accepted);

    render(<ClientProposalsScreen />);

    // Open proposal detail modal first
    await user.click(await screen.findByText('Ada Freelancer'));
    await user.click(await screen.findByRole('button', { name: /open negotiation/i }));

    expect(mocks.startNegotiationFromProposal).toHaveBeenCalledWith('proposal-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/messages', { state: { activeConvId: 'conversation-2' } });
  });

  it('keeps proposal actions read-only when the selected job is closed', async () => {
    const user = userEvent.setup();
    mocks.getMyJobPosts.mockResolvedValueOnce({
      success: true,
      data: [{
        jobPostsId: 'job-1',
        title: 'Marketplace request',
        description: 'Build a marketplace',
        status: 2,
        visibility: 0,
      }],
    });

    render(<ClientProposalsScreen />);

    expect(await screen.findByText(/Proposal review is read-only/i)).toBeInTheDocument();
    
    // Open detail modal by clicking the row
    await user.click((await screen.findAllByText('Ada Freelancer'))[0]);

    // Modal buttons should not be present
    expect(screen.queryByRole('button', { name: /shortlist/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start negotiation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });
});
