import type { JobPostQuestionDto } from '../../../types/models/Job';
import {
  getProposalAiInterviewPath,
  getProposalQuestionsPath,
  getProposalReviewPath,
} from './proposalRoutes';

/**
 * Where step 1 ("Proposal details") hands the freelancer next once the draft is saved.
 * The AI interview and the timed manual questions both replace step 2; a job post with
 * neither goes straight to step 3, where the proposal is finally submitted.
 */
export type ProposalContinueTarget =
  | { step: 'aiInterview'; path: string }
  | { step: 'questions'; path: string }
  | { step: 'review'; path: string };

export interface ProposalContinueInput {
  jobPostId: string;
  proposalId: string;
  hasAiInterview: boolean;
  manualQuestionCount: number;
}

export const resolveProposalContinueTarget = ({
  jobPostId,
  proposalId,
  hasAiInterview,
  manualQuestionCount,
}: ProposalContinueInput): ProposalContinueTarget => {
  if (hasAiInterview) {
    return { step: 'aiInterview', path: getProposalAiInterviewPath(jobPostId, proposalId) };
  }

  if (manualQuestionCount > 0) {
    return { step: 'questions', path: getProposalQuestionsPath(jobPostId, proposalId) };
  }

  return { step: 'review', path: getProposalReviewPath(proposalId) };
};

/**
 * A locked answer is read-only on step 3. Required questions can only end up empty by
 * timing out, while an optional question may also have been skipped deliberately.
 */
export type ProposalAnswerState = 'answered' | 'timedOut' | 'skipped';

export const resolveProposalAnswerState = (
  question: Pick<JobPostQuestionDto, 'isRequired'>,
  answerText?: string | null,
): ProposalAnswerState => {
  if ((answerText || '').trim().length > 0) return 'answered';
  return question.isRequired ? 'timedOut' : 'skipped';
};
