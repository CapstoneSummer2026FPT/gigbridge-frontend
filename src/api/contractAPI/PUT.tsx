import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ContractWorkItem } from '../../types/models/Contract';

export const contractPutAPI = {
  /**
   * PUT /api/contracts/{contractId}/details
   */
  updateDetails: async (
    contractId: string,
    data: {
      milestones: Array<{
        milestoneId?: string | null;
        title: string;
        amount: number;
        dueDate?: string | null;
        sortOrder?: number | null;
        description?: string | null;
        estimatedDuration?: string | null;
        deliverables?: string | null;
        acceptanceCriteria?: string | null;
        workItems?: Array<{
          workItemId?: string | null;
          title: string;
          description?: string | null;
          deliverables?: string | null;
          estimatedDuration?: string | null;
          orderIndex: number;
        }>;
      }>;
    }
  ): Promise<ApiResponse<any>> => {
    return apiService.put<any>(`contracts/${contractId}/details`, data);
  },

  updateWorkItem: async (
    contractId: string,
    milestoneId: string,
    workItemId: string,
    payload: { status: number; progressNote?: string | null },
  ): Promise<ApiResponse<ContractWorkItem>> =>
    apiService.patch<ContractWorkItem>(`contracts/${contractId}/milestones/${milestoneId}/work-items/${workItemId}`, payload),
};
