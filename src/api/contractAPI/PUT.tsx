import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  UpdateContractDetailsRequest,
  UpdateContractDto,
  ContractDto,
  Milestone,
} from '../../types/models/Contract';

export const contractPutAPI = {
  /**
   * PUT /api/Contracts/{id}
   * Update contract details
   */
  updateContract: async (
    _id: string,
    _data: UpdateContractDto
  ): Promise<ApiResponse<ContractDto>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'General contract updates are not exposed by the current backend contract API. Use updateDetails for contract terms.',
      data: undefined,
    };
  },

  /**
   * PUT /api/Contracts/{contractId}/status
   * Update contract status
   */
  updateContractStatus: async (
    _contractId: string,
    _status: number
  ): Promise<ApiResponse<ContractDto>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Contract status updates are handled by workflow endpoints in the current backend API.',
      data: undefined,
    };
  },

  /**
   * PUT /api/Milestones/{milestoneId}/status
   * Update milestone status
   */
  updateMilestoneStatus: async (
    _milestoneId: string,
    _status: number
  ): Promise<ApiResponse<Milestone>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Milestone status updates require contract workflow endpoints in the current backend API.',
      data: undefined,
    };
  },

  /**
   * PUT /api/Milestones/{milestoneId}
   * Update milestone details
   */
  updateMilestone: async (
    _milestoneId: string,
    _data: Partial<Milestone>
  ): Promise<ApiResponse<Milestone>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Direct milestone updates are not exposed by the current backend contract API.',
      data: undefined,
    };
  },

  /**
   * PUT /api/contracts/{contractId}/details
   */
  updateDetails: async (
    contractId: string,
    data: UpdateContractDetailsRequest
  ): Promise<ApiResponse<any>> => {
    return apiService.put<any>(`contracts/${contractId}/details`, data);
  },
};
