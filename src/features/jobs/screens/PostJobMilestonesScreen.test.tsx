import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostJobMilestonesScreen from './PostJobMilestonesScreen';

const {
  mockNavigate,
  mockSubmitDraftFlow,
  mockUsePostJob,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSubmitDraftFlow: vi.fn(),
  mockUsePostJob: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { jobPostId: 'job-1' } }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'postJobWizard.reviewContinue': 'Continue to review',
        'postJobWizard.plan.title': 'Plan your milestones',
        'postJob.durationUnits.weeks': 'weeks',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('../hooks/usePostJob', () => ({
  usePostJob: () => mockUsePostJob(),
}));

vi.mock('../../../shared/components/NestedMilestonePlanEditor', () => ({
  NestedMilestonePlanEditor: () => <div>milestone-editor</div>,
}));

vi.mock('../components/PostJobWizardShell', () => ({
  PostJobWizardShell: ({
    expectedBudget,
    estimatedDuration,
    primaryAction,
    overlay,
  }: {
    expectedBudget?: number | null;
    estimatedDuration?: string | null;
    primaryAction?: React.ReactNode;
    overlay?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="expected-budget">
        {expectedBudget !== undefined && expectedBudget !== null ? String(expectedBudget) : 'none'}
      </div>
      <div data-testid="estimated-duration">{estimatedDuration ?? 'none'}</div>
      {primaryAction}
      {overlay}
    </div>
  ),
}));

vi.mock('../components/PostJobLeavePrompt', () => ({
  PostJobLeavePrompt: () => null,
}));

vi.mock('../components/PostJobBudgetExceededPrompt', () => ({
  PostJobBudgetExceededPrompt: ({ isOpen, total, expected }: {
    isOpen: boolean;
    total: string;
    expected: string;
  }) => (isOpen ? <div data-testid="budget-prompt">{total}|{expected}</div> : null),
}));

const buildHookValue = () => ({
  form: {
    title: 'Client onboarding portal',
    budget: '100',
    estimatedDurationValue: '3',
    estimatedDurationUnit: 'weeks',
  },
  previewTitle: 'Client onboarding portal',
  errorMessage: '',
  isDraftInitializing: false,
  draftError: '',
  milestonePlans: [],
  setMilestonePlans: vi.fn(),
  milestoneErrors: {},
  setMilestoneErrors: vi.fn(),
  expandedMilestone: null,
  setExpandedMilestone: vi.fn(),
  questions: [{ questionText: '', isRequired: true }],
  setQuestions: vi.fn(),
  draggedIndex: null,
  updateQuestion: vi.fn(),
  handleDragStart: vi.fn(),
  handleDragOver: vi.fn(),
  handleDragEnd: vi.fn(),
  MAX_QUESTION_LENGTH: 1000,
  milestonePlanTotal: 200,
  isActionDisabled: false,
  isLeavePromptOpen: false,
  leaveAction: null,
  autosaveStatus: 'saved',
  autosaveError: '',
  handleLeaveSaveDraft: vi.fn(),
  handleLeaveDiscardDraft: vi.fn(),
  cancelBlockedNavigation: vi.fn(),
  submitDraftFlow: mockSubmitDraftFlow,
  renderSubmitLabel: (_mode: string, label: string) => label,
  retryAutosave: vi.fn(),
  navigateWizard: vi.fn(),
  isBudgetExceededPromptOpen: false,
  handleBudgetExceededConfirm: vi.fn(),
  handleBudgetExceededCancel: vi.fn(),
});

describe('PostJobMilestonesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitDraftFlow.mockResolvedValue({ status: 'success' });
    mockUsePostJob.mockReturnValue(buildHookValue());
  });

  it('passes the step-1 expected budget and estimated duration to the sidebar', () => {
    render(<PostJobMilestonesScreen />);

    expect(screen.getByTestId('expected-budget')).toHaveTextContent('100');
    expect(screen.getByTestId('estimated-duration')).toHaveTextContent('3 weeks');
  });

  it('renders the budget-exceeded prompt with milestone total and expected budget when open', () => {
    mockUsePostJob.mockReturnValue({
      ...buildHookValue(),
      isBudgetExceededPromptOpen: true,
    });

    render(<PostJobMilestonesScreen />);

    expect(screen.getByTestId('budget-prompt')).toHaveTextContent('200 G-coin|100 G-coin');
  });

  it('calls submitDraftFlow with review from the primary action', () => {
    render(<PostJobMilestonesScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue to review' }));

    expect(mockSubmitDraftFlow).toHaveBeenCalledWith('review');
  });
});
