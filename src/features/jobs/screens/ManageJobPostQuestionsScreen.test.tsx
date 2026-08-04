import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageJobPostQuestionsScreen from './ManageJobPostQuestionsScreen';

const {
  getQuestionsMock,
  createQuestionMock,
  updateQuestionsMock,
  deleteQuestionMock,
} = vi.hoisted(() => ({
  getQuestionsMock: vi.fn(),
  createQuestionMock: vi.fn(),
  updateQuestionsMock: vi.fn(),
  deleteQuestionMock: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ jobPostId: 'job-1' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => ({
      'manageQuestions.title': 'Manage Questions',
      'manageQuestions.subtitle': 'Draft questions',
      'manageQuestions.addQuestion': 'Add Question',
      'manageQuestions.saveChanges': 'Save Changes',
      'manageQuestions.saveQuestions': 'Save Questions',
      'manageQuestions.questionNum': `Question ${values?.num || ''}`,
      'manageQuestions.placeholder': 'Enter question',
      'manageQuestions.orderIndex': `Order ${values?.index || 0}`,
      'manageQuestions.charCount': `${values?.count || 0}/1000`,
      'postJob.required': 'Required answer',
      'postJob.optional': 'Optional',
      'postJob.requiredStatus': `Required status for question ${values?.number || ''}`,
    }[key] || key),
  }),
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => ({
      'manageQuestions.title': 'Manage Questions',
      'manageQuestions.subtitle': 'Draft questions',
      'manageQuestions.addQuestion': 'Add Question',
      'manageQuestions.saveChanges': 'Save Changes',
      'manageQuestions.saveQuestions': 'Save Questions',
      'manageQuestions.questionNum': `Question ${values?.num || ''}`,
      'manageQuestions.placeholder': 'Enter question',
      'manageQuestions.orderIndex': `Order ${values?.index || 0}`,
      'manageQuestions.charCount': `${values?.count || 0}/1000`,
    }[key] || key),
  }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../api/jobAPI', () => ({
  jobAPI: {
    getJobPostQuestions: getQuestionsMock,
    createJobPostQuestion: createQuestionMock,
    updateBulkJobPostQuestions: updateQuestionsMock,
    deleteJobPostQuestion: deleteQuestionMock,
  },
}));

describe('ManageJobPostQuestionsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuestionsMock.mockResolvedValue({
      success: true,
      data: [{
        jobPostQuestionsId: 'question-1',
        jobPostsId: 'job-1',
        questionText: 'Share any additional context if useful.',
        orderIndex: 0,
        isRequired: false,
        createdAt: '2026-07-31T00:00:00Z',
        updatedAt: null,
      }],
    });
    updateQuestionsMock.mockResolvedValue({ success: true });
  });

  it('loads and saves the selected required status', async () => {
    render(<ManageJobPostQuestionsScreen />);

    const toggle = await screen.findByRole('checkbox', { name: 'Required status for question 1' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateQuestionsMock).toHaveBeenCalledWith('job-1', {
      questions: [expect.objectContaining({
        jobPostQuestionsId: 'question-1',
        isRequired: true,
      })],
    }));
  });

  it('creates new questions as required by default', async () => {
    render(<ManageJobPostQuestionsScreen />);
    await screen.findByDisplayValue('Share any additional context if useful.');

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    const toggles = screen.getAllByRole('checkbox');
    expect(toggles).toHaveLength(2);
    expect(toggles[1]).toBeChecked();
  });
});
