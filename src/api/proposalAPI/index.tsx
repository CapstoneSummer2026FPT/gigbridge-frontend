export { proposalGetAPI } from './GET';
export { proposalPostAPI } from './POST';
export { proposalPutAPI } from './PUT';
export { proposalPatchAPI } from './PATCH';

import { proposalGetAPI } from './GET';
import { proposalPostAPI } from './POST';
import { proposalPutAPI } from './PUT';
import { proposalPatchAPI } from './PATCH';

export const proposalAPI = {
  getAllProposals: proposalGetAPI.getAllProposals,
  getMyProposals: proposalGetAPI.getMyProposals,
  getProposalsByJobPost: proposalGetAPI.getProposalsByJobPost,
  getProposalDetail: proposalGetAPI.getProposalDetail,
  getMyProposalByJobPost: proposalGetAPI.getMyProposalByJobPost,
  getProposalAnswers: proposalGetAPI.getProposalAnswers,
  createProposal: proposalPostAPI.createProposal,
  createProposalAnswer: proposalPostAPI.createProposalAnswer,
  acceptForNegotiation: proposalPostAPI.acceptForNegotiation,
  updateProposal: proposalPutAPI.updateProposal,
  updateProposalStatus: proposalPatchAPI.updateProposalStatus,
  updateProposalAnswer: proposalPatchAPI.updateProposalAnswer,
  updateBulkProposalAnswers: proposalPatchAPI.updateBulkProposalAnswers,
};
