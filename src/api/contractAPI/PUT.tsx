import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { UpdateContractDto, ContractDto, Milestone } from '../../types/models/Contract';

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
      }>;
    }
  ): Promise<ApiResponse<any>> => {
    return apiService.put<any>(`contracts/${contractId}/details`, data);
  },
};
