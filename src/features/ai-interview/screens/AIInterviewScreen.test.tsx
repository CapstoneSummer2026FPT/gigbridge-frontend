import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AIInterviewScreen from './AIInterviewScreen';

const {
  startInterviewMock,
  transcribeAudioMock,
  confirmAnswerMock,
  getQuestionAudioMock,
  streamQuestionAudioMock,
  navigateMock,
  routeContext,
} = vi.hoisted(() => ({
  startInterviewMock: vi.fn(),
  transcribeAudioMock: vi.fn(),
  confirmAnswerMock: vi.fn(),
  getQuestionAudioMock: vi.fn(),
  streamQuestionAudioMock: vi.fn(),
  navigateMock: vi.fn(),
  routeContext: {
    jobPostId: 'job-123',
    state: { jobTitle: 'Senior React Engineer' } as Record<string, unknown>,
  },
}));

vi.mock('react-router', () => ({
  useLocation: () => ({ state: routeContext.state }),
  useNavigate: () => navigateMock,
  useParams: () => ({ jobPostId: routeContext.jobPostId }),
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ user: { preferred_language: 'en', full_name: 'Candidate' } }),
}));

vi.mock('../../../api/externalAPI/aiInterviewAPI', () => ({
  aiInterviewAPI: {
    start: startInterviewMock,
    transcribeAudio: transcribeAudioMock,
    confirmAnswer: confirmAnswerMock,
    getQuestionAudio: getQuestionAudioMock,
    streamQuestionAudio: streamQuestionAudioMock,
  },
}));

class FakeMediaRecorder {
  static isTypeSupported = () => true;

  state: RecordingState = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    if (options?.mimeType) this.mimeType = options.mimeType;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['recorded audio'], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.(new Event('stop'));
  }
}

describe('AIInterviewScreen initiation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeContext.jobPostId = 'job-123';
    routeContext.state = { jobTitle: 'Senior React Engineer' };
    getQuestionAudioMock.mockResolvedValue({
      success: true,
      data: { status: 'failed' },
    });

    const stopTrack = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
    });
    globalThis.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder;
  });

  afterEach(() => cleanup());

  it('starts a job-specific session and renders the first AI question', async () => {
    startInterviewMock.mockResolvedValue({
      success: true,
      data: {
        session_id: 'session-123',
        audio_access_token: 'session-audio-token-that-is-long-enough',
        question_index: 1,
        question_text: 'Tell me about a React performance problem you solved.',
      },
    });

    render(<AIInterviewScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start ai interview/i }));

    await waitFor(() => expect(startInterviewMock).toHaveBeenCalledWith('job-123', 'en'));
    expect(await screen.findByText('Tell me about a React performance problem you solved.')).toBeInTheDocument();
  });

  it('records only after the answer button, transcribes, and submits the reviewed answer', async () => {
    startInterviewMock.mockResolvedValue({
      success: true,
      data: {
        session_id: 'session-123',
        audio_access_token: 'session-audio-token-that-is-long-enough',
        question_index: 1,
        question_text: 'Describe a difficult React performance issue.',
        language: 'en',
      },
    });
    transcribeAudioMock.mockResolvedValue({
      success: true,
      data: {
        transcript: 'I reduced the bundle size with route-based code splitting.',
        language: 'en',
        stt_provider: 'faster_whisper',
        confidence: 0.92,
      },
    });
    confirmAnswerMock.mockResolvedValue({
      success: true,
      data: {
        session_id: 'session-123',
        question_index: 3,
        is_completed: true,
        feedback: {
          score: 91,
          summary: 'Strong evidence-based technical answer.',
          technical_skills: ['React'],
          soft_skills: ['Communication'],
          recommended_hire: true,
        },
      },
    });

    render(<AIInterviewScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start ai interview/i }));

    const answerButton = await screen.findByRole('button', { name: /answer question/i });
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(answerButton);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole('button', { name: /finish answer/i }));
    await waitFor(() => expect(transcribeAudioMock).toHaveBeenCalledWith(
      'session-123',
      expect.any(Blob),
      'en'
    ));

    expect(await screen.findByDisplayValue('I reduced the bundle size with route-based code splitting.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => expect(confirmAnswerMock).toHaveBeenCalledWith(
      'session-123',
      'I reduced the bundle size with route-based code splitting.'
    ));
    expect(await screen.findByText('91%')).toBeInTheDocument();
    expect(screen.getByText('Strong evidence-based technical answer.')).toBeInTheDocument();
  });

  it('requires job context before contacting the interview service', async () => {
    routeContext.jobPostId = '';

    render(<AIInterviewScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start ai interview/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a job before starting an AI interview.');
    expect(startInterviewMock).not.toHaveBeenCalled();
  });
});
