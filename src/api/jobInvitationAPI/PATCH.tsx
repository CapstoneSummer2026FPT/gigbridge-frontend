import { apiService } from '../../service/apiService';
import type { DeclineJobInvitationRequest, JobInvitationDto } from '../../types/jobInvitation';
import { unwrapJobInvitationResponse } from './utils';

const jobInvitationsUrl = 'JobInvitations';

const patchInvitation = async (
  invitationId: string,
  action: 'view' | 'apply' | 'cancel',
  message: string
): Promise<JobInvitationDto> => {
  const response = await apiService.patch<JobInvitationDto>(`${jobInvitationsUrl}/${invitationId}/${action}`);
  return unwrapJobInvitationResponse(response, {} as JobInvitationDto, message);
};

export const jobInvitationPatchAPI = {
  markViewed: async (invitationId: string): Promise<JobInvitationDto> => {
    return patchInvitation(invitationId, 'view', 'Job invitation could not be marked as viewed.');
  },

  markApplied: async (invitationId: string): Promise<JobInvitationDto> => {
    return patchInvitation(invitationId, 'apply', 'Job invitation could not be marked as applied.');
  },

  cancelInvitation: async (invitationId: string): Promise<JobInvitationDto> => {
    return patchInvitation(invitationId, 'cancel', 'Job invitation could not be cancelled.');
  },

  declineInvitation: async (
    invitationId: string,
    data: DeclineJobInvitationRequest = {}
  ): Promise<JobInvitationDto> => {
    const response = await apiService.patch<JobInvitationDto>(`${jobInvitationsUrl}/${invitationId}/decline`, data);
    return unwrapJobInvitationResponse(response, {} as JobInvitationDto, 'Job invitation could not be declined.');
  },
};
