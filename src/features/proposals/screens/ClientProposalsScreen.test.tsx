import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposalStatus } from '../../../types/models/Proposal';
import { sortProposalReviewJobs } from '../components/ClientProposalJobSidebar';
import ClientProposalsScreen from './ClientProposalsScreen';

const mocks = vi.hoisted(() => ({
  locationSearch: '?job=job-1',
  navigate: vi.fn(),
  getMyJobPosts: vi.fn(),
  getProposalsByJobPost: vi.fn(),
  getProposalDetail: vi.fn(),
  getProposalAnswers: vi.fn(),
  evaluateProposalAnswers: vi.fn(),
  updateProposalStatus: vi.fn(),
  acceptForNegotiation: vi.fn(),
  startNegotiationFromProposal: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ search: mocks.locationSearch }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../shared/components/MarkdownEditor', () => ({
  MarkdownPreview: ({ value }: { value: string }) => <div>{value.replaceAll('*', '')}</div>,
}));

const translate = vi.hoisted(() => {
  const translations: Record<string, string> = {
  'proposalReview.back': 'Back to client dashboard',
  'proposalReview.eyebrow': 'Hiring workspace',
  'proposalReview.title': 'Proposal review',
  'proposalReview.subtitle': 'Compare candidates',
  'proposalReview.projectLabel': 'Project request',
  'proposalReview.noProjects': 'No project requests found',
  'proposalReview.proposals': 'proposals',
  'proposalReview.projectSidebar.label': 'Project request navigation',
  'proposalReview.projectSidebar.navigation': 'Project requests',
  'proposalReview.projectSidebar.title': 'Project requests',
  'proposalReview.projectSidebar.current': 'Current project',
  'proposalReview.projectSidebar.count': 'Showing {{visible}} of {{total}}',
  'proposalReview.projectSidebar.search': 'Search project requests',
  'proposalReview.projectSidebar.searchPlaceholder': 'Search projects...',
  'proposalReview.projectSidebar.status': 'Filter projects by status',
  'proposalReview.projectSidebar.sort': 'Sort project requests',
  'proposalReview.projectSidebar.clear': 'Clear',
  'proposalReview.projectSidebar.statuses.all': 'All project statuses',
  'proposalReview.projectSidebar.sorts.proposals': 'Most proposals',
  'proposalReview.projectSidebar.sorts.updated': 'Recently updated',
  'proposalReview.projectSidebar.sorts.created': 'Recently created',
  'proposalReview.projectSidebar.sorts.title': 'Title A-Z',
  'proposalReview.projectSidebar.proposalCount': '{{count}} proposals',
  'proposalReview.projectSidebar.updated': 'Updated {{date}}',
  'proposalReview.projectSidebar.noDate': 'Date unavailable',
  'proposalReview.projectSidebar.emptyTitle': 'No project requests yet',
  'proposalReview.projectSidebar.emptyBody': 'Create a project request to start receiving proposals.',
  'proposalReview.projectSidebar.create': 'Create project request',
  'proposalReview.projectSidebar.noMatchesTitle': 'No matching projects',
  'proposalReview.projectSidebar.noMatchesBody': 'Try another keyword or status.',
  'proposalReview.jobStatuses.draft': 'Draft',
  'proposalReview.jobStatuses.open': 'Open',
  'proposalReview.jobStatuses.closed': 'Closed',
  'proposalReview.jobStatuses.cancelled': 'Cancelled',
  'proposalReview.freelancer': 'Freelancer',
  'proposalReview.candidate': 'Candidate',
  'proposalReview.milestones': 'milestones',
  'proposalReview.workItems': 'work items',
  'proposalReview.notProvided': 'Not provided',
  'proposalReview.readOnly': 'This job is no longer open. Proposal review is read-only.',
  'proposalReview.search': 'Search',
  'proposalReview.searchPlaceholder': 'Search by candidate or proposal content',
  'proposalReview.status': 'Proposal status',
  'proposalReview.sort': 'Sort proposals',
  'proposalReview.filters': 'Filters',
  'proposalReview.advancedFilters': 'Advanced filters',
  'proposalReview.clearAll': 'Clear all',
  'proposalReview.viewDetails': 'View details',
  'proposalReview.closeDetails': 'Close proposal details',
  'proposalReview.drawer.eyebrow': 'Proposal details',
  'proposalReview.drawer.tabsLabel': 'Proposal detail sections',
  'proposalReview.drawer.tabs.overview': 'Overview',
  'proposalReview.drawer.tabs.plan': 'Delivery plan',
  'proposalReview.drawer.tabs.screening': 'Screening',
  'proposalReview.drawer.coverLetter': 'Cover letter',
  'proposalReview.drawer.analysis': 'Project analysis',
  'proposalReview.drawer.approach': 'Solution approach',
  'proposalReview.drawer.deliverables': 'Deliverables',
  'proposalReview.drawer.assumptions': 'Assumptions',
  'proposalReview.drawer.outOfScope': 'Out of scope',
  'proposalReview.drawer.proposedBudget': 'Proposed budget',
  'proposalReview.drawer.milestoneTotal': 'Milestone total',
  'proposalReview.drawer.acceptance': 'Acceptance criteria',
  'proposalReview.screening.loading': 'Loading screening answers...',
  'proposalReview.screening.noQuestionsTitle': 'No screening questions',
  'proposalReview.screening.noQuestionsBody': 'This job did not request clarifying questions.',
  'proposalReview.screening.explanation': 'Written clarifying answers',
  'proposalReview.screening.openFull': 'Open full answers',
  'proposalReview.screening.noAnswer': 'No answer provided.',
  'proposalReview.screening.evaluate': 'Evaluate answers with AI',
  'proposalReview.screening.noCompletedTitle': 'No completed answers available',
  'proposalReview.screening.noCompletedBody': 'AI evaluation needs an answer.',
  'proposalReview.actions.shortlist': 'Shortlist',
  'proposalReview.actions.negotiate': 'Start negotiation',
  'proposalReview.actions.openNegotiation': 'Open negotiation',
  'proposalReview.actions.reject': 'Reject',
  'proposalReview.reject.title': 'Reject this proposal?',
  'proposalReview.reject.description': 'The candidate will no longer be considered.',
  'proposalReview.reject.cancel': 'Keep reviewing',
  'proposalReview.reject.confirm': 'Reject proposal',
  'proposalReview.evaluation.eyebrow': 'AI-assisted screening',
  'proposalReview.evaluation.title': 'Answer evaluation report',
  'proposalReview.evaluation.close': 'Close report',
  'proposalReview.metrics.label': 'Proposal summary',
  'proposalReview.metrics.total': 'Total proposals',
  'proposalReview.metrics.pending': 'Awaiting review',
  'proposalReview.metrics.shortlisted': 'Shortlisted',
  'proposalReview.metrics.averageBid': 'Average bid',
  'proposalReview.statuses.all': 'All statuses',
  'proposalReview.statuses.pending': 'Pending',
  'proposalReview.statuses.shortlisted': 'Shortlisted',
  'proposalReview.statuses.accepted': 'Accepted',
  'proposalReview.statuses.rejected': 'Rejected',
  'proposalReview.statuses.withdrawn': 'Withdrawn',
  'proposalReview.sorts.newest': 'Newest first',
  'proposalReview.sorts.budget': 'Lowest budget',
  'proposalReview.sorts.duration': 'Shortest duration',
  'proposalReview.sorts.status': 'Status',
  'proposalReview.sorts.milestones': 'Milestone total',
  'proposalReview.columns.candidate': 'Candidate',
  'proposalReview.columns.offer': 'Offer',
  'proposalReview.columns.plan': 'Delivery plan',
  'proposalReview.columns.summary': 'Proposal summary',
  'proposalReview.columns.status': 'Status',
  'proposalReview.columns.submitted': 'Submitted',
  'proposalReview.columns.action': 'Details',
  'proposalAnswers.overallScore': 'Overall Score',
  'proposalAnswers.recommendation': 'Recommendation',
  'proposalAnswers.recommended': 'Recommended to Hire',
  'proposalAnswers.notRecommended': 'Not Recommended',
  'proposalAnswers.summary': 'AI Summary',
  'proposalAnswers.technicalSkills': 'Technical Skills',
  'proposalAnswers.softSkills': 'Soft Skills',
  'proposalAnswers.questionBreakdown': 'Question Breakdown',
  };
  return (key: string, values?: Record<string, string | number>) => {
    let result = translations[key] || key;
    Object.entries(values || {}).forEach(([name, value]) => {
      result = result.replace(`{{${name}}}`, String(value));
    });
    return result;
  };
});

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: translate }),
}));

