import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostJobReviewScreen from './PostJobReviewScreen';

const {
  mockNavigate,
  mockNavigateWizard,
  mockSubmitDraftFlow,
  mockFlushAutosave,
  mockSetForm,
  mockUsePostJob,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockNavigateWizard: vi.fn(),
  mockSubmitDraftFlow: vi.fn(),
  mockFlushAutosave: vi.fn(),
  mockSetForm: vi.fn(),
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
      'postJobWizard.review.done': 'Done',
      'postJobWizard.review.savingInline': 'Saving...',
      'postJobWizard.backPlan': 'Back to plan',
      'postJobWizard.saveExit': 'Save & exit',
      'postJob.publishProjectRequest': 'Publish project request',
      'postJob.required': 'Required',
      'postJob.optional': 'Optional',
      'postJob.requiredStatus': 'Required status',
      'postJobWizard.plan.milestones': 'Baseline milestones',
      'postJobWizard.plan.milestoneCopy.duration': 'Duration',
      'postJobWizard.plan.milestoneCopy.deadline': 'Deadline',
      'postJobWizard.plan.milestoneCopy.description': 'Description',
      'postJobWizard.plan.milestoneCopy.deliverables': 'Deliverables',
      'postJobWizard.plan.milestoneCopy.acceptanceCriteria': 'Acceptance criteria',
      'postJob.questionsForInterview': 'Interview questions',
      'postJob.jobTitle': 'Project title',
      'postJob.expectedBudget': 'Expected budget',
      'postJob.visibility': 'Visibility',
      'postJob.public': 'Public',
      'postJob.private': 'Private',
      'postJob.inviteOnly': 'Invite only',
      'postJob.addQuestion': 'Add interview question',
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
  setForm: mockSetForm,
  majors: [{ majorId: 'major-1', name: 'Software development' }],
  categories: [{ majorCategoryId: 'category-1', name: 'Web applications' }],
  skillInput: '',
  setSkillInput: vi.fn(),
  remainingSkills: [],
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
    { questionText: 'What testing strategy would you use?', isRequired: false },
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
  isUploadingAttachment: false,
  attachmentError: '',
  isMajorsLoading: false,
  isCategoriesLoading: false,
  isSkillsLoading: false,
  handleMajorChange: vi.fn(),
  handleCategoryChange: vi.fn(),
  addOfficialSkill: vi.fn(),
  addSkill: vi.fn(),
  removeOfficialSkill: vi.fn(),
  removeCustomSkill: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  setMilestonePlans: vi.fn(),
  milestoneErrors: {},
  setMilestoneErrors: vi.fn(),
  expandedMilestone: 0,
  setExpandedMilestone: vi.fn(),
  setQuestions: vi.fn(),
  draggedIndex: null,
  updateQuestion: vi.fn(),
  handleDragStart: vi.fn(),
  handleDragOver: vi.fn(),
  handleDragEnd: vi.fn(),
  MAX_QUESTION_LENGTH: 1000,
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
  flushAutosave: mockFlushAutosave,
});

describe('PostJobReviewScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitDraftFlow.mockResolvedValue({ status: 'success' });
    mockFlushAutosave.mockResolvedValue('job-1');
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

  it('shows ordered required and optional questions directly on the review', () => {
    render(<PostJobReviewScreen />);

    expect(screen.getByText('1. How would you secure uploaded documents?')).toBeInTheDocument();
    expect(screen.getByText('2. What testing strategy would you use?')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
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

  it('edits the project inline and closes it only after flushing autosave', async () => {
    render(<PostJobReviewScreen />);

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0]);

    const title = screen.getByLabelText('Project title *');
    expect(title).toHaveValue('Client onboarding portal');
    expect(mockNavigateWizard).not.toHaveBeenCalled();

    fireEvent.change(title, { target: { value: 'Updated onboarding portal' } });
    expect(mockSetForm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated onboarding portal' }));

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(mockFlushAutosave).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByLabelText('Project title *')).not.toBeInTheDocument());
  });

  it('flushes the current section before switching editors', async () => {
    render(<PostJobReviewScreen />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    await waitFor(() => expect(mockFlushAutosave).toHaveBeenCalledOnce());
    expect(screen.queryByLabelText('Project title *')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expected budget')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Visibility'), { target: { value: '1' } });
    expect(mockSetForm).toHaveBeenCalledWith(expect.objectContaining({ visibility: '1' }));
  });

  it('keeps the editor open when autosave fails', async () => {
    mockFlushAutosave.mockRejectedValueOnce(new Error('Save failed'));
    render(<PostJobReviewScreen />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(mockFlushAutosave).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('Project title *')).toBeInTheDocument();
  });

  it('keeps attachment upload and deletion available in project editing', () => {
    const controller = {
      ...buildHookValue(),
      attachments: [{
        jobPostAttachmentsId: 'attachment-1',
        fileUrl: 'https://files.example/project.png',
        fileName: 'project.png',
      }],
    };
    mockUsePostJob.mockReturnValue(controller);
    render(<PostJobReviewScreen />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const file = new File(['image'], 'new-reference.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'postJobWizard.details.deleteImage' }));

    expect(controller.uploadAttachment).toHaveBeenCalledWith(file);
    expect(controller.deleteAttachment).toHaveBeenCalledWith('attachment-1');
  });

  it('edits the hiring plan without exposing WBS', () => {
    render(<PostJobReviewScreen />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[2]);

    expect(document.querySelector('[data-milestone-field="0.title"]')).toBeInTheDocument();
    expect(document.querySelector('[data-question-index="0"]')).toBeInTheDocument();
    expect(screen.queryByText(/Work Breakdown Structure/i)).not.toBeInTheDocument();

    fireEvent.change(document.querySelector('[data-milestone-field="0.title"]')!, { target: { value: 'Updated milestone' } });
    fireEvent.change(document.querySelector('[data-question-index="0"]')!, { target: { value: 'Updated question' } });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Required status' })[0]);
    const controller = mockUsePostJob.mock.results[0].value;
    expect(controller.setMilestonePlans).toHaveBeenCalled();
    expect(controller.updateQuestion).toHaveBeenCalledWith(0, { questionText: 'Updated question' });
    expect(controller.updateQuestion).toHaveBeenCalledWith(0, { isRequired: false });
  });

  it('opens the validation section returned by publish', async () => {
    mockSubmitDraftFlow.mockResolvedValueOnce({
      status: 'validation-error',
      section: 'terms',
      fieldSelector: '#job-budget',
    });
    render(<PostJobReviewScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish project request' }));

    await waitFor(() => expect(screen.getByLabelText('Expected budget')).toBeInTheDocument());
    expect(mockNavigateWizard).not.toHaveBeenCalled();
  });

  it('preserves back, save-draft, and publish actions', async () => {
    render(<PostJobReviewScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & exit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish project request' }));

    expect(mockNavigateWizard).toHaveBeenCalledWith('/jobs/post/plan');
    expect(mockSubmitDraftFlow).toHaveBeenCalledWith('draft');
    await waitFor(() => expect(mockSubmitDraftFlow).toHaveBeenCalledWith('publish'));
  });
});
