import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposalStatus, type ProposalDetailDto } from '../../../types/models/Proposal';
import CreateProposalScreen from '../screens/CreateProposalScreen';

const navigateMock = vi.fn();
const {
  createProposalMock,
  getJobPostDetailMock,
  getJobPostQuestionsMock,
  getMyProposalByJobPostMock,
  updateProposalStatusMock,
  updateProposalMock,
} = vi.hoisted(() => ({
  createProposalMock: vi.fn(),
  getJobPostDetailMock: vi.fn(),
  getJobPostQuestionsMock: vi.fn(),
  getMyProposalByJobPostMock: vi.fn(),
  updateProposalStatusMock: vi.fn(),
  updateProposalMock: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ jobPostId: 'job-1' }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { translateMock } = vi.hoisted(() => ({
  translateMock: (key: string) => {
    const translations: Record<string, string> = {
      'createProposal.submitProposalTitle': 'Project Proposal',
      'createProposal.editProposalTitle': 'Project Proposal',
      'createProposal.coverLetterLabel': 'Introduction',
      'createProposal.solutionStrategyLabel': 'Your Proposal Approach',
      'proposalMilestoneEditor.title': 'Milestones and payment plan',
      'proposalMilestoneEditor.advancedDetails': 'Advanced details',
      'proposalMilestoneEditor.acceptanceCriteria': 'Acceptance criteria',
      'proposalMilestoneEditor.workBreakdown': 'Work Breakdown Structure',
      'proposalMilestoneEditor.addWorkItem': 'Add work item',
      'createProposal.saveDraft': 'Save Draft',
      'createProposal.submitProposal': 'Submit Proposal',
      'createProposal.back': 'Back',
      'createProposal.viewFullJob': 'View full job',
      'createProposal.editProposal': 'Edit Proposal',
      'createProposal.newProposal': 'New Proposal',
      'createProposal.status': 'Status',
      'createProposal.submitting': 'Submitting...',
      'createProposal.errCoverLetterMinLength': 'Introduction must be at least 50 characters.',
      'createProposal.errApproachMinLength': 'Your Proposal Approach must be at least 50 characters.',
      'proposalMilestoneEditor.defaultAcceptanceCriteria': 'The client accepts this milestone when its deliverable is complete and meets the project requirements.',
    };
    return translations[key] ?? key;
  }
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: translateMock,
  }),
}));

vi.mock('../../../shared/components/MarkdownEditor', () => ({
  MarkdownEditor: ({
    label,
    placeholder,
    value,
    error,
    onChange,
  }: {
    label: string;
    placeholder?: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
  }) => {
    let derivedLabel = label;
    if (!label && placeholder) {
      if (placeholder.includes('coverLetter')) {
        derivedLabel = 'Introduction';
      } else if (placeholder.includes('solution') || placeholder.includes('strategy')) {
        derivedLabel = 'Your Proposal Approach';
      }
    }
    return (
      <div>
        {derivedLabel} Markdown editor
        <textarea
          aria-label={derivedLabel}
          value={value}
          onChange={event => onChange(event.target.value)}
        />
        {error && <p>{error}</p>}
      </div>
    );
  },
}));

vi.mock('../../../api/jobAPI/GET', () => ({
  jobGetAPI: {
    getJobPostDetail: getJobPostDetailMock,
    getJobPostQuestions: getJobPostQuestionsMock,
  },
}));

vi.mock('../../../api/proposalAPI/GET', () => ({
  proposalGetAPI: {
    getMyProposalByJobPost: getMyProposalByJobPostMock,
    getProposalDetail: vi.fn(),
  },
}));

vi.mock('../../../api/proposalAPI/POST', () => ({ proposalPostAPI: { createProposal: createProposalMock } }));
vi.mock('../../../api/proposalAPI/PUT', () => ({ proposalPutAPI: { updateProposal: updateProposalMock } }));
vi.mock('../../../api/proposalAPI/PATCH', () => ({ proposalPatchAPI: { updateProposalStatus: updateProposalStatusMock } }));

