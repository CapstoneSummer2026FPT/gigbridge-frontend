import { apiService } from '../../service/apiService';
import type { JobInvitationDto, JobInvitationQueryParams } from '../../types/jobInvitation';
import { unwrapJobInvitationResponse } from './utils';

const jobInvitationsUrl = 'JobInvitations';

export const jobInvitationGetAPI = {
  getMySentInvitations: async (
    params: JobInvitationQueryParams = {}
  ): Promise<JobInvitationDto[]> => {
    const response = await apiService.get<JobInvitationDto[]>(`${jobInvitationsUrl}/my-sent`, params);
    return unwrapJobInvitationResponse(response, [], 'Sent job invitations could not be loaded.');
  },

  getInvitationsForJob: async (jobPostId: string): Promise<JobInvitationDto[]> => {
    const response = await apiService.get<JobInvitationDto[]>(`${jobInvitationsUrl}/job/${jobPostId}`);
    return unwrapJobInvitationResponse(response, [], 'Job invitations could not be loaded.');
  },

  getMyInvitations: async (
    params: Omit<JobInvitationQueryParams, 'jobPostId'> = {}
  ): Promise<JobInvitationDto[]> => {
    const response = await apiService.get<JobInvitationDto[]>(`${jobInvitationsUrl}/my-invitations`, params);
    return unwrapJobInvitationResponse(response, [], 'Job invitations could not be loaded.');
  },
};
