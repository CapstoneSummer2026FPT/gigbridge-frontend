import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposalStatus } from '../../../types/models/Proposal';
import ClientProposalsScreen from './ClientProposalsScreen';

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
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
    getProposalsByJobPost: vi.fn().mockResolvedValue({
      success: true,
      data: [{
        proposalsId: 'proposal-1',
        freelancerName: 'Ada Freelancer',
        status: ProposalStatus.Pending,
        proposedBudget: 1200,
        proposedDuration: '3 weeks',
        analysisSummaryPreview: 'A considered project analysis',
        workItemCount: 2,
        milestoneCount: 2,
        milestoneTotal: 1200,
        submittedAt: '2026-07-01T00:00:00Z',
      }],
    }),
    getProposalDetail: vi.fn().mockResolvedValue({
      success: true,
      data: {
        proposalId: 'proposal-1',
        jobPostId: 'job-1',
        freelancerProfileId: 'freelancer-1',
        freelancerName: 'Ada Freelancer',
        status: ProposalStatus.Pending,
        coverLetter: 'Experienced marketplace developer.',
        proposedBudget: 1200,
        proposedDuration: '3 weeks',
        analysisSummary: '**Requirement analysis**',
        solutionApproach: 'Incremental delivery',
        workBreakdownItems: [{
          id: 'work-1', title: 'Foundation', description: 'Set up architecture',
          deliverables: 'Working application shell', estimatedDuration: '1 week', orderIndex: 0,
        }],
        milestonePlans: [{
          id: 'milestone-1', title: 'Foundation delivery', description: 'Core setup', amount: 1200,
          estimatedDuration: '1 week', deliverables: 'Application shell',
          acceptanceCriteria: 'Build passes', orderIndex: 0,
        }],
      },
    }),
  },
}));

vi.mock('../../../api/proposalAPI/PATCH', () => ({ proposalPatchAPI: { updateProposalStatus: vi.fn() } }));
vi.mock('../../../api/proposalAPI/POST', () => ({ proposalPostAPI: { acceptForNegotiation: vi.fn() } }));
vi.mock('../../../api/messageAPI/POST', () => ({ messagePostAPI: { startNegotiationFromProposal: vi.fn() } }));

describe('ClientProposalsScreen Phase 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
