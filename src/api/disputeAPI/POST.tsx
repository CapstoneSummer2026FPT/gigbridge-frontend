import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateDisputeInput, Dispute } from '../../types/models/Dispute';
import { normalizeDispute } from './utils';

export const disputePostAPI = {
  createDispute: async (input: CreateDisputeInput): Promise<ApiResponse<Dispute>> => {
    const formData = new FormData();
    formData.append('reason', input.reason);
    if (input.milestoneId) formData.append('milestoneId', input.milestoneId);
    if (input.evidence) formData.append('evidence', input.evidence);
    if (input.evidenceDescription?.trim()) {
      formData.append('evidenceDescription', input.evidenceDescription.trim());
    }

    const response = await apiService.post<unknown>(
      `contracts/${input.contractId}/disputes`,
      formData
    );
    return {
      ...response,
      data: response.data ? normalizeDispute(response.data) : undefined,
    };
  },
};
