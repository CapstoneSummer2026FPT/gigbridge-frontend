import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostJobReviewScreen from './PostJobReviewScreen';

const {
  mockNavigate,
  mockNavigateWizard,
  mockSubmitDraftFlow,
  mockUsePostJob,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockNavigateWizard: vi.fn(),
  mockSubmitDraftFlow: vi.fn(),
  mockUsePostJob: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { jobPostId: 'job-1' } }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'postJobWizard.notProvided': 'Not provided',
      'postJobWizard.edit': 'Edit',
      'postJobWizard.backPlan': 'Back to plan',
      'postJobWizard.saveExit': 'Save & exit',
      'postJob.publishProjectRequest': 'Publish project request',
      'postJob.required': 'Required',
      'postJobWizard.plan.milestones': 'Baseline milestones',
      'postJobWizard.plan.milestoneCopy.duration': 'Duration',
      'postJobWizard.plan.milestoneCopy.deadline': 'Deadline',
      'postJobWizard.plan.milestoneCopy.description': 'Description',
      'postJobWizard.plan.milestoneCopy.deliverables': 'Deliverables',
      'postJobWizard.plan.milestoneCopy.acceptanceCriteria': 'Acceptance criteria',
      'postJob.questionsForInterview': 'Interview questions',
    }[key] || key),
  }),
}));

vi.mock('../hooks/usePostJob', () => ({
  usePostJob: () => mockUsePostJob(),
}));

vi.mock('../components/PostJobWizardShell', () => ({
  PostJobWizardShell: ({
    children,
    backAction,
    secondaryAction,
    primaryAction,
    overlay,
  }: {
    children: ReactNode;
    backAction?: ReactNode;
    secondaryAction?: ReactNode;
    primaryAction: ReactNode;
    overlay?: ReactNode;
  }) => (
    <div>
      {children}
      {backAction}
      {secondaryAction}
      {primaryAction}
      {overlay}
    </div>
  ),
}));

vi.mock('../components/PostJobLeavePrompt', () => ({
  PostJobLeavePrompt: () => null,
}));

const buildHookValue = () => ({
  form: {
    title: 'Client onboarding portal',
    majorId: 'major-1',
    majorCategoryId: 'category-1',
    categoryId: 'category-1',
    description: 'Build a secure onboarding portal.',
    skillIds: ['skill-1'],
    customSkillNames: ['Accessibility'],
    budget: '3000',
    currency: 'GIG',
    estimatedDurationValue: '6',
    estimatedDurationUnit: 'weeks',
    visibility: '0',
    deadline: '2026-08-10',
    isAigenerated: false,
  },
  selectedOfficialSkills: [{ skillId: 'skill-1', name: 'React' }],
  selectedMajorName: 'Software development',
  selectedCategoryName: 'Web applications',
  previewTitle: 'Client onboarding portal',
  errorMessage: '',
  isActionDisabled: false,
  isDraftInitializing: false,
  draftError: '',
  questions: [
    { questionText: 'How would you secure uploaded documents?', isRequired: true },
    { questionText: 'What testing strategy would you use?', isRequired: true },
  ],
  milestonePlans: [
    {
      id: 'milestone-1',
      title: 'Design and API foundation',
      description: 'Create the approved system design and core API.',
      amount: 1200,
      estimatedDuration: '2 weeks',
      dueDate: '2026-08-24',
      deliverables: 'Architecture document and authenticated API.',
      acceptanceCriteria: 'Client approves the design and API test suite passes.',
      orderIndex: 0,
      workItems: [{
        title: 'Hidden work item',
        description: 'This WBS detail must not appear in the client review.',
        deliverables: 'Internal task',
        estimatedDuration: '1 week',
        orderIndex: 0,
      }],
    },
    {
      id: 'milestone-2',
      title: 'Portal delivery',
      description: '',
      amount: 1800,
      estimatedDuration: '4 weeks',
      dueDate: '2026-09-21',
      deliverables: 'Production-ready onboarding portal.',
      acceptanceCriteria: 'All agreed user journeys pass acceptance testing.',
      orderIndex: 1,
      workItems: [],
    },
  ],
  milestonePlanTotal: 3000,
  attachments: [],
  isLeavePromptOpen: false,
  leaveAction: null,
  autosaveStatus: 'saved',
  autosaveError: '',
  handleLeaveSaveDraft: vi.fn(),
  handleLeaveDiscardDraft: vi.fn(),
  cancelBlockedNavigation: vi.fn(),
  submitDraftFlow: mockSubmitDraftFlow,
  renderSubmitLabel: (_action: string, label: string) => label,
  retryAutosave: vi.fn(),
  navigateWizard: mockNavigateWizard,
});

describe('PostJobReviewScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePostJob.mockReturnValue(buildHookValue());
  });

  it('shows every milestone detail directly while keeping WBS hidden', () => {
    render(<PostJobReviewScreen />);

    expect(screen.getByText('1. Design and API foundation')).toBeInTheDocument();
    expect(screen.getByText('1,200 G-coin')).toBeInTheDocument();
    expect(screen.getByText('2 weeks')).toBeInTheDocument();
    expect(screen.getByText('2026-08-24')).toBeInTheDocument();
    expect(screen.getByText('Create the approved system design and core API.')).toBeInTheDocument();
    expect(screen.getByText('Architecture document and authenticated API.')).toBeInTheDocument();
    expect(screen.getByText('Client approves the design and API test suite passes.')).toBeInTheDocument();

    expect(screen.getByText('2. Portal delivery')).toBeInTheDocument();
    expect(screen.getByText('1,800 G-coin')).toBeInTheDocument();
    expect(screen.getByText('4 weeks')).toBeInTheDocument();
    expect(screen.getByText('2026-09-21')).toBeInTheDocument();
    expect(screen.getByText('Production-ready onboarding portal.')).toBeInTheDocument();
    expect(screen.getByText('All agreed user journeys pass acceptance testing.')).toBeInTheDocument();
    expect(screen.getAllByText('Not provided').length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByText('Hidden work item')).not.toBeInTheDocument();
    expect(screen.queryByText(/Work Breakdown Structure/i)).not.toBeInTheDocument();
  });

  it('shows ordered required questions directly on the review', () => {
    render(<PostJobReviewScreen />);

    expect(screen.getByText('1. How would you secure uploaded documents?')).toBeInTheDocument();
    expect(screen.getByText('2. What testing strategy would you use?')).toBeInTheDocument();
    expect(screen.getAllByText('Required')).toHaveLength(2);
  });

  it('keeps empty milestone and question states readable', () => {
    mockUsePostJob.mockReturnValue({
      ...buildHookValue(),
      questions: [{ questionText: '   ', isRequired: true }],
      milestonePlans: [],
      milestonePlanTotal: 0,
    });

    render(<PostJobReviewScreen />);

    expect(screen.getAllByText('Not provided').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('Design and API foundation')).not.toBeInTheDocument();
    expect(screen.queryByText('How would you secure uploaded documents?')).not.toBeInTheDocument();
  });

  it('preserves edit, save-draft, and publish actions', () => {
    render(<PostJobReviewScreen />);

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0]);
    fireEvent.click(editButtons[editButtons.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save & exit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish project request' }));

    expect(mockNavigateWizard).toHaveBeenCalledWith('/jobs/post');
    expect(mockNavigateWizard).toHaveBeenCalledWith('/jobs/post/plan');
    expect(mockSubmitDraftFlow).toHaveBeenCalledWith('draft');
    expect(mockSubmitDraftFlow).toHaveBeenCalledWith('publish');
  });
});
