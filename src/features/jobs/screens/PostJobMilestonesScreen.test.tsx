import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
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
    children,
    expectedBudget,
    estimatedDuration,
    milestoneTotal,
    milestoneTotalWeeks,
    expectedDurationWeeks,
    primaryAction,
    overlay,
  }: {
    children?: React.ReactNode;
    expectedBudget?: number | null;
    estimatedDuration?: string | null;
    milestoneTotal?: number;
    milestoneTotalWeeks?: number;
    expectedDurationWeeks?: number;
    primaryAction?: React.ReactNode;
    overlay?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="expected-budget">
        {expectedBudget !== undefined && expectedBudget !== null ? String(expectedBudget) : 'none'}
      </div>
      <div data-testid="estimated-duration">{estimatedDuration ?? 'none'}</div>
      <div data-testid="milestone-total">
        {milestoneTotal !== undefined ? String(milestoneTotal) : 'none'}
      </div>
      <div data-testid="milestone-total-weeks">
        {milestoneTotalWeeks !== undefined ? String(milestoneTotalWeeks) : 'none'}
      </div>
      <div data-testid="expected-duration-weeks">
        {expectedDurationWeeks !== undefined ? String(expectedDurationWeeks) : 'none'}
      </div>
      {primaryAction}
      {overlay}
      {children}
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
  milestonePlans: [] as EditableMilestonePlan[],
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

  it('passes the milestone total and duration weeks to the sidebar for draft ratios', () => {
    mockUsePostJob.mockReturnValue({
      ...buildHookValue(),
      milestonePlans: [
        { amount: 0, orderIndex: 0, workItems: [], estimatedDuration: '2 weeks' },
        { amount: 0, orderIndex: 1, workItems: [], estimatedDuration: '2 weeks' },
      ] as EditableMilestonePlan[],
    });

    render(<PostJobMilestonesScreen />);

    expect(screen.getByTestId('milestone-total')).toHaveTextContent('200');
    expect(screen.getByTestId('milestone-total-weeks')).toHaveTextContent('4');
    expect(screen.getByTestId('expected-duration-weeks')).toHaveTextContent('3');
  });

  it('passes zero milestone weeks when no milestone durations are set', () => {
    render(<PostJobMilestonesScreen />);

    expect(screen.getByTestId('milestone-total-weeks')).toHaveTextContent('0');
    expect(screen.getByTestId('expected-duration-weeks')).toHaveTextContent('3');
  });

  it('passes zero expected duration weeks when the job has no estimated duration', () => {
    mockUsePostJob.mockReturnValue({
      ...buildHookValue(),
      form: { ...buildHookValue().form, estimatedDurationValue: '' },
    });

    render(<PostJobMilestonesScreen />);

    expect(screen.getByTestId('estimated-duration')).toHaveTextContent('none');
    expect(screen.getByTestId('expected-duration-weeks')).toHaveTextContent('0');
  });
});
