import { jobInvitationGetAPI } from './GET';
import { jobInvitationPostAPI } from './POST';
import { jobInvitationPatchAPI } from './PATCH';

export const jobInvitationAPI = {
  getMySentInvitations: jobInvitationGetAPI.getMySentInvitations,
  getMyInvitations: jobInvitationGetAPI.getMyInvitations,
  bulkCreateInvitations: jobInvitationPostAPI.bulkCreateInvitations,
  markViewed: jobInvitationPatchAPI.markViewed,
  markApplied: jobInvitationPatchAPI.markApplied,
  declineInvitation: jobInvitationPatchAPI.declineInvitation,
};
