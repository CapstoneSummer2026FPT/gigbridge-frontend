import type { ProposalDto } from '../../types/models/Proposal';
import { ProposalStatus } from '../../types/models/Proposal';

export type ProposalAttachmentViewModel = {
  propoAttach_ProposalAttachmentsId: string;
  propo_ProposalsId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
};

export type ProposalViewModel = ProposalDto & {
  updatedAt?: string;
  isAIGenerated?: boolean;
  interviewScore?: number;
  rankingScore?: number;
  attachments?: ProposalAttachmentViewModel[];
};

export type JobProposalGroup = {
  jobPostsId: string;
  jobTitle: string;
  proposals: ProposalViewModel[];
};

export type ProposalDetailMode = 'score' | 'cv' | 'detail';
export type ProposalStatusValue = ProposalStatus;
export type ProposalStatusFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5';
export type ProposalSortBy = 'interviewScore' | 'status' | 'submittedAt' | 'rate';
