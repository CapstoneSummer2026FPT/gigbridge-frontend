import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ManageJobPostQuestionsScreen from './ManageJobPostQuestionsScreen';
import { UNDO_DELETE_WINDOW_MS } from '../../../shared/hooks/useUndoableDeleteScope';

const apiMocks = vi.hoisted(() => ({
  getJobPostQuestions: vi.fn(),
  deleteJobPostQuestion: vi.fn(),
  createJobPostQuestion: vi.fn(),
  updateBulkJobPostQuestions: vi.fn(),
}));

vi.mock('../../../api/jobAPI', () => ({
  jobAPI: apiMocks,
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ jobPostId: 'job-1' }),
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: string | { defaultValue?: string; name?: string }) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions?.name) return `${key}:${fallbackOrOptions.name}`;
      return fallbackOrOptions?.defaultValue ?? key;
    },
  }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../components/QuestionRequiredToggle', () => ({
  QuestionRequiredToggle: () => <span>Required</span>,
}));

vi.mock('sonner', () => {
  const toastMock = vi.fn();
  return {
    toast: Object.assign(toastMock, {
      dismiss: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    }),
  };
});

interface ToastActionOptions {
  action?: {
    onClick: () => void;
  };
}

const clickUndo = (callIndex: number): void => {
  const options = vi.mocked(toast).mock.calls[callIndex]?.[1] as ToastActionOptions | undefined;
  options?.action?.onClick();
};

const question = {
  jobPostQuestionsId: 'question-1',
  jobPostsId: 'job-1',
  questionText: 'Describe your experience',
  orderIndex: 0,
  isRequired: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};

describe('ManageJobPostQuestionsScreen undo delete', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    apiMocks.getJobPostQuestions.mockResolvedValue({ success: true, data: [question] });
    apiMocks.deleteJobPostQuestion.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('removes immediately and cancels the backend DELETE when undone before five seconds', async () => {
    render(<ManageJobPostQuestionsScreen />);
    await screen.findByDisplayValue(question.questionText);

    fireEvent.click(screen.getByTitle('Xóa câu hỏi'));
    expect(screen.queryByDisplayValue(question.questionText)).not.toBeInTheDocument();
    expect(apiMocks.deleteJobPostQuestion).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(UNDO_DELETE_WINDOW_MS - 1);
      clickUndo(0);
    });

    expect(await screen.findByDisplayValue(question.questionText)).toBeInTheDocument();
    expect(apiMocks.deleteJobPostQuestion).not.toHaveBeenCalled();
  });

  it('calls DELETE at five seconds and restores the question when the API fails', async () => {
    apiMocks.deleteJobPostQuestion.mockResolvedValue({ success: false, message: 'Delete failed' });
    render(<ManageJobPostQuestionsScreen />);
    await screen.findByDisplayValue(question.questionText);

    fireEvent.click(screen.getByTitle('Xóa câu hỏi'));
    await act(async () => {
      vi.advanceTimersByTime(UNDO_DELETE_WINDOW_MS);
      await Promise.resolve();
    });

    await waitFor(() => expect(apiMocks.deleteJobPostQuestion).toHaveBeenCalledWith('job-1', 'question-1'));
    expect(await screen.findByDisplayValue(question.questionText)).toBeInTheDocument();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Delete failed');
  });

  it('commits a persisted question deletion after five seconds', async () => {
    render(<ManageJobPostQuestionsScreen />);
    await screen.findByDisplayValue(question.questionText);

    fireEvent.click(screen.getByTitle('Xóa câu hỏi'));
    await act(async () => {
      vi.advanceTimersByTime(UNDO_DELETE_WINDOW_MS);
      await Promise.resolve();
    });

    expect(apiMocks.deleteJobPostQuestion).toHaveBeenCalledTimes(1);
    expect(screen.queryByDisplayValue(question.questionText)).not.toBeInTheDocument();
  });

  it('never calls DELETE for a new unsaved question', async () => {
    render(<ManageJobPostQuestionsScreen />);
    await screen.findByDisplayValue(question.questionText);

    fireEvent.click(screen.getByText('Thêm câu hỏi mới'));
    fireEvent.click(screen.getAllByTitle('Xóa câu hỏi')[1]);
    act(() => {
      vi.advanceTimersByTime(UNDO_DELETE_WINDOW_MS);
    });

    expect(apiMocks.deleteJobPostQuestion).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue(question.questionText)).toBeInTheDocument();
  });

  it('finalizes a pending delete before saving', async () => {
    render(<ManageJobPostQuestionsScreen />);
    await screen.findByDisplayValue(question.questionText);

    fireEvent.click(screen.getByTitle('Xóa câu hỏi'));
    fireEvent.click(screen.getAllByText('Lưu thay đổi')[0]);

    await waitFor(() => expect(apiMocks.deleteJobPostQuestion).toHaveBeenCalledTimes(1));
    expect(apiMocks.createJobPostQuestion).not.toHaveBeenCalled();
    expect(apiMocks.updateBulkJobPostQuestions).not.toHaveBeenCalled();
  });
});
