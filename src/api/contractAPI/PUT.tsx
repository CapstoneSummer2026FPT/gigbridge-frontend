import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ContractWorkflowResponse,
  ContractWorkItem,
  UpdateContractDetailsRequest,
} from '../../types/models/Contract';

export const contractPutAPI = {
  /**
   * PUT /api/contracts/{contractId}/details
   */
  updateDetails: async (
    contractId: string,
    data: UpdateContractDetailsRequest,
  ): Promise<ApiResponse<ContractWorkflowResponse>> => {
    return apiService.put<ContractWorkflowResponse>(`contracts/${contractId}/details`, data);
  },

  updateWorkItem: async (
    contractId: string,
    milestoneId: string,
    workItemId: string,
    payload: { status: number; progressNote?: string | null },
  ): Promise<ApiResponse<ContractWorkItem>> =>
    apiService.patch<ContractWorkItem>(`contracts/${contractId}/milestones/${milestoneId}/work-items/${workItemId}`, payload),
};
