import { AlertTriangle, MessageSquareText, RefreshCcw, SkipForward, TimerOff } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ProposalInterviewAnswer } from '../hooks/useProposalInterviewAnswers';

interface ProposalInterviewAnswerListProps {
  answers: ProposalInterviewAnswer[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

const STATE_STYLES: Record<ProposalInterviewAnswer['state'], string> = {
  answered: 'bg-emerald-500/10 text-emerald-600',
  timedOut: 'bg-amber-500/10 text-amber-600',
  skipped: 'bg-surface-muted text-text-muted border border-border',
};

/**
 * Step 2 recap on the review screen. Answers are locked once their question timer closes, so
 * this view is strictly read-only — no textarea and no edit affordance.
 */
export function ProposalInterviewAnswerList({ answers, loading, error, onRetry }: ProposalInterviewAnswerListProps) {
  const { t } = useTranslation(['proposals', 'common']);

  if (loading) {
    return (
      <p className="text-xs font-semibold text-text-muted">{t('proposalSubmitReview.loadingAnswers')}</p>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            <RefreshCcw size={13} /> {t('proposalSubmitReview.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (answers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <MessageSquareText size={28} className="mx-auto text-text-muted" />
        <p className="mt-3 text-sm font-bold text-text-primary">{t('proposalSubmitReview.noQuestionsTitle')}</p>
        <p className="mt-1 text-xs font-medium text-text-muted">{t('proposalSubmitReview.noQuestionsBody')}</p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {answers.map((answer, index) => (
        <li key={answer.jobPostQuestionsId} className="cps-answer-card">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-bold leading-relaxed text-text-primary">
              <span className="mr-1.5 text-brand">{index + 1}.</span>
              {answer.questionText}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`cps-answer-tag ${answer.isRequired ? 'bg-rose-500/10 text-rose-500' : 'bg-surface text-text-muted border border-border'}`}>
                {t(answer.isRequired ? 'proposalQuestions.required' : 'proposalQuestions.optional')}
              </span>
              <span className={`cps-answer-tag inline-flex items-center gap-1 ${STATE_STYLES[answer.state]}`}>
                {answer.state === 'timedOut' && <TimerOff size={11} />}
                {answer.state === 'skipped' && <SkipForward size={11} />}
                {t(`proposalSubmitReview.answerState.${answer.state}`)}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <span className="cps-readonly-label">{t('proposalSubmitReview.yourAnswer')}</span>
            {answer.state === 'answered' ? (
              <div className="cps-readonly-block">{answer.answerText}</div>
            ) : (
              <p className="text-xs font-semibold text-text-muted">
                {t(`proposalSubmitReview.answerEmpty.${answer.state}`)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
