import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ContractDto, ContractQueryParams, Milestone, MilestoneAttachment } from '../../types/models/Contract';

const contractsUrl = 'Contracts';
const milestonesUrl = 'Milestones';

export const contractGetAPI = {
  /**
   * GET /api/Contracts/all
   * Admin-only contracts list with filters
   */
  getAllContracts: async (
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return apiService.get<ContractDto[]>(`${contractsUrl}/all`, params);
  },

  /**
   * GET /api/Contracts/my-contracts
   * User contracts list (client or freelancer)
   */
  getMyContracts: async (
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return apiService.get<ContractDto[]>(`${contractsUrl}/my-contracts`, params);
  },

  /**
   * GET /api/Contracts/{id}
   * Get contract by ID
   */
  getContractById: async (
    id: string
  ): Promise<ApiResponse<ContractDto>> => {
    return apiService.get<ContractDto>(`${contractsUrl}/${id}`);
  },

  /**
   * GET /api/Contracts/by-proposal/{proposalId}
   * Get contract by proposal ID
   */
  getContractByProposal: async (
    proposalId: string
  ): Promise<ApiResponse<ContractDto>> => {
    return apiService.get<ContractDto>(`${contractsUrl}/by-proposal/${proposalId}`);
  },

  /**
   * GET /api/Contracts/client/{clientId}
   * Get client contracts
   */
  getClientContracts: async (
    clientId: string,
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return apiService.get<ContractDto[]>(`${contractsUrl}/client/${clientId}`, params);
  },

  /**
   * GET /api/Contracts/freelancer/{freelancerId}
   * Get freelancer contracts
   */
  getFreelancerContracts: async (
    freelancerId: string,
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return apiService.get<ContractDto[]>(`${contractsUrl}/freelancer/${freelancerId}`, params);
  },

  /**
   * GET /api/Milestones/{milestoneId}
   * Get milestone details by ID
   */
  getMilestoneById: async (
    milestoneId: string
  ): Promise<ApiResponse<Milestone>> => {
    return apiService.get<Milestone>(`${milestonesUrl}/${milestoneId}`);
  },

  /**
   * GET /api/Milestones/contract/{contractId}
   * Get all milestones for a contract
   */
  getMilestonesByContract: async (
    contractId: string
  ): Promise<ApiResponse<Milestone[]>> => {
    return apiService.get<Milestone[]>(`${milestonesUrl}/contract/${contractId}`);
  },

  /**
   * GET /api/Milestones/{milestoneId}/attachments
   * Get milestone attachments
   */
  getMilestoneAttachments: async (
    milestoneId: string
  ): Promise<ApiResponse<MilestoneAttachment[]>> => {
    return apiService.get<MilestoneAttachment[]>(`${milestonesUrl}/${milestoneId}/attachments`);
  },
};
