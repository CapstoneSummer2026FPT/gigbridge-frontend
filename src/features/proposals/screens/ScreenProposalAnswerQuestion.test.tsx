import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScreenProposalAnswerQuestion from './ScreenProposalAnswerQuestion';

const navigateMock = vi.fn();
const {
  getQuestionsMock,
  getAnswersMock,
  startQuestionTimerMock,
  completeQuestionTimerMock,
  startInterviewReviewMock,
  completeInterviewReviewMock,
  updateAnswersMock,
  updateProposalStatusMock,
} = vi.hoisted(() => ({
  getQuestionsMock: vi.fn(),
  getAnswersMock: vi.fn(),
  startQuestionTimerMock: vi.fn(),
  completeQuestionTimerMock: vi.fn(),
  startInterviewReviewMock: vi.fn(),
  completeInterviewReviewMock: vi.fn(),
  updateAnswersMock: vi.fn(),
  updateProposalStatusMock: vi.fn(),
}));

vi.mock('react-router', () => ({
  useLocation: () => ({
    pathname: '/jobs/job-1/proposal/questions',
    search: '',
    state: { proposalId: 'proposal-1', jobPostId: 'job-1' },
  }),
  useNavigate: () => navigateMock,
  useParams: () => ({ jobPostId: 'job-1' }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../api/jobAPI/GET', () => ({
  jobGetAPI: { getJobPostQuestions: getQuestionsMock },
}));

vi.mock('../../../api/proposalAPI/GET', () => ({
  proposalGetAPI: { getProposalAnswers: getAnswersMock },
}));

vi.mock('../../../api/proposalAPI/POST', () => ({
  proposalPostAPI: {
    startQuestionTimer: startQuestionTimerMock,
    completeQuestionTimer: completeQuestionTimerMock,
    startInterviewReview: startInterviewReviewMock,
    completeInterviewReview: completeInterviewReviewMock,
  },
}));

vi.mock('../../../api/proposalAPI/PATCH', () => ({
  proposalPatchAPI: {
    updateBulkProposalAnswers: updateAnswersMock,
    updateProposalStatus: updateProposalStatusMock,
  },
}));

describe('ScreenProposalAnswerQuestion without anti-cheat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuestionsMock.mockResolvedValue({
      success: true,
      data: [{
        jobPostQuestionsId: 'question-1',
        questionText: 'How would you approach this project?',
        orderIndex: 1,
        isRequired: true,
      }],
    });
    getAnswersMock.mockResolvedValue({ success: true, data: [] });
    startQuestionTimerMock.mockResolvedValue({
      success: true,
      data: {
        proposalId: 'proposal-1',
        jobPostQuestionId: 'question-1',
        startedAt: '2026-07-26T08:00:00.000Z',
        expiresAt: '2099-07-26T08:03:00.000Z',
        remainingSeconds: 180,
        isLocked: false,
        lockedReason: null,
      },
    });
  });

  it('starts the timer explicitly without requesting fullscreen', async () => {
    const requestFullscreenMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
    });

    render(<ScreenProposalAnswerQuestion />);

    const startButton = await screen.findByRole('button', { name: /start interview/i });
    expect(screen.queryByText(/secure interview mode/i)).not.toBeInTheDocument();

    fireEvent.click(startButton);

    await waitFor(() => {
      expect(startQuestionTimerMock).toHaveBeenCalledWith('proposal-1', 'question-1');
    });
    expect(requestFullscreenMock).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Write your answer...')).toBeEnabled();
  });

  it('does not block copy or paste browser events', async () => {
    render(<ScreenProposalAnswerQuestion />);
    await screen.findByRole('button', { name: /start interview/i });

    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });

    expect(document.dispatchEvent(copyEvent)).toBe(true);
    expect(document.dispatchEvent(pasteEvent)).toBe(true);
    expect(copyEvent.defaultPrevented).toBe(false);
    expect(pasteEvent.defaultPrevented).toBe(false);
  });
});

