export { jobInvitationGetAPI } from './GET';
export { jobInvitationPostAPI } from './POST';
export { jobInvitationPatchAPI } from './PATCH';

import { jobInvitationGetAPI } from './GET';
import { jobInvitationPostAPI } from './POST';
import { jobInvitationPatchAPI } from './PATCH';

export const jobInvitationAPI = {
  getMySentInvitations: jobInvitationGetAPI.getMySentInvitations,
  getInvitationsForJob: jobInvitationGetAPI.getInvitationsForJob,
  getMyInvitations: jobInvitationGetAPI.getMyInvitations,
  createInvitation: jobInvitationPostAPI.createInvitation,
  bulkCreateInvitations: jobInvitationPostAPI.bulkCreateInvitations,
  markViewed: jobInvitationPatchAPI.markViewed,
  markApplied: jobInvitationPatchAPI.markApplied,
  declineInvitation: jobInvitationPatchAPI.declineInvitation,
  cancelInvitation: jobInvitationPatchAPI.cancelInvitation,
};