const fillCoreMilestone = ({
  title = 'Discovery',
  amount = '200',
  deadline = '2099-01-22',
  deliverables = 'Approved discovery report',
} = {}) => {
  fireEvent.change(screen.getByLabelText('Milestone title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/^Deadline/), { target: { value: deadline } });
  fireEvent.change(screen.getByLabelText('Deliverables'), { target: { value: deliverables } });
};

const existingProposal = (
  workBreakdownItems: NonNullable<ProposalDetailDto['workBreakdownItems']>,
): ProposalDetailDto => ({
  proposalId: 'proposal-1',
  jobPostId: 'job-1',
  freelancerProfileId: 'freelancer-1',
  status: ProposalStatus.Draft,
  coverLetter: 'A'.repeat(80),
  analysisSummary: 'B'.repeat(80),
  solutionApproach: 'B'.repeat(80),
  workBreakdownItems,
  milestonePlans: [{
    id: 'milestone-1',
    title: 'Discovery',
    description: 'Preserved legacy milestone description',
    amount: 200,
    estimatedDuration: '2 weeks',
    dueDate: '2099-01-22',
    deliverables: 'Approved discovery report',
    acceptanceCriteria: 'Client approves the report',
    orderIndex: 0,
  }],
});

describe('CreateProposalScreen milestone experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createProposalMock.mockResolvedValue({ success: true, data: 'proposal-1' });
    updateProposalMock.mockResolvedValue({ success: true, data: null });
    updateProposalStatusMock.mockResolvedValue({ success: true, data: null });
    getJobPostQuestionsMock.mockResolvedValue({ success: true, data: [] });
    getJobPostDetailMock.mockResolvedValue({
      success: true,
      data: {
        jobPostsId: 'job-1',
        title: 'Build a marketplace',
        endDate: '2099-01-08T00:00:00Z',
      },
    });
    getMyProposalByJobPostMock.mockResolvedValue({ success: false, data: null });
  });

  it('shows only the four core milestone inputs by default', async () => {
    render(<CreateProposalScreen />);

    await screen.findByRole('heading', { name: 'Project Proposal' });

    expect(screen.getByText('Your Proposal Approach Markdown editor')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Milestones and payment plan' })).toBeInTheDocument();
    expect(screen.getByLabelText('Milestone title')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Deadline/)).toBeInTheDocument();
    expect(screen.getByLabelText('Deliverables')).toBeInTheDocument();
    expect(screen.queryByLabelText('Duration')).not.toBeInTheDocument();
    expect(screen.queryByText('Acceptance criteria')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Work Breakdown Structure' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced details' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('derives duration, acceptance criteria, and a compatible work item in both payload shapes', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });
    fillCoreMilestone({ amount: '12.5' });

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(createProposalMock).toHaveBeenCalled());
    const payload = createProposalMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      proposedBudget: 12.5,
      proposedDuration: '2 weeks',
      workBreakdownItems: [{
        title: 'Discovery',
        description: 'Approved discovery report',
        deliverables: 'Approved discovery report',
        estimatedDuration: '2 weeks',
        milestoneOrderIndex: 0,
        orderIndex: 0,
      }],
      milestonePlans: [{
        amount: 12.5,
        estimatedDuration: '2 weeks',
        acceptanceCriteria: 'The client accepts this milestone when its deliverable is complete and meets the project requirements.',
        workItems: [expect.objectContaining({
          title: 'Discovery',
          description: 'Approved discovery report',
          milestoneOrderIndex: 0,
          orderIndex: 0,
        })],
      }],
    });
    expect(screen.getByLabelText('Overall proposal duration')).toHaveTextContent('2 weeks');
  });

  it('derives each duration from the previous deadline and keeps the overall summary synchronized', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });
    fillCoreMilestone({ amount: '100' });

    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    fillCoreMilestone({
      title: 'Final delivery',
      amount: '300',
      deadline: '2099-02-12',
      deliverables: 'Production release',
    });

    expect(screen.getByLabelText('Calculated proposal budget')).toHaveTextContent('400 G-coin');
    expect(screen.getByLabelText('Overall proposal duration')).toHaveTextContent('5 weeks');

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(createProposalMock).toHaveBeenCalled());
    expect(createProposalMock.mock.calls[0][0]).toMatchObject({
      proposedBudget: 400,
      proposedDuration: '5 weeks',
      milestonePlans: [
        expect.objectContaining({ estimatedDuration: '2 weeks' }),
        expect.objectContaining({ estimatedDuration: '3 weeks' }),
      ],
    });
  });

  it('allows custom WBS in advanced details and returns to generated mode after deletion', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });
    fillCoreMilestone();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced details' }));
    expect(screen.getByText('Acceptance criteria')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add work item/i }));
    fireEvent.change(screen.getByLabelText('Work item 1 title'), { target: { value: 'Interview users' } });
    fireEvent.change(screen.getByLabelText('Work item 1 description'), { target: { value: 'Run five interviews' } });
    fireEvent.click(screen.getByTitle('Delete work item'));

    expect(screen.queryByLabelText('Work item 1 title')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(createProposalMock).toHaveBeenCalled());
    expect(createProposalMock.mock.calls[0][0].workBreakdownItems).toEqual([
      expect.objectContaining({
        title: 'Discovery',
        description: 'Approved discovery report',
      }),
    ]);
  });

  it('auto-opens and preserves a legacy custom WBS', async () => {
    getMyProposalByJobPostMock.mockResolvedValue({
      success: true,
      data: existingProposal([{
        id: 'work-1',
        milestonePlanId: 'milestone-1',
        milestoneOrderIndex: 0,
        title: 'Interview users',
        description: 'Run five interviews',
        deliverables: 'Interview notes',
        estimatedDuration: '1 week',
        orderIndex: 0,
      }]),
    });

    render(<CreateProposalScreen />);
    await screen.findByDisplayValue('Interview users');

    expect(screen.getByRole('button', { name: 'Advanced details' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByDisplayValue('Run five interviews')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(updateProposalMock).toHaveBeenCalled());
    expect(updateProposalMock.mock.calls[0][1].workBreakdownItems).toEqual([
      expect.objectContaining({
        title: 'Interview users',
        description: 'Run five interviews',
        deliverables: 'Interview notes',
      }),
    ]);
  });

  it('keeps a legacy generated WBS hidden and regenerates it on save', async () => {
    getMyProposalByJobPostMock.mockResolvedValue({
      success: true,
      data: existingProposal([{
        id: 'work-1',
        milestonePlanId: 'milestone-1',
        milestoneOrderIndex: 0,
        title: 'Discovery',
        description: 'Approved discovery report',
        deliverables: 'Approved discovery report',
        estimatedDuration: '2 weeks',
        orderIndex: 0,
      }]),
    });

    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });

    expect(screen.getByRole('button', { name: 'Advanced details' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('heading', { name: 'Work Breakdown Structure' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(updateProposalMock).toHaveBeenCalled());
    expect(updateProposalMock.mock.calls[0][1].workBreakdownItems).toEqual([
      expect.objectContaining({
        title: 'Discovery',
        description: 'Approved discovery report',
        estimatedDuration: '2 weeks',
      }),
    ]);
  });

  it('opens a newly added milestone card', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });

    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));

    expect(screen.getByRole('button', { name: /untitled milestone 2/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByLabelText('Milestone title')).toHaveLength(1);
  });

  it('does not continue with an introduction shorter than the backend submission rule', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });

    fireEvent.change(screen.getByLabelText('Introduction'), {
      target: { value: 'A'.repeat(49) },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit proposal/i }));

    expect(await screen.findByText('Introduction must be at least 50 characters.')).toBeInTheDocument();
    expect(createProposalMock).not.toHaveBeenCalled();
  });

  it('submits with only the four visible milestone fields when narratives are valid', async () => {
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });

    fireEvent.change(screen.getByLabelText('Introduction'), {
      target: { value: 'A'.repeat(60) },
    });
    fireEvent.change(screen.getByLabelText('Your Proposal Approach'), {
      target: { value: 'B'.repeat(60) },
    });
    fillCoreMilestone();
    fireEvent.click(screen.getByRole('button', { name: /submit proposal/i }));

    await waitFor(() => expect(updateProposalStatusMock).toHaveBeenCalledWith(
      'proposal-1',
      { status: ProposalStatus.Pending },
    ));
    expect(createProposalMock.mock.calls[0][0].milestonePlans[0]).toMatchObject({
      estimatedDuration: '2 weeks',
      acceptanceCriteria: expect.any(String),
      workItems: [expect.objectContaining({ title: 'Discovery' })],
    });
  });

  it('opens the interview flow when the project only has optional questions', async () => {
    getJobPostQuestionsMock.mockResolvedValueOnce({
      success: true,
      data: [{
        jobPostQuestionsId: 'question-1',
        questionText: 'Share any additional context if useful.',
        orderIndex: 0,
        isRequired: false,
      }],
    });
    render(<CreateProposalScreen />);
    await screen.findByRole('heading', { name: 'Project Proposal' });

    fireEvent.change(screen.getByLabelText('Introduction'), {
      target: { value: 'A'.repeat(60) },
    });
    fireEvent.change(screen.getByLabelText('Your Proposal Approach'), {
      target: { value: 'B'.repeat(60) },
    });
    fillCoreMilestone();
    fireEvent.click(screen.getByRole('button', { name: /submit proposal/i }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(
      '/proposals/create/job-1/questions',
      { state: { proposalId: 'proposal-1', jobPostId: 'job-1' } },
    ));
    expect(updateProposalStatusMock).not.toHaveBeenCalled();
  });
});
