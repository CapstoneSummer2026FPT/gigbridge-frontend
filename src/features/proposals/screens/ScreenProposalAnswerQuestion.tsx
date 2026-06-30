import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, Maximize2, Save, Send, ShieldAlert, X } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { ProposalStatus, type ProposalAnswerDto } from '../../../types/models/Proposal';
import type { JobPostQuestionDto } from '../../../types/models/Job';

type AnswerRouteState = {
  proposalId?: string;
  jobPostId?: string;
};

const cheatingEventTypes = {
  copy: 0,
  paste: 1,
  tabSwitch: 2,
  screenshotAttempt: 3,
  focusLoss: 4,
  fullscreenExit: 5,
} as const;

type CheatingEventType = typeof cheatingEventTypes[keyof typeof cheatingEventTypes];

interface CheatingWarning {
  readonly title: string;
  readonly message: string;
  readonly totalCount?: number;
  readonly blocking?: boolean;
}

interface CheatingWarningOptions {
  readonly blocking?: boolean;
  readonly deferUntilVisible?: boolean;
}

const createClientEventId = (eventLabel: string): string => {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return `${eventLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${randomPart}`;
};

export default function ScreenProposalAnswerQuestion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const { jobPostId: routeJobPostId } = useParams<{ jobPostId: string }>();
  const routeState = (location.state || {}) as AnswerRouteState;
  const search = new URLSearchParams(location.search);

  const proposalId = routeState.proposalId || search.get('proposalId') || '';
  const jobPostId = routeState.jobPostId || routeJobPostId || '';

  const [questions, setQuestions] = useState<JobPostQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cheatingWarning, setCheatingWarning] = useState<CheatingWarning | null>(null);
  const [secureModeStarted, setSecureModeStarted] = useState(false);
  const [secureModeResumeRequired, setSecureModeResumeRequired] = useState(false);
  const [contentShielded, setContentShielded] = useState(false);
  const secureAreaRef = useRef<HTMLDivElement | null>(null);
  const activeQuestionIdRef = useRef<string | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const pendingWarningRef = useRef<CheatingWarning | null>(null);
  const focusLossActiveRef = useRef(false);
  const fullscreenExitLoggedRef = useRef(false);
  const lastScreenshotAttemptAtRef = useRef(0);
  const lastFullscreenGuardEventAtRef = useRef(0);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.orderIndex - b.orderIndex),
    [questions]
  );

  const watermarkText = useMemo(() => {
    const identity = user?.email || user?.id || 'freelancer';
    const proposalLabel = proposalId ? proposalId.slice(0, 8) : 'proposal';
    return `${identity} | Proposal ${proposalLabel} | ${new Date().toLocaleString()}`;
  }, [proposalId, user?.email, user?.id]);

  const watermarkTiles = useMemo(
    () => Array.from({ length: 48 }, (_, index) => `${watermarkText} | ${index + 1}`),
    [watermarkText]
  );

  useEffect(() => {
    const load = async () => {
      if (!proposalId || !jobPostId) {
        setError('Proposal or JobPost id is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [questionsResponse, answersResponse] = await Promise.all([
          jobGetAPI.getJobPostQuestions(jobPostId),
          proposalGetAPI.getProposalAnswers(proposalId),
        ]);

        if (!questionsResponse.success) {
          setError(questionsResponse.message || 'Questions could not be loaded.');
          return;
        }

        const loadedQuestions = questionsResponse.data || [];
        setQuestions(loadedQuestions);

        const answerMap: Record<string, string> = {};
        if (answersResponse.success && answersResponse.data) {
          answersResponse.data.forEach((answer: ProposalAnswerDto) => {
            answerMap[answer.jobPostQuestionsId] = answer.answerText || '';
          });
        }
        loadedQuestions.forEach(question => {
          answerMap[question.jobPostQuestionsId] = answerMap[question.jobPostQuestionsId] || '';
        });
        setAnswers(answerMap);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [proposalId, jobPostId]);

  const showCheatingWarning = useCallback((warning: CheatingWarning) => {
    setCheatingWarning(warning);
    if (warningTimerRef.current !== null) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    if (warning.blocking) {
      return;
    }

    warningTimerRef.current = window.setTimeout(() => {
      setCheatingWarning(null);
      warningTimerRef.current = null;
    }, 6500);
  }, []);

  const logCheatingEvent = useCallback(async (
    eventType: CheatingEventType,
    title: string,
    options?: CheatingWarningOptions
  ) => {
    if (!proposalId) {
      return;
    }

    try {
      const response = await proposalPostAPI.logCheatingEvent(proposalId, {
        eventType,
        jobPostQuestionId: activeQuestionIdRef.current,
        clientEventId: createClientEventId(title),
        occurredAt: new Date().toISOString(),
        metadata: {
          path: window.location.pathname,
          visibilityState: document.visibilityState,
          fullscreen: String(Boolean(document.fullscreenElement)),
          focused: String(document.hasFocus()),
        },
      });

      const warning: CheatingWarning = {
        title,
        message: response.success && response.data
          ? response.data.warningMessage
          : 'Cheating behavior detected. This action has been recorded.',
        totalCount: response.data?.totalSessionEventCount,
        blocking: options?.blocking,
      };

      if (options?.deferUntilVisible && document.visibilityState === 'hidden') {
        pendingWarningRef.current = warning;
        return;
      }

      showCheatingWarning(warning);
    } catch (_error) {
      showCheatingWarning({
        title,
        message: 'Cheating behavior detected. The system will retry logging when possible.',
        blocking: options?.blocking,
      });
    }
  }, [proposalId, showCheatingWarning]);

  const dismissCheatingWarning = useCallback(() => {
    setCheatingWarning(null);
    if (!secureModeResumeRequired) {
      setContentShielded(false);
    }
    if (warningTimerRef.current !== null) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, [secureModeResumeRequired]);

  const handleStartSecureMode = useCallback(async () => {
    setError('');
    const fullscreenTarget = secureAreaRef.current ?? document.documentElement;

    try {
      if (fullscreenTarget.requestFullscreen) {
        await fullscreenTarget.requestFullscreen();
      }

      setSecureModeStarted(true);
      setSecureModeResumeRequired(false);
      setContentShielded(false);
      setCheatingWarning(null);
      fullscreenExitLoggedRef.current = false;
    } catch (_error) {
      setSecureModeStarted(true);
      setSecureModeResumeRequired(true);
      setContentShielded(true);
      showCheatingWarning({
        title: 'Fullscreen could not start',
        message: 'Your browser blocked fullscreen mode. Return to fullscreen to continue the secure session.',
        blocking: true,
      });
    }
  }, [showCheatingWarning]);

  useEffect(() => {
    if (!proposalId) {
      return undefined;
    }

    const flushPendingWarning = () => {
      if (pendingWarningRef.current === null) {
        return;
      }

      showCheatingWarning(pendingWarningRef.current);
      pendingWarningRef.current = null;
    };

    const clearClipboardBestEffort = () => {
      if (!navigator.clipboard?.writeText) {
        return;
      }

      void navigator.clipboard.writeText('').catch(() => undefined);
    };

    const handleCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      void logCheatingEvent(cheatingEventTypes.copy, 'Copy blocked');
    };

    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void logCheatingEvent(cheatingEventTypes.paste, 'Paste blocked');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setContentShielded(true);
        void logCheatingEvent(cheatingEventTypes.tabSwitch, 'Tab switch detected', {
          blocking: true,
          deferUntilVisible: true,
        });
        return;
      }

      flushPendingWarning();
    };

    const logFullscreenGuardEvent = (title: string) => {
      const now = Date.now();
      if (now - lastFullscreenGuardEventAtRef.current < 1500) {
        return;
      }

      lastFullscreenGuardEventAtRef.current = now;
      setContentShielded(true);
      if (!document.fullscreenElement) {
        setSecureModeResumeRequired(true);
      }

      void logCheatingEvent(cheatingEventTypes.fullscreenExit, title, {
        blocking: true,
      });
    };

    const handleGuardKey = (event: KeyboardEvent) => {
      if (event.key === 'PrintScreen') {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        if (now - lastScreenshotAttemptAtRef.current < 1500) {
          return;
        }

        lastScreenshotAttemptAtRef.current = now;
        setContentShielded(true);
        clearClipboardBestEffort();
        void logCheatingEvent(cheatingEventTypes.screenshotAttempt, 'Screenshot attempt detected', {
          blocking: true,
        });
        return;
      }

      if (event.key === 'Escape' && secureModeStarted) {
        event.preventDefault();
        event.stopPropagation();
        logFullscreenGuardEvent('Escape key detected in secure mode');
      }
    };

    const handleBeforePrint = (event: Event) => {
      event.preventDefault();
      setContentShielded(true);
      void logCheatingEvent(cheatingEventTypes.screenshotAttempt, 'Print or screenshot attempt detected', {
        blocking: true,
      });
    };

    const handleAfterPrint = () => {
      setContentShielded(false);
    };

    const handleBlur = () => {
      setContentShielded(true);
      if (focusLossActiveRef.current) {
        return;
      }

      focusLossActiveRef.current = true;
      void logCheatingEvent(cheatingEventTypes.focusLoss, 'Window focus lost', {
        blocking: true,
        deferUntilVisible: true,
      });
    };

    const handleFocus = () => {
      focusLossActiveRef.current = false;
      flushPendingWarning();
    };

    const handleFullscreenChange = () => {
      if (!secureModeStarted) {
        return;
      }

      if (document.fullscreenElement) {
        fullscreenExitLoggedRef.current = false;
        return;
      }

      setContentShielded(true);
      setSecureModeResumeRequired(true);
      if (fullscreenExitLoggedRef.current) {
        return;
      }

      fullscreenExitLoggedRef.current = true;
      logFullscreenGuardEvent('Fullscreen exited');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleGuardKey, true);
    document.addEventListener('keyup', handleGuardKey, true);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleGuardKey, true);
      document.removeEventListener('keyup', handleGuardKey, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [proposalId, logCheatingEvent, secureModeStarted, showCheatingWarning]);

  useEffect(() => {
    return () => {
      if (warningTimerRef.current !== null) {
        window.clearTimeout(warningTimerRef.current);
      }
    };
  }, []);

  const validate = (requireAllRequired: boolean) => {
    for (const question of sortedQuestions) {
      const value = answers[question.jobPostQuestionsId] || '';
      if (value.length > 4000) {
        return 'Answers must not exceed 4000 characters.';
      }
      if (requireAllRequired && question.isRequired && !value.trim()) {
        return `Answer is required for question ${question.orderIndex}.`;
      }
    }
    return '';
  };

  const saveAnswers = async (submit: boolean) => {
    const validationMessage = validate(submit);
    if (validationMessage) {
      setError(validationMessage);
      return false;
    }

    const payloadAnswers = sortedQuestions
      .filter(question => {
        if (submit) return true;
        return Boolean((answers[question.jobPostQuestionsId] || '').trim());
      })
      .map(question => ({
        jobPostQuestionId: question.jobPostQuestionsId,
        answerText: answers[question.jobPostQuestionsId] || '',
      }));

    if (payloadAnswers.length === 0) {
      return true;
    }

    const response = await proposalPatchAPI.updateBulkProposalAnswers(proposalId, {
      answers: payloadAnswers,
    });

    if (!response.success) {
      setError(response.message || 'Answers could not be saved.');
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    const saved = await saveAnswers(false);
    setSaving(false);
    if (saved) {
      navigate('/proposals');
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const saved = await saveAnswers(true);
    if (!saved) {
      setSaving(false);
      return;
    }

    const statusResponse = await proposalPatchAPI.updateProposalStatus(proposalId, {
      status: ProposalStatus.Pending,
    });

    setSaving(false);
    if (!statusResponse.success) {
      setError(statusResponse.message || 'Answers were saved, but proposal could not be submitted.');
      return;
    }

    if (statusResponse.data?.cheatingPenalty?.message) {
      alert(statusResponse.data.cheatingPenalty.message);
    }

    navigate('/proposals');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-16 text-center text-muted-foreground">Loading questions...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div ref={secureAreaRef} className="relative min-h-screen bg-background px-4 py-8">
        {secureModeStarted ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-2 gap-10 overflow-hidden opacity-[0.055] sm:grid-cols-3 lg:grid-cols-4">
            {watermarkTiles.map(tile => (
              <span
                key={tile}
                className="-rotate-12 select-none whitespace-nowrap text-xs font-bold uppercase text-red-500"
              >
                {tile}
              </span>
            ))}
          </div>
        ) : null}

        {contentShielded ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/95 px-4 text-center backdrop-blur-md">
            <div className="max-w-sm rounded-lg border border-red-500/30 bg-background p-5 shadow-xl">
              <ShieldAlert size={28} className="mx-auto text-red-500" />
              <p className="mt-3 text-base font-bold text-primary">Content hidden</p>
              <p className="mt-2 text-sm text-secondary">
                {secureModeResumeRequired
                  ? 'Secure fullscreen mode is required before you can continue.'
                  : 'Return to the secure session and acknowledge the warning to continue.'}
              </p>
              {secureModeResumeRequired ? (
                <button
                  type="button"
                  onClick={() => void handleStartSecureMode()}
                  className="btn-cyan mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Maximize2 size={16} />
                  <span>Resume Secure Mode</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!secureModeStarted ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 text-center shadow-2xl">
              <ShieldAlert size={32} className="mx-auto text-red-500" />
              <h2 className="mt-3 text-xl font-bold text-primary">Secure interview mode</h2>
              <p className="mt-2 text-sm text-secondary">
                Fullscreen monitoring is required while answering these questions.
              </p>
              <button
                type="button"
                onClick={() => void handleStartSecureMode()}
                className="btn-cyan mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Maximize2 size={16} />
                <span>Start Secure Mode</span>
              </button>
            </div>
          </div>
        ) : null}

        {cheatingWarning ? (
          cheatingWarning.blocking ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-lg border border-red-500/40 bg-background p-5 shadow-2xl">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-500">
                    <AlertTriangle size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-primary">{cheatingWarning.title}</p>
                    <p className="mt-2 text-sm text-secondary">{cheatingWarning.message}</p>
                    {cheatingWarning.totalCount !== undefined ? (
                      <p className="mt-3 text-xs font-semibold text-red-500">
                        Logged events in this session: {cheatingWarning.totalCount}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={secureModeResumeRequired ? () => void handleStartSecureMode() : dismissCheatingWarning}
                      className="mt-5 w-full rounded-lg border border-red-500 bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
                    >
                      {secureModeResumeRequired ? 'Resume Secure Mode' : 'I understand'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="fixed right-4 top-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-red-500/30 bg-background p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-red-500">
                <AlertTriangle size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-primary">{cheatingWarning.title}</p>
                  <button
                    type="button"
                    onClick={dismissCheatingWarning}
                    className="rounded border border-border bg-transparent p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss warning"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="mt-1 text-sm text-secondary">{cheatingWarning.message}</p>
                {cheatingWarning.totalCount !== undefined ? (
                  <p className="mt-2 text-xs font-semibold text-red-500">
                    Logged events in this session: {cheatingWarning.totalCount}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          )
        ) : null}

        <div className="relative z-20 max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="glass-card p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-primary">JobPost Questions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Save answers as draft or submit your proposal when required answers are complete.
              </p>
            </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {sortedQuestions.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              This JobPost has no questions.
            </div>
          ) : (
            <div className="space-y-5">
              {sortedQuestions.map(question => (
                <label key={question.jobPostQuestionsId} className="block">
                  <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                    <span>
                      {question.orderIndex}. {question.questionText}
                    </span>
                    {question.isRequired && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                        Required
                      </span>
                    )}
                  </span>
                  <textarea
                    rows={5}
                    value={answers[question.jobPostQuestionsId] || ''}
                    onFocus={() => {
                      activeQuestionIdRef.current = question.jobPostQuestionsId;
                    }}
                    onChange={event => setAnswers(prev => ({
                      ...prev,
                      [question.jobPostQuestionsId]: event.target.value,
                    }))}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                    placeholder="Write your answer..."
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {(answers[question.jobPostQuestionsId] || '').length}/4000 characters
                  </span>
                </label>
              ))}

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/20 disabled:opacity-60"
                >
                  <Save size={16} />
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="btn-cyan inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <Send size={16} />
                  Submit Proposal
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
