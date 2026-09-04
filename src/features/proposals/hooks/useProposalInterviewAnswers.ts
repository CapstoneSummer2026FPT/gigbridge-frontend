import { useCallback, useEffect, useMemo, useState } from 'react';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import type { JobPostQuestionDto } from '../../../types/models/Job';
import type { ProposalAnswerDto } from '../../../types/models/Proposal';
import { resolveProposalAnswerState, type ProposalAnswerState } from '../utils/proposalFlow';
import { useTranslation } from '../../../hooks/useTranslation';

export interface ProposalInterviewAnswer {
  jobPostQuestionsId: string;
  questionText: string;
  orderIndex: number;
  isRequired: boolean;
  answerText: string;
  state: ProposalAnswerState;
}

export interface UseProposalInterviewAnswersResult {
  answers: ProposalInterviewAnswer[];
  loading: boolean;
  error: string;
  reload: () => void;
}

/**
 * Read-only interview transcript for the proposal review step. The questions and their locked
 * answers already exist behind the job-post and proposal endpoints, so no new API is needed.
 */
export function useProposalInterviewAnswers(
  proposalId: string,
  jobPostId: string,
): UseProposalInterviewAnswersResult {
  const { t } = useTranslation(['proposals', 'common']);
  const [questions, setQuestions] = useState<JobPostQuestionDto[]>([]);
  const [answerRows, setAnswerRows] = useState<ProposalAnswerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setError('');
    setReloadKey(key => key + 1);
  }, []);

  useEffect(() => {
    if (!proposalId || !jobPostId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const [questionsResponse, answersResponse] = await Promise.all([
        jobGetAPI.getJobPostQuestions(jobPostId),
        proposalGetAPI.getProposalAnswers(proposalId),
      ]);
      if (cancelled) return;

      if (!questionsResponse.success) {
        setError(questionsResponse.message || t('proposalSubmitReview.errLoadAnswers'));
        setLoading(false);
        return;
      }
      setQuestions(questionsResponse.data || []);
      // An unanswered question simply has no row; that is not a load failure.
      setAnswerRows(answersResponse.success ? (answersResponse.data || []) : []);
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [jobPostId, proposalId, reloadKey, t]);

  const answers = useMemo<ProposalInterviewAnswer[]>(() => {
    const answerByQuestionId = new Map(answerRows.map(row => [row.jobPostQuestionsId, row.answerText || '']));

    return [...questions]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map(question => {
        const answerText = answerByQuestionId.get(question.jobPostQuestionsId) || '';
        return {
          jobPostQuestionsId: question.jobPostQuestionsId,
          questionText: question.questionText,
          orderIndex: question.orderIndex,
          isRequired: question.isRequired ?? true,
          answerText,
          state: resolveProposalAnswerState({ isRequired: question.isRequired ?? true }, answerText),
        };
      });
  }, [answerRows, questions]);

  return { answers, loading, error, reload };
}
