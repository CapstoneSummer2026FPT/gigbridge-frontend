import type { ProposalViewModel } from '../../types/models/Proposal';

export type JobProposalGroup = {
  jobPostsId: string;
  jobTitle: string;
  proposals: ProposalViewModel[];
};

export type ProposalDetailMode = 'score' | 'cv' | 'detail';
export type ProposalStatusValue = 0 | 1 | 2 | 3 | 4 | 5;
export type ProposalStatusFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5';
export type ProposalSortBy = 'interviewScore' | 'status' | 'submittedAt' | 'rate';
