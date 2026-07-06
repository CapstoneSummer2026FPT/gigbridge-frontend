import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { NegotiationMilestoneDto } from '../../types/models/Message';

export interface UpdateNegotiationMilestonePlanRequest {
  milestones: NegotiationMilestoneDto[];
}

export const messagePutAPI = {
  updateNegotiationMilestonePlan: async (
    conversationId: string,
    payload: UpdateNegotiationMilestonePlanRequest
  ): Promise<ApiResponse<NegotiationMilestoneDto[]>> =>
    apiService.put<NegotiationMilestoneDto[]>(
      `negotiation-offers/conversations/${conversationId}/milestone-plan`,
      payload
    ),
};
