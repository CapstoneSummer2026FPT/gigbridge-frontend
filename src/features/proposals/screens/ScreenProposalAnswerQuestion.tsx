import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Clock3, Play, Save, Send } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import {
  ProposalStatus,
  QuestionTimerLockedReason,
  type InterviewReviewSessionDto,
  type ProposalAnswerDto,
  type QuestionTimerStateDto,
} from '../../../types/models/Proposal';
import type { JobPostQuestionDto } from '../../../types/models/Job';

type AnswerRouteState = {
  proposalId?: string;
  jobPostId?: string;
};

const formatRemainingTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainingSeconds = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

export default function ScreenProposalAnswerQuestion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostId: routeJobPostId } = useParams<{ jobPostId: string }>();
  const routeState = (location.state || {}) as AnswerRouteState;
  const search = new URLSearchParams(location.search);

  const proposalId = routeState.proposalId || search.get('proposalId') || '';
  const jobPostId = routeState.jobPostId || routeJobPostId || '';

  const [questions, setQuestions] = useState<JobPostQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<string>>(() => new Set());
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [timerState, setTimerState] = useState<QuestionTimerStateDto | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(180);
  const [reviewSession, setReviewSession] = useState<InterviewReviewSessionDto | null>(null);
  const [reviewRemainingSeconds, setReviewRemainingSeconds] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timerLoading, setTimerLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviewStarted, setInterviewStarted] = useState(false);
  const completingQuestionRef = useRef(false);
  const completingReviewRef = useRef(false);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.orderIndex - b.orderIndex),
    [questions]
  );

  const activeQuestion = sortedQuestions[activeQuestionIndex] || null;
  const allQuestionsLocked = sortedQuestions.length > 0 && sortedQuestions.every(
    question => lockedQuestionIds.has(question.jobPostQuestionsId)
  );
  const reviewableQuestionIdSet = useMemo(
    () => new Set(reviewSession?.reviewableQuestionIds || []),
    [reviewSession?.reviewableQuestionIds]
  );
  const reviewableQuestions = useMemo(
    () => sortedQuestions.filter(question => reviewableQuestionIdSet.has(question.jobPostQuestionsId)),
    [reviewableQuestionIdSet, sortedQuestions]
  );
  const isReviewMode = allQuestionsLocked && sortedQuestions.length > 0;
  const isReviewEditable = Boolean(reviewSession && !reviewSession.isLocked && reviewRemainingSeconds > 0);

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

  const markQuestionLocked = useCallback((questionId: string) => {
    setLockedQuestionIds(prev => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  }, []);

  const startQuestionAtIndex = useCallback(async (startIndex: number) => {
    if (!proposalId || sortedQuestions.length === 0) {
      return false;
    }

    setTimerLoading(true);
    setError('');
    try {
      for (let index = startIndex; index < sortedQuestions.length; index += 1) {
        const question = sortedQuestions[index];
        if (lockedQuestionIds.has(question.jobPostQuestionsId)) {
          continue;
        }

        setActiveQuestionIndex(index);
        const response = await proposalPostAPI.startQuestionTimer(proposalId, question.jobPostQuestionsId);
        if (!response.success || !response.data) {
          setError(response.message || 'Question timer could not be started.');
          return false;
        }

        setTimerState(response.data);
        setRemainingSeconds(response.data.remainingSeconds);
        if (response.data.isLocked) {
          markQuestionLocked(question.jobPostQuestionsId);
          continue;
        }

        return true;
      }

      setTimerState(null);
      setRemainingSeconds(0);
      setActiveQuestionIndex(sortedQuestions.length);
      return false;
    } finally {
      setTimerLoading(false);
    }
  }, [lockedQuestionIds, markQuestionLocked, proposalId, sortedQuestions]);

  const handleStartInterview = useCallback(() => {
    setError('');
    setInterviewStarted(true);
    void startQuestionAtIndex(activeQuestionIndex);
  }, [activeQuestionIndex, startQuestionAtIndex]);

  const completeQuestion = useCallback(async (reason: QuestionTimerLockedReason) => {
    if (!proposalId || !activeQuestion || completingQuestionRef.current) {
      return false;
    }

    const answerText = answers[activeQuestion.jobPostQuestionsId] || '';
    if (answerText.length > 4000) {
      setError('Answers must not exceed 4000 characters.');
      return false;
    }

    if (reason === QuestionTimerLockedReason.Completed && activeQuestion.isRequired && !answerText.trim()) {
      setError(`Answer is required for question ${activeQuestion.orderIndex}.`);
      return false;
    }

    completingQuestionRef.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await proposalPostAPI.completeQuestionTimer(
        proposalId,
        activeQuestion.jobPostQuestionsId,
        {
          answerText,
          lockedReason: reason,
        }
      );

      if (!response.success || !response.data) {
        setError(response.message || 'Question could not be completed.');
        return false;
      }

      markQuestionLocked(activeQuestion.jobPostQuestionsId);
      setTimerState(response.data);
      setRemainingSeconds(0);
      await startQuestionAtIndex(activeQuestionIndex + 1);
      return true;
    } finally {
      completingQuestionRef.current = false;
      setSaving(false);
    }
  }, [activeQuestion, activeQuestionIndex, answers, markQuestionLocked, proposalId, startQuestionAtIndex]);

  const startInterviewReview = useCallback(async () => {
    if (!proposalId || reviewSession || reviewLoading) {
      return;
    }

    setReviewLoading(true);
    setError('');
    try {
      const response = await proposalPostAPI.startInterviewReview(proposalId);
      if (!response.success || !response.data) {
        setError(response.message || 'Interview review could not be started.');
        return;
      }

      setReviewSession(response.data);
      setReviewRemainingSeconds(response.data.remainingSeconds);
    } finally {
      setReviewLoading(false);
    }
  }, [proposalId, reviewLoading, reviewSession]);

  const completeInterviewReview = useCallback(async () => {
    if (!proposalId || completingReviewRef.current || !reviewSession || reviewSession.isLocked) {
      return true;
    }

    completingReviewRef.current = true;
    try {
      const response = await proposalPostAPI.completeInterviewReview(proposalId);
      if (!response.success || !response.data) {
        setError(response.message || 'Interview review could not be completed.');
        return false;
      }

      setReviewSession(response.data);
      setReviewRemainingSeconds(0);
      return true;
    } finally {
      completingReviewRef.current = false;
    }
  }, [proposalId, reviewSession]);

  const saveReviewAnswers = useCallback(async () => {
    if (!proposalId || !reviewSession || reviewSession.isLocked) {
      return true;
    }

    const payloadAnswers = reviewableQuestions.map(question => ({
      jobPostQuestionId: question.jobPostQuestionsId,
      answerText: answers[question.jobPostQuestionsId] || '',
    }));

    for (const question of reviewableQuestions) {
      const answerText = answers[question.jobPostQuestionsId] || '';
      if (answerText.length > 4000) {
        setError('Answers must not exceed 4000 characters.');
        return false;
      }

      if (question.isRequired && !answerText.trim()) {
        setError(`Answer is required for question ${question.orderIndex}.`);
        return false;
      }
    }

    if (payloadAnswers.length === 0) {
      return true;
    }

    const response = await proposalPatchAPI.updateBulkProposalAnswers(proposalId, {
      answers: payloadAnswers,
    });

    if (!response.success) {
      setError(response.message || 'Review answers could not be saved.');
      return false;
    }

    return true;
  }, [answers, proposalId, reviewSession, reviewableQuestions]);

  useEffect(() => {
    if (!interviewStarted || !isReviewMode || reviewSession || reviewLoading) {
      return;
    }

    void startInterviewReview();
  }, [interviewStarted, isReviewMode, reviewLoading, reviewSession, startInterviewReview]);

  useEffect(() => {
    if (!interviewStarted || !timerState || timerState.isLocked || !activeQuestion) {
      return undefined;
    }

    const tick = () => {
      const expiresAt = new Date(timerState.expiresAt).getTime();
      const nextRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0 && !completingQuestionRef.current) {
        void completeQuestion(QuestionTimerLockedReason.Timeout);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeQuestion, completeQuestion, interviewStarted, timerState]);

  useEffect(() => {
    if (!interviewStarted || !reviewSession || reviewSession.isLocked) {
      return undefined;
    }

    const tick = () => {
      const expiresAt = new Date(reviewSession.expiresAt).getTime();
      const nextRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setReviewRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0 && !completingReviewRef.current) {
        void completeInterviewReview();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [completeInterviewReview, interviewStarted, reviewSession]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      if (activeQuestion && !lockedQuestionIds.has(activeQuestion.jobPostQuestionsId)) {
        const answerText = answers[activeQuestion.jobPostQuestionsId] || '';
        if (answerText.length > 4000) {
          setError('Answers must not exceed 4000 characters.');
          return;
        }

        if (answerText.trim()) {
          const response = await proposalPatchAPI.updateBulkProposalAnswers(proposalId, {
            answers: [{ jobPostQuestionId: activeQuestion.jobPostQuestionsId, answerText }],
          });

          if (!response.success) {
            setError(response.message || 'Answers could not be saved.');
            return;
          }
        }
      }

      navigate('/proposals');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!allQuestionsLocked) {
      setError('Complete or time out all questions before submitting.');
      return;
    }

    if (!reviewSession) {
      setError('Interview review is still starting. Please wait a moment.');
      return;
    }

    setSaving(true);
    setError('');
    if (isReviewEditable) {
      const reviewSaved = await saveReviewAnswers();
      if (!reviewSaved) {
        setSaving(false);
        return;
      }
    }

    const reviewCompleted = await completeInterviewReview();
    if (!reviewCompleted) {
      setSaving(false);
      return;
    }

    const statusResponse = await proposalPatchAPI.updateProposalStatus(proposalId, {
      status: ProposalStatus.Pending,
    });

    setSaving(false);
    if (!statusResponse.success) {
      setError(statusResponse.message || 'Proposal could not be submitted.');
      return;
    }

    navigate('/proposals', { state: { submittedProposalId: proposalId } });
  };

  if (loading) {
    return (
      <AppLayout hideTopNav hideAIWidget excludeMeshGradient>
        <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">
          Loading questions...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideTopNav hideAIWidget excludeMeshGradient>
      <div className="relative h-screen overflow-y-auto bg-background px-4 py-6 pb-28 sm:py-8">
        {!interviewStarted ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 text-center shadow-2xl">
              <Clock3 size={32} className="mx-auto text-[var(--gb-cyan)]" />
              <h2 className="mt-3 text-xl font-bold text-primary">Timed interview questions</h2>
              <p className="mt-2 text-sm text-secondary">
                Each question has a three-minute answer window. The timer starts only after you continue.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStartInterview}
                  className="btn-cyan inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <Play size={16} />
                  Start interview
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative z-20 max-w-4xl mx-auto">
          {!interviewStarted ? (
            <button
              onClick={() => navigate(-1)}
              className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : null}

          <div className="glass-card overflow-visible p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">JobPost Questions</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isReviewMode
                    ? 'Review answered questions before submitting your proposal.'
                    : 'Each question has a strict 3-minute answer window.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground">
                <Clock3
                  size={16}
                  className={(isReviewMode ? reviewRemainingSeconds : remainingSeconds) <= 30 ? 'text-red-500' : 'text-[var(--gb-cyan)]'}
                />
                <span className={(isReviewMode ? reviewRemainingSeconds : remainingSeconds) <= 30 ? 'text-red-500' : ''}>
                  {formatRemainingTime(isReviewMode ? reviewRemainingSeconds : remainingSeconds)}
                </span>
              </div>
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
            ) : isReviewMode ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm">
                  <span className="font-bold text-foreground">
                    Review answers
                  </span>
                  <span className="text-muted-foreground">
                    {reviewLoading
                      ? 'Starting review...'
                      : reviewSession?.isLocked
                        ? 'Review closed'
                        : `Review time left ${formatRemainingTime(reviewRemainingSeconds)}`}
                  </span>
                </div>

                {reviewableQuestions.length === 0 ? (
                  <div className="rounded-lg border border-border bg-background p-6 text-center">
                    <CheckCircle2 size={30} className="mx-auto text-emerald-500" />
                    <p className="mt-3 text-base font-bold text-primary">No answers available for review</p>
                    <p className="mt-1 text-sm text-muted-foreground">You can submit your proposal now.</p>
                  </div>
                ) : (
                  reviewableQuestions.map(question => (
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
                        disabled={!isReviewEditable || saving}
                        onChange={event => setAnswers(prev => ({
                          ...prev,
                          [question.jobPostQuestionsId]: event.target.value,
                        }))}
                        className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Review your answer..."
                      />
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {(answers[question.jobPostQuestionsId] || '').length}/4000 characters
                      </span>
                    </label>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm">
                  <span className="font-bold text-foreground">
                    Question {activeQuestionIndex + 1} of {sortedQuestions.length}
                  </span>
                  <span className="text-muted-foreground">
                    {timerLoading ? 'Starting timer...' : `Time left ${formatRemainingTime(remainingSeconds)}`}
                  </span>
                </div>

                <label className="block">
                  <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                    <span>
                      {activeQuestion.orderIndex}. {activeQuestion.questionText}
                    </span>
                    {activeQuestion.isRequired && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                        Required
                      </span>
                    )}
                  </span>
                  <textarea
                    rows={7}
                    value={answers[activeQuestion.jobPostQuestionsId] || ''}
                    disabled={!interviewStarted || timerLoading || saving}
                    onChange={event => setAnswers(prev => ({
                      ...prev,
                      [activeQuestion.jobPostQuestionsId]: event.target.value,
                    }))}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)] disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Write your answer..."
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {(answers[activeQuestion.jobPostQuestionsId] || '').length}/4000 characters
                  </span>
                </label>
              </div>
            )}

            <div className="sticky bottom-0 z-30 -mx-6 mt-6 flex flex-wrap justify-end gap-3 border-t border-border bg-background/95 px-6 py-4 shadow-[0_-16px_32px_rgba(0,0,0,0.08)] backdrop-blur-md">
              {!interviewStarted ? (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/20 disabled:opacity-60"
                >
                  <Save size={16} />
                  Save as Draft
                </button>
              ) : null}
              {!allQuestionsLocked && activeQuestion ? (
                <button
                  type="button"
                  onClick={() => void completeQuestion(QuestionTimerLockedReason.Completed)}
                  disabled={saving || timerLoading || !interviewStarted}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/20 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  Continue Interview
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !allQuestionsLocked || (isReviewMode && !reviewSession)}
                className="btn-cyan inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60"
              >
                <Send size={16} />
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
