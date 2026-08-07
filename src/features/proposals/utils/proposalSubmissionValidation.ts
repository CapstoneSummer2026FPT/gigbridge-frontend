import type { ProposalDetailDto } from '../../../types/models/Proposal';

const PROPOSAL_NARRATIVE_MIN_LENGTH = 50;

type ProposalNarrative = Pick<
  ProposalDetailDto,
  'coverLetter' | 'analysisSummary' | 'solutionApproach'
>;

export const getProposalNarrativeValidationError = ({
  coverLetter,
  analysisSummary,
  solutionApproach,
}: ProposalNarrative): string => {
  if ((coverLetter || '').trim().length < PROPOSAL_NARRATIVE_MIN_LENGTH) {
    return `Introduction must be at least ${PROPOSAL_NARRATIVE_MIN_LENGTH} characters.`;
  }

  const approach = (analysisSummary || solutionApproach || '').trim();
  if (approach.length < PROPOSAL_NARRATIVE_MIN_LENGTH) {
    return `Your proposal approach must be at least ${PROPOSAL_NARRATIVE_MIN_LENGTH} characters.`;
  }

  return '';
};
