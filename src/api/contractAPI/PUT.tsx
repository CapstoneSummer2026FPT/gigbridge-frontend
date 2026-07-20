import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { UpdateContractDto, ContractDto, ContractWorkItem, Milestone } from '../../types/models/Contract';

const contractsUrl = 'Contracts';
const milestonesUrl = 'Milestones';

export const contractPutAPI = {
  /**
   * PUT /api/Contracts/{id}
   * Update contract details
   */
  updateContract: async (
    id: string,
    data: UpdateContractDto
  ): Promise<ApiResponse<ContractDto>> => {
    return apiService.put<ContractDto>(`${contractsUrl}/${id}`, data);
  },

  /**
   * PUT /api/Contracts/{contractId}/status
   * Update contract status
   */
  updateContractStatus: async (
    contractId: string,
    status: number
  ): Promise<ApiResponse<ContractDto>> => {
    return apiService.put<ContractDto>(`${contractsUrl}/${contractId}/status`, { status });
  },

  /**
   * PUT /api/Milestones/{milestoneId}/status
   * Update milestone status
   */
  updateMilestoneStatus: async (
    milestoneId: string,
    status: number
  ): Promise<ApiResponse<Milestone>> => {
    return apiService.put<Milestone>(`${milestonesUrl}/${milestoneId}/status`, { status });
  },

  /**
   * PUT /api/Milestones/{milestoneId}
   * Update milestone details
   */
  updateMilestone: async (
    milestoneId: string,
    data: Partial<Milestone>
  ): Promise<ApiResponse<Milestone>> => {
    return apiService.put<Milestone>(`${milestonesUrl}/${milestoneId}`, data);
  },
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
