import { apiService } from '../../service/apiService';
import type {
  BulkCreateJobInvitationsRequest,
  BulkJobInvitationResultDto,
} from '../../types/jobInvitation';
import { unwrapJobInvitationResponse } from './utils';

const jobInvitationsUrl = 'JobInvitations';

export const jobInvitationPostAPI = {
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
