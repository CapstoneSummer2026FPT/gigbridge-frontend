import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  Save,
  ArrowRight,
  AlertTriangle,
  FileEdit,
  ChevronRight,
  Mic,
  Timer,
  RefreshCcw,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import {
  QuestionTimerLockedReason,
  type InterviewReviewSessionDto,
  type ProposalAnswerDto,
  type QuestionTimerStateDto,
} from '../../../types/models/Proposal';
import type { JobPostQuestionDto } from '../../../types/models/Job';
import { getProposalNarrativeValidationError } from '../utils/proposalSubmissionValidation';
import { getProposalQuestionsPath, getProposalReviewPath } from '../utils/proposalRoutes';
import { ProposalStepper } from '../components/ProposalStepper';
import { useTranslation } from '../../../hooks/useTranslation';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';

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

// ── Timer Ring Component ──────────────────────────────────────────────────────
function TimerRing({ seconds, maxSeconds = 180, size = 64 }: { seconds: number; maxSeconds?: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, seconds / maxSeconds));
  const strokeDashoffset = circumference * (1 - progress);
  const isLow = seconds <= 30;
  const isCritical = seconds <= 10;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90" style={{ overflow: 'visible' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={4}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isCritical ? '#ef4444' : isLow ? '#f59e0b' : 'var(--brand)'}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className={`relative z-10 text-xs font-black tabular-nums ${
        isCritical ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-brand'
      }`}>
        {formatRemainingTime(seconds)}
      </span>
    </div>
  );
}

// ── Intro Overlay ─────────────────────────────────────────────────────────────
function InterviewIntroOverlay({
  questionCount,
  proposalReadinessError,
  loadError,
  onBack,
  onStart,
  onEditProposal,
  onRetry,
}: {
  questionCount: number;
  proposalReadinessError: string;
  loadError: string;
  onBack: () => void;
  onStart: () => void;
  onEditProposal: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/95 backdrop-blur-xl px-4">
      <div className="relative w-full max-w-lg">
        {/* Card with thick mint & brand gradient border */}
        <div
          className="rounded-3xl p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
            border: '3px solid transparent',
          }}
        >
          {/* Icon with thick gradient border */}
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(var(--surface-muted), var(--surface-muted)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
              border: '2.5px solid transparent',
            }}
          >
            <Mic size={30} className="text-brand" />
          </div>

          <h1 className="text-center text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Phỏng vấn có tính giờ
          </h1>
          <p className="mt-2 text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Timed Interview Questions
          </p>

          {/* Info pills with thick gradient border */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div
              className="flex flex-col items-center gap-1.5 rounded-2xl p-4"
              style={{
                background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                border: '2px solid transparent',
              }}
            >
              <Timer size={20} className="text-brand" />
              <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>3 phút / câu</span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Per question</span>
            </div>
            <div
              className="flex flex-col items-center gap-1.5 rounded-2xl p-4"
              style={{
                background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                border: '2px solid transparent',
              }}
            >
              <FileEdit size={20} className="text-brand" />
              <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>{questionCount} câu hỏi</span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Questions</span>
            </div>
          </div>

          {/* Rule */}
          <p
            className="mt-5 rounded-xl px-4 py-3 text-xs font-medium leading-relaxed text-center"
            style={{
              background: 'var(--surface-muted)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Đồng hồ bắt đầu chạy sau khi bạn nhấn <strong>Bắt đầu phỏng vấn</strong>.
            Mỗi câu hỏi có đúng <strong>3 phút</strong>. Câu trả lời được lưu tự động khi hết giờ.
          </p>

          {/* Proposal readiness error */}
          {proposalReadinessError && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-rose-600">{proposalReadinessError}</p>
                <p className="mt-0.5 text-xs text-rose-500/80">Hãy cập nhật đề xuất trước khi bắt đầu phỏng vấn.</p>
              </div>
            </div>
          )}

          {/* Transient load error */}
          {loadError && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-rose-600">{loadError}</p>
                <p className="mt-0.5 text-xs text-rose-500/80">Vui lòng thử lại hoặc quay lại chỉnh sửa đề xuất.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all hover:bg-[var(--surface-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <ArrowLeft size={16} />
              Quay lại
            </button>
            {proposalReadinessError ? (
              <button
                type="button"
                onClick={onEditProposal}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--brand)' }}
              >
                <FileEdit size={16} />
                Sửa đề xuất
              </button>
            ) : loadError ? (
              <button
                type="button"
                onClick={onRetry}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--brand)' }}
              >
                <RefreshCcw size={16} />
                Thử lại
              </button>
            ) : (
              <button
                type="button"
                onClick={onStart}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  background: 'var(--brand)',
                  boxShadow: '0 6px 20px -4px rgba(73,75,231,0.35)',
                }}
              >
                <Play size={16} />
                Bắt đầu phỏng vấn
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScreenProposalAnswerQuestion() {
  const { t } = useTranslation();
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
  const [proposalReadinessError, setProposalReadinessError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const completingQuestionRef = useRef(false);
  const completingReviewRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      if (!jobPostId) {
        setError('Proposal or JobPost id is missing.');
        setLoading(false);
        return;
      }
      if (!proposalId) {
        // Refresh / deep-link recovery: locate the draft by job and restore the URL.
        const recovered = await proposalGetAPI.getMyProposalByJobPost(jobPostId);
        if (!recovered.success || !recovered.data) {
          setError(recovered.message || 'Proposal or JobPost id is missing.');
          setLoading(false);
          return;
        }
        navigate(getProposalQuestionsPath(jobPostId, recovered.data.proposalId), {
          replace: true,
          state: { proposalId: recovered.data.proposalId, jobPostId },
        });
        return;
      }
      try {
        setLoading(true);
        setError('');
        const [questionsResponse, answersResponse, proposalResponse] = await Promise.all([
          jobGetAPI.getJobPostQuestions(jobPostId),
          proposalGetAPI.getProposalAnswers(proposalId),
          proposalGetAPI.getProposalDetail(proposalId),
        ]);
        if (!questionsResponse.success) {
          setError(questionsResponse.message || 'Questions could not be loaded.');
          return;
        }
        if (!proposalResponse.success || !proposalResponse.data) {
          // Transient load failure (e.g. right after a network drop) — retry, don't block permanently.
          setError(proposalResponse.message || 'Proposal details could not be verified. Please try again.');
          return;
        }
        setProposalReadinessError(getProposalNarrativeValidationError(proposalResponse.data));
        const loadedQuestions = (questionsResponse.data || []).map(question => ({
          ...question,
          isRequired: question.isRequired ?? true,
        }));
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
  }, [jobPostId, navigate, proposalId, reloadKey]);

  const retryLoad = () => {
    setError('');
    setReloadKey((value) => value + 1);
  };

  const markQuestionLocked = useCallback((questionId: string) => {
    setLockedQuestionIds(prev => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  }, []);

  const startQuestionAtIndex = useCallback(async (startIndex: number) => {
    if (!proposalId || sortedQuestions.length === 0) return false;
    setTimerLoading(true);
    setError('');
    try {
      for (let index = startIndex; index < sortedQuestions.length; index += 1) {
        const question = sortedQuestions[index];
        if (lockedQuestionIds.has(question.jobPostQuestionsId)) continue;
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
        setTimeout(() => textareaRef.current?.focus(), 100);
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
    if (proposalReadinessError) { setError(proposalReadinessError); return; }
    setError('');
    setInterviewStarted(true);
    void startQuestionAtIndex(activeQuestionIndex);
  }, [activeQuestionIndex, proposalReadinessError, startQuestionAtIndex]);

  const completeQuestion = useCallback(async (reason: QuestionTimerLockedReason) => {
    if (!proposalId || !activeQuestion || completingQuestionRef.current) return false;
    const answerText = answers[activeQuestion.jobPostQuestionsId] || '';
    if (answerText.length > 4000) { setError('Answers must not exceed 4000 characters.'); return false; }
    if (reason === QuestionTimerLockedReason.Completed && activeQuestion.isRequired && !answerText.trim()) {
      setError(`Answer is required for question ${activeQuestion.orderIndex}.`);
      return false;
    }
    completingQuestionRef.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await proposalPostAPI.completeQuestionTimer(proposalId, activeQuestion.jobPostQuestionsId, { answerText, lockedReason: reason });
      if (!response.success || !response.data) { setError(response.message || 'Question could not be completed.'); return false; }
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
    if (!proposalId || reviewSession || reviewLoading) return;
    setReviewLoading(true);
    setError('');
    try {
      const response = await proposalPostAPI.startInterviewReview(proposalId);
      if (!response.success || !response.data) { setError(response.message || 'Interview review could not be started.'); return; }
      setReviewSession(response.data);
      setReviewRemainingSeconds(response.data.remainingSeconds);
    } finally { setReviewLoading(false); }
  }, [proposalId, reviewLoading, reviewSession]);

  const completeInterviewReview = useCallback(async () => {
    if (!proposalId || completingReviewRef.current || !reviewSession || reviewSession.isLocked) return true;
    completingReviewRef.current = true;
    try {
      const response = await proposalPostAPI.completeInterviewReview(proposalId);
      if (!response.success || !response.data) { setError(response.message || 'Interview review could not be completed.'); return false; }
      setReviewSession(response.data);
      setReviewRemainingSeconds(0);
      return true;
    } finally { completingReviewRef.current = false; }
  }, [proposalId, reviewSession]);

  const saveReviewAnswers = useCallback(async () => {
    if (!proposalId || !reviewSession || reviewSession.isLocked) return true;
    const payloadAnswers = reviewableQuestions.map(question => ({
      jobPostQuestionId: question.jobPostQuestionsId,
      answerText: answers[question.jobPostQuestionsId] || '',
    }));
    for (const question of reviewableQuestions) {
      const answerText = answers[question.jobPostQuestionsId] || '';
      if (answerText.length > 4000) { setError('Answers must not exceed 4000 characters.'); return false; }
      if (question.isRequired && !answerText.trim()) { setError(`Answer is required for question ${question.orderIndex}.`); return false; }
    }
    if (payloadAnswers.length === 0) return true;
    const response = await proposalPatchAPI.updateBulkProposalAnswers(proposalId, { answers: payloadAnswers });
    if (!response.success) { setError(response.message || 'Review answers could not be saved.'); return false; }
    return true;
  }, [answers, proposalId, reviewSession, reviewableQuestions]);

  useEffect(() => {
    if (!interviewStarted || !isReviewMode || reviewSession || reviewLoading) return;
    void startInterviewReview();
  }, [interviewStarted, isReviewMode, reviewLoading, reviewSession, startInterviewReview]);

  useEffect(() => {
    if (!interviewStarted || !timerState || timerState.isLocked || !activeQuestion) return undefined;
    const tick = () => {
      const expiresAt = new Date(timerState.expiresAt).getTime();
      const nextRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);
      if (nextRemaining <= 0 && !completingQuestionRef.current) void completeQuestion(QuestionTimerLockedReason.Timeout);
    };
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeQuestion, completeQuestion, interviewStarted, timerState]);

  useEffect(() => {
    if (!interviewStarted || !reviewSession || reviewSession.isLocked) return undefined;
    const tick = () => {
      const expiresAt = new Date(reviewSession.expiresAt).getTime();
      const nextRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setReviewRemainingSeconds(nextRemaining);
      if (nextRemaining <= 0 && !completingReviewRef.current) void completeInterviewReview();
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
        if (answerText.length > 4000) { setError('Answers must not exceed 4000 characters.'); return; }
        if (answerText.trim()) {
          const response = await proposalPatchAPI.updateBulkProposalAnswers(proposalId, {
            answers: [{ jobPostQuestionId: activeQuestion.jobPostQuestionsId, answerText }],
          });
          if (!response.success) { setError(response.message || 'Answers could not be saved.'); return; }
        }
      }
      navigate('/proposals');
    } finally { setSaving(false); }
  };

  // Step 2 -> step 3. Any last edits made during the review window are saved, then the review
  // session is closed so the answers become read-only for the review & submit step.
  const handleContinueToReview = async () => {
    if (proposalReadinessError) { setError(proposalReadinessError); return; }
    if (!allQuestionsLocked) { setError('Complete or time out all questions before continuing.'); return; }
    if (!reviewSession) { setError('Interview review is still starting. Please wait a moment.'); return; }
    setSaving(true);
    setError('');
    if (isReviewEditable) {
      const reviewSaved = await saveReviewAnswers();
      if (!reviewSaved) { setSaving(false); return; }
    }
    const reviewCompleted = await completeInterviewReview();
    setSaving(false);
    if (!reviewCompleted) return;
    navigate(getProposalReviewPath(proposalId), { replace: true });
  };

  // Derived
  const displaySeconds = isReviewMode ? reviewRemainingSeconds : remainingSeconds;
  const isUrgent = displaySeconds <= 30 && displaySeconds > 0;
  const isCritical = displaySeconds <= 10 && displaySeconds > 0;
  const charCount = activeQuestion ? (answers[activeQuestion.jobPostQuestionsId] || '').length : 0;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout hideTopNav hideAIWidget showSidebar={false} excludeMeshGradient>
        <div className="flex min-h-screen items-center justify-center">
          <LemniscateBloomLoader label="Đang tải câu hỏi..." tag="Phỏng vấn" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideTopNav hideAIWidget showSidebar={false} excludeMeshGradient>
      {/* Intro overlay */}
      {!interviewStarted && (
        <InterviewIntroOverlay
          questionCount={sortedQuestions.length}
          proposalReadinessError={proposalReadinessError}
          loadError={error}
          onBack={() => navigate(-1)}
          onStart={handleStartInterview}
          onEditProposal={() => navigate(`/proposals/${proposalId}/edit`)}
          onRetry={retryLoad}
        />
      )}

      {/* Full-screen exam layout */}
      <div
        className="relative flex min-h-screen flex-col overflow-hidden"
        style={{ background: 'var(--background)' }}
      >
        {/* Ambient gradient bubbles background */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-20 blur-[120px]"
            style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full opacity-25 blur-[140px]"
            style={{ background: 'radial-gradient(circle, var(--mint) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full opacity-15 blur-[120px]"
            style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)' }}
          />
        </div>

        {/* ── Top chrome bar ───────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-40 grid grid-cols-3 items-center gap-4 px-4 py-3 sm:px-6"
          style={{
            background: 'color-mix(in srgb, var(--background) 85%, transparent)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0 justify-start">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-[var(--surface-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
                {isReviewMode ? 'Kiểm tra lại · Review' : 'Phỏng vấn · Interview'}
              </p>
              <h1 className="truncate text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                {isReviewMode
                  ? 'Kiểm tra lại câu trả lời'
                  : timerLoading
                    ? 'Đang chuẩn bị câu hỏi...'
                    : activeQuestion
                      ? `Câu ${activeQuestionIndex + 1} / ${sortedQuestions.length}`
                      : 'Hoàn thành'}
              </h1>
            </div>
          </div>

          {/* Center: step dots (strictly centered in grid) */}
          <div className="hidden sm:flex items-center justify-center gap-1.5">
            {sortedQuestions.map((q, idx) => {
              const done = lockedQuestionIds.has(q.jobPostQuestionsId);
              const active = idx === activeQuestionIndex && !isReviewMode;
              return (
                <div
                  key={q.jobPostQuestionsId}
                  className="rounded-full transition-all"
                  style={{
                    width: active ? 22 : 8,
                    height: 8,
                    background: done
                      ? 'var(--brand)'
                      : active
                        ? 'linear-gradient(90deg, var(--brand), var(--mint))'
                        : 'var(--border)',
                  }}
                />
              );
            })}
          </div>

          {/* Right: timer ring */}
          <div className="flex items-center justify-end">
            <div className={`transition-all ${isCritical ? 'animate-pulse' : ''}`}>
              <TimerRing seconds={displaySeconds} maxSeconds={isReviewMode ? (reviewSession?.remainingSeconds || 300) : 180} size={64} />
            </div>
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-5">

            <ProposalStepper currentStep={2} />

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-sm font-semibold text-rose-600">{error}</p>
              </div>
            )}

            {/* ── REVIEW MODE ──────────────────────────────────────────────── */}
            {isReviewMode ? (
              <div className="space-y-4">
                {/* Review header card with thick gradient border */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                    border: '2.5px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>
                        Kiểm tra lại câu trả lời
                      </p>
                      <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Xem lại và chỉnh sửa câu trả lời trước khi sang bước xem lại đề xuất
                      </p>
                    </div>
                    <div
                      className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                      style={{
                        background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                        border: '1.5px solid transparent',
                      }}
                    >
                      <Clock size={13} className="text-brand" />
                      <span className="text-xs font-bold" style={{ color: 'var(--brand)' }}>
                        {reviewLoading
                          ? 'Đang bắt đầu...'
                          : reviewSession?.isLocked
                            ? 'Đã đóng'
                            : formatRemainingTime(reviewRemainingSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {reviewableQuestions.length === 0 ? (
                  <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)' }}>
                    <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
                    <p className="mt-3 text-lg font-black" style={{ color: 'var(--text-primary)' }}>Không có câu nào cần kiểm tra</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Bạn có thể sang bước xem lại đề xuất.</p>
                  </div>
                ) : (
                  reviewableQuestions.map((question, idx) => (
                    <div
                      key={question.jobPostQuestionsId}
                      className="rounded-2xl p-5 space-y-3"
                      style={{
                        background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                        border: '2px solid transparent',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                          <span className="mr-1.5 text-brand">{idx + 1}.</span>
                          {question.questionText}
                        </p>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          question.isRequired ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--surface-muted)] text-[var(--text-muted)]'
                        }`}>
                          {t(question.isRequired ? 'proposalQuestions.required' : 'proposalQuestions.optional')}
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        value={answers[question.jobPostQuestionsId] || ''}
                        disabled={!isReviewEditable || saving}
                        onChange={event => setAnswers(prev => ({ ...prev, [question.jobPostQuestionsId]: event.target.value }))}
                        className="w-full rounded-xl border p-3 text-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="Xem lại câu trả lời..."
                      />
                      <p className="text-right text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {(answers[question.jobPostQuestionsId] || '').length}/4000
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* ── QUESTION MODE ─────────────────────────────────────────────── */
              sortedQuestions.length === 0 ? (
                <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Không có câu hỏi nào.</p>
                </div>
              ) : activeQuestion && (
                <div className="space-y-4">
                  {/* Question card with thick mint & brand gradient border */}
                  <div
                    className="rounded-2xl p-6 shadow-sm"
                    style={
                      isUrgent
                        ? {
                            background: 'var(--background)',
                            border: `2.5px solid ${isCritical ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)'}`,
                            transition: 'border-color 0.3s ease',
                          }
                        : {
                            background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                            border: '2.5px solid transparent',
                            transition: 'border-color 0.3s ease',
                          }
                    }
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white"
                          style={{ background: 'var(--brand)' }}
                        >
                          {activeQuestionIndex + 1}
                        </span>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                          / {sortedQuestions.length} câu hỏi
                        </span>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        activeQuestion.isRequired ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-[var(--surface-muted)] text-[var(--text-muted)] border border-slate-500/20'
                      }`}>
                        {activeQuestion.isRequired ? t('proposalQuestions.required', 'Bắt buộc') : t('proposalQuestions.optional', 'Tùy chọn')}
                      </span>
                    </div>

                    <p className="text-base font-bold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {activeQuestion.questionText}
                    </p>

                    {activeQuestion.isRequired && !(answers[activeQuestion.jobPostQuestionsId] || '').trim() && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-600">
                        <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                        <span>{t('aiInterview.errors.questionRequired', 'Câu hỏi này là bắt buộc. Vui lòng trả lời trước khi chuyển tiếp.')}</span>
                      </div>
                    )}
                  </div>

                  {/* Answer textarea */}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Câu trả lời của bạn
                      </span>
                      <span className={`text-[11px] font-bold tabular-nums ${charCount > 3800 ? 'text-rose-500' : ''}`}
                        style={{ color: charCount > 3800 ? undefined : 'var(--text-muted)' }}>
                        {charCount}/4000
                      </span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      rows={10}
                      value={answers[activeQuestion.jobPostQuestionsId] || ''}
                      disabled={!interviewStarted || timerLoading || saving}
                      onChange={event => setAnswers(prev => ({ ...prev, [activeQuestion.jobPostQuestionsId]: event.target.value }))}
                      className="w-full resize-none border-none bg-transparent p-4 text-sm leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ color: 'var(--text-primary)' }}
                      placeholder={timerLoading ? t('aiInterview.interviewer.states.preparing', 'Đang chuẩn bị câu hỏi...') : t('proposalQuestions.placeholder', 'Viết câu trả lời của bạn tại đây...')}
                    />
                  </div>

                  {/* Timer hint */}
                  {isUrgent && (
                    <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${
                      isCritical ? 'border border-rose-500/30 bg-rose-500/10' : 'border border-amber-500/30 bg-amber-500/10'
                    }`}>
                      <Timer size={14} className={isCritical ? 'text-rose-500' : 'text-amber-500'} />
                      <p className={`text-xs font-bold ${isCritical ? 'text-rose-600' : 'text-amber-600'}`}>
                        {isCritical
                          ? t('aiInterview.timer.critical', 'Hết giờ ngay bây giờ! Câu trả lời sẽ được lưu tự động.')
                          : t('aiInterview.timer.warning', 'Còn ít thời gian. Hoàn thành câu trả lời của bạn.')}
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </main>

        {/* ── Sticky bottom bar ─────────────────────────────────────────────── */}
        <footer
          className="sticky bottom-0 z-40 px-4 py-3 sm:px-6"
          style={{
            background: 'color-mix(in srgb, var(--background) 88%, transparent)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            {/* Left status / action */}
            <div className="flex items-center gap-2 min-w-0">
              {!interviewStarted ? (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--background)' }}
                >
                  <Save size={15} />
                  Lưu nháp
                </button>
              ) : (
                <span className="text-xs font-bold text-text-muted truncate">
                  {isReviewMode ? 'Chế độ xem lại' : `Đang trả lời câu ${activeQuestionIndex + 1}/${sortedQuestions.length}`}
                </span>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Continue question (shown during active questions) */}
              {!allQuestionsLocked && activeQuestion && (
                <button
                  type="button"
                  onClick={() => void completeQuestion(QuestionTimerLockedReason.Completed)}
                  disabled={saving || timerLoading || !interviewStarted}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: 'var(--brand)',
                    boxShadow: '0 6px 20px -4px rgba(73,75,231,0.35)',
                  }}
                >
                  <span>
                    {!activeQuestion.isRequired && !(answers[activeQuestion.jobPostQuestionsId] || '').trim()
                      ? t('proposalQuestions.skipAndContinue')
                      : t('proposalQuestions.continueInterview')}
                  </span>
                  <ChevronRight size={16} />
                </button>
              )}

              {/* Submit Proposal (shown ONLY when all questions are completed/locked) */}
              {allQuestionsLocked && (
                <button
                  type="button"
                  onClick={handleContinueToReview}
                  disabled={saving || (isReviewMode && !reviewSession)}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--brand)',
                    boxShadow: '0 6px 20px -4px rgba(73,75,231,0.35)',
                  }}
                >
                  {saving ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <ArrowRight size={15} />
                  )}
                  <span>{t('proposalStepper.goToReview')}</span>
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
