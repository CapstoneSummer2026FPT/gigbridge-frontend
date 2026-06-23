import { apiService } from '../../service/apiService';
import type {
  BulkCreateJobInvitationsRequest,
  BulkJobInvitationResultDto,
  CreateJobInvitationRequest,
  JobInvitationDto,
} from '../../types/jobInvitation';
import { unwrapJobInvitationResponse } from './utils';

const jobInvitationsUrl = 'JobInvitations';

export const jobInvitationPostAPI = {
  createInvitation: async (data: CreateJobInvitationRequest): Promise<JobInvitationDto> => {
    const response = await apiService.post<JobInvitationDto>(jobInvitationsUrl, data);
    return unwrapJobInvitationResponse(response, {} as JobInvitationDto, 'Job invitation could not be sent.');
  },

  bulkCreateInvitations: async (
    data: BulkCreateJobInvitationsRequest
  ): Promise<BulkJobInvitationResultDto> => {
    const response = await apiService.post<BulkJobInvitationResultDto>(`${jobInvitationsUrl}/bulk`, data);
    return unwrapJobInvitationResponse(
      response,
      { created: [], skipped: [] },
      'Job invitations could not be sent.'
    );
  },
};