vi.mock('../../../api/jobAPI', () => ({
  jobAPI: { getMyJobPosts: mocks.getMyJobPosts },
}));

vi.mock('../../../api/proposalAPI/GET', () => ({
  proposalGetAPI: {
    getProposalsByJobPost: mocks.getProposalsByJobPost,
    getProposalDetail: mocks.getProposalDetail,
    getProposalAnswers: mocks.getProposalAnswers,
  },
}));

vi.mock('../../../api/proposalAPI/PATCH', () => ({
  proposalPatchAPI: { updateProposalStatus: mocks.updateProposalStatus },
}));

vi.mock('../../../api/proposalAPI/POST', () => ({
  proposalPostAPI: {
    acceptForNegotiation: mocks.acceptForNegotiation,
    evaluateProposalAnswers: mocks.evaluateProposalAnswers,
  },
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
  workBreakdownItems: [],
  milestonePlans: [{
    id: 'milestone-1',
    title: 'Foundation delivery',
    description: 'Core setup',
    amount: 1200,
    estimatedDuration: '1 week',
    deliverables: 'Application shell',
    acceptanceCriteria: 'Build passes',
    orderIndex: 0,
    workItems: [{
      id: 'work-1',
      title: 'Foundation',
      description: 'Set up architecture',
      orderIndex: 0,
    }],
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

const openProposal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click((await screen.findAllByRole('button', { name: /view details/i }))[0]);
  return screen.findByRole('dialog', { name: /ada freelancer/i });
};

describe('ClientProposalsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locationSearch = '?job=job-1';
    mocks.getMyJobPosts.mockResolvedValue({
      success: true,
      data: [{
        jobPostsId: 'job-1',
        title: 'Marketplace request',
        description: 'Build a marketplace',
        status: 1,
        visibility: 0,
        proposalCount: 1,
      }],
    });
    arrangeProposal();
    mocks.getProposalAnswers.mockResolvedValue({ success: true, data: [] });
    mocks.updateProposalStatus.mockResolvedValue({ success: true, data: { success: true } });
    mocks.acceptForNegotiation.mockResolvedValue({ success: true, data: 'conversation-1' });
    mocks.startNegotiationFromProposal.mockResolvedValue({ success: true, data: 'conversation-2' });
    mocks.evaluateProposalAnswers.mockResolvedValue({
      success: true,
      data: {
        score: 84,
        summary: 'Strong written responses.',
        technicalSkills: ['React'],
        softSkills: ['Communication'],
        recommendedHire: true,
        holisticAdjustment: 0,
        holisticAdjustmentReason: '',
        gradedQuestions: [],
      },
    });
  });

  it('renders the comparison workspace and lazy-loads proposal detail', async () => {
    const user = userEvent.setup();
    render(<ClientProposalsScreen />);

    expect(screen.getByRole('heading', { name: 'Proposal review' })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: 'Candidate' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Delivery plan' })).toBeInTheDocument();
    expect(mocks.getProposalDetail).not.toHaveBeenCalled();

    const drawer = await openProposal(user);
    expect(mocks.getProposalDetail).toHaveBeenCalledWith('proposal-1');
    expect(within(drawer).getByText('Requirement analysis')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('tab', { name: 'Delivery plan' }));
    expect(within(drawer).getByText(/Foundation delivery/)).toBeInTheDocument();
    expect(within(drawer).getByText(/Build passes/)).toBeInTheDocument();
  });

  it('renders project requests as a sorted sidebar instead of the legacy selector', async () => {
    mocks.getMyJobPosts.mockResolvedValueOnce({
      success: true,
      data: [
        {
          jobPostsId: 'job-1',
          title: 'Marketplace request',
          status: 1,
          visibility: 0,
          proposalCount: 1,
          updatedAt: '2026-07-01T00:00:00Z',
        },
        {
          jobPostsId: 'job-2',
          title: 'Payment platform',
          status: 2,
          visibility: 0,
          proposalCount: 5,
          updatedAt: '2026-07-02T00:00:00Z',
        },
      ],
    });

    render(<ClientProposalsScreen />);

    const navigation = await screen.findByRole('navigation', { name: 'Project requests' });
    const projectButtons = within(navigation).getAllByRole('button');
    expect(projectButtons[0]).toHaveTextContent('Payment platform');
    expect(projectButtons[1]).toHaveTextContent('Marketplace request');
    expect(within(navigation).getByRole('button', { name: /Marketplace request/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('combobox', { name: 'Project request' })).not.toBeInTheDocument();
  });

  it('filters projects without changing selection and loads proposals once after a new selection', async () => {
    const user = userEvent.setup();
    mocks.getMyJobPosts.mockResolvedValueOnce({
      success: true,
      data: [
        {
          jobPostsId: 'job-1',
          title: 'Marketplace request',
          status: 1,
          visibility: 0,
          proposalCount: 1,
          updatedAt: '2026-07-01T00:00:00Z',
        },
        {
          jobPostsId: 'job-2',
          title: 'Payment platform',
          status: 2,
          visibility: 0,
          proposalCount: 5,
          updatedAt: '2026-07-02T00:00:00Z',
        },
      ],
    });

    render(<ClientProposalsScreen />);
    await waitFor(() => expect(mocks.getProposalsByJobPost).toHaveBeenCalledWith('job-1', { pageIndex: 1, pageSize: 100 }));
    expect(mocks.getProposalsByJobPost).toHaveBeenCalledTimes(1);

    await user.type(screen.getByRole('textbox', { name: 'Search project requests' }), 'PAYMENT');
    let navigation = screen.getByRole('navigation', { name: 'Project requests' });
    expect(within(navigation).queryByText('Marketplace request')).not.toBeInTheDocument();
    expect(within(navigation).getByText('Payment platform')).toBeInTheDocument();
    expect(mocks.getProposalsByJobPost).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter projects by status' }), '2');
    navigation = screen.getByRole('navigation', { name: 'Project requests' });
    expect(within(navigation).queryByText('Marketplace request')).not.toBeInTheDocument();
    expect(within(navigation).getByText('Payment platform')).toBeInTheDocument();
    expect(mocks.getProposalsByJobPost).toHaveBeenCalledTimes(1);

    await user.click(within(navigation).getByRole('button', { name: /Payment platform/ }));
    await waitFor(() => expect(mocks.getProposalsByJobPost).toHaveBeenCalledWith('job-2', { pageIndex: 1, pageSize: 100 }));
    expect(mocks.getProposalsByJobPost).toHaveBeenCalledTimes(2);
    expect(mocks.navigate).toHaveBeenCalledWith('/proposals?job=job-2', { replace: true });
  });

  it('applies deterministic ordering for every project sort mode', () => {
    const jobs = [
      {
        jobPostsId: 'alpha',
        clientProfilesId: 'client-1',
        title: 'Alpha',
        description: '',
        skills: [],
        customSkillNames: [],
        status: 1,
        proposalCount: 1,
        updatedAt: '2026-07-03T00:00:00Z',
        createdAt: '2026-06-01T00:00:00Z',
      },
      {
        jobPostsId: 'beta',
        clientProfilesId: 'client-1',
        title: 'Beta',
        description: '',
        skills: [],
        customSkillNames: [],
        status: 1,
        proposalCount: 2,
        updatedAt: '2026-07-02T00:00:00Z',
        createdAt: '2026-06-03T00:00:00Z',
      },
      {
        jobPostsId: 'gamma',
        clientProfilesId: 'client-1',
        title: 'Gamma',
        description: '',
        skills: [],
        customSkillNames: [],
        status: 1,
        proposalCount: 5,
        updatedAt: '2026-07-01T00:00:00Z',
        createdAt: '2026-06-02T00:00:00Z',
      },
    ];
    const ids = (sort: Parameters<typeof sortProposalReviewJobs>[1]) =>
      sortProposalReviewJobs(jobs, sort).map(job => job.jobPostsId);

    expect(ids('proposals')).toEqual(['gamma', 'beta', 'alpha']);
    expect(ids('updated')).toEqual(['alpha', 'beta', 'gamma']);
    expect(ids('created')).toEqual(['beta', 'gamma', 'alpha']);
    expect(ids('title')).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('uses the highest proposal count when the query job is invalid', async () => {
    mocks.locationSearch = '?job=missing-job';
    mocks.getMyJobPosts.mockResolvedValueOnce({
      success: true,
      data: [
        {
          jobPostsId: 'job-1',
          title: 'Marketplace request',
          status: 1,
          visibility: 0,
          proposalCount: 1,
          updatedAt: '2026-07-03T00:00:00Z',
        },
        {
          jobPostsId: 'job-2',
          title: 'Payment platform',
          status: 1,
          visibility: 0,
          proposalCount: 5,
          updatedAt: '2026-07-01T00:00:00Z',
        },
      ],
    });

    render(<ClientProposalsScreen />);

    await waitFor(() => expect(mocks.getProposalsByJobPost).toHaveBeenCalledWith('job-2', { pageIndex: 1, pageSize: 100 }));
    expect(mocks.getProposalsByJobPost).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith('/proposals?job=job-2', { replace: true });
  });

  it('shows no AI action when the job has no screening questions', async () => {
    const user = userEvent.setup();
    render(<ClientProposalsScreen />);
    const drawer = await openProposal(user);

    await user.click(within(drawer).getByRole('tab', { name: 'Screening' }));

    expect(await within(drawer).findByText('No screening questions')).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Evaluate answers with AI' })).not.toBeInTheDocument();
    expect(mocks.evaluateProposalAnswers).not.toHaveBeenCalled();
  });

  it('does not offer AI evaluation for blank answers', async () => {
    const user = userEvent.setup();
    mocks.getProposalAnswers.mockResolvedValue({
      success: true,
      data: [{
        proposalsId: 'proposal-1',
        jobPostQuestionsId: 'question-1',
        questionText: 'Describe your approach',
        orderIndex: 0,
        isRequired: true,
        answerText: '   ',
      }],
    });
    render(<ClientProposalsScreen />);
    const drawer = await openProposal(user);

    await user.click(within(drawer).getByRole('tab', { name: 'Screening' }));

    expect(await within(drawer).findByText('No completed answers available')).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Evaluate answers with AI' })).not.toBeInTheDocument();
  });

  it('evaluates substantive clarifying answers without presenting them as an AI interview', async () => {
    const user = userEvent.setup();
    mocks.getProposalAnswers.mockResolvedValue({
      success: true,
      data: [{
        proposalsId: 'proposal-1',
        jobPostQuestionsId: 'question-1',
        questionText: 'Describe your approach',
        orderIndex: 0,
        isRequired: true,
        answerText: 'I would ship in small, reviewed increments.',
      }],
    });
    render(<ClientProposalsScreen />);
    const drawer = await openProposal(user);
    await user.click(within(drawer).getByRole('tab', { name: 'Screening' }));

    const evaluate = await within(drawer).findByRole('button', { name: 'Evaluate answers with AI' });
    expect(screen.queryByText(/AI Interview/i)).not.toBeInTheDocument();
    await user.click(evaluate);

    expect(mocks.evaluateProposalAnswers).toHaveBeenCalledWith('proposal-1');
    expect(await screen.findByRole('dialog', { name: 'Answer evaluation report' })).toBeInTheDocument();
    expect(screen.getByText('Strong written responses.')).toBeInTheDocument();
  });

  it('keeps proposal actions in the drawer and confirms rejection', async () => {
    const user = userEvent.setup();
    render(<ClientProposalsScreen />);
    expect(screen.queryByRole('button', { name: 'Shortlist' })).not.toBeInTheDocument();
    const drawer = await openProposal(user);

    await user.click(within(drawer).getByRole('button', { name: 'Shortlist' }));
    expect(mocks.updateProposalStatus).toHaveBeenCalledWith('proposal-1', { status: ProposalStatus.Shortlisted });

    await user.click(within(drawer).getByRole('button', { name: 'Start negotiation' }));
    expect(mocks.acceptForNegotiation).toHaveBeenCalledWith('proposal-1');

    await user.click(within(drawer).getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('alertdialog', { name: 'Reject this proposal?' })).toBeInTheDocument();
    expect(mocks.updateProposalStatus).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Reject proposal' }));
    await waitFor(() => expect(mocks.updateProposalStatus).toHaveBeenCalledWith('proposal-1', { status: ProposalStatus.Rejected }));
  });

  it('opens an existing accepted proposal negotiation', async () => {
    const user = userEvent.setup();
    arrangeProposal(ProposalStatus.Accepted);
    render(<ClientProposalsScreen />);
    const drawer = await openProposal(user);

    await user.click(within(drawer).getByRole('button', { name: 'Open negotiation' }));

    expect(mocks.startNegotiationFromProposal).toHaveBeenCalledWith('proposal-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/messages', { state: { activeConvId: 'conversation-2' } });
  });

  it('keeps proposal review read-only when the selected job is closed', async () => {
    const user = userEvent.setup();
    mocks.getMyJobPosts.mockResolvedValueOnce({
      success: true,
      data: [{
        jobPostsId: 'job-1',
        title: 'Marketplace request',
        status: 2,
        visibility: 0,
        proposalCount: 1,
      }],
    });
    render(<ClientProposalsScreen />);

    expect(await screen.findAllByText(/Proposal review is read-only/i)).not.toHaveLength(0);
    const drawer = await openProposal(user);
    expect(within(drawer).queryByRole('button', { name: 'Shortlist' })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Start negotiation' })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});
