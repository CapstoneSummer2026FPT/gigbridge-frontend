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
   * User contracts list (client or freelancer) via conversation lookups
   */
  getMyContracts: async (
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    try {
      const convRes = await apiService.get<any[]>('conversations');
      if (!convRes.success || !convRes.data) {
        return { success: false, statusCode: convRes.statusCode, message: convRes.message, data: [] };
      }
      const uniqueJobPostIds = Array.from(new Set(
        convRes.data
          .filter(c => c.contractId || c.ContractId)
          .map(c => c.jobPostId || c.JobPostId)
      ));
      const contracts: ContractDto[] = [];
      for (const jobPostId of uniqueJobPostIds) {
        const contractRes = await apiService.get<any>(`${contractsUrl}/job/${jobPostId}`);
        if (contractRes.success && contractRes.data) {
          // Normalize to frontend ContractDto structure if needed
          const contract = contractRes.data;
          contracts.push({
            contractsId: contract.contractId || contract.contractsId,
            jobPostsId: contract.jobPostId || contract.jobPostsId,
            clientProfilesId: contract.clientProfileId || contract.clientProfilesId,
            freelancerProfilesId: contract.freelancerProfileId || contract.freelancerProfilesId,
            proposalsId: contract.proposalId || contract.proposalsId,
            title: contract.title,
            description: contract.description,
            totalBudget: contract.totalBudget,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            esignContractPdfUrl: contract.esignContractPdfUrl,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
          });
        }
      }
      return { success: true, statusCode: 200, message: 'Success', data: contracts };
    } catch (err: any) {
      return { success: false, statusCode: 500, message: err.message || 'Failed to retrieve user contracts', data: [] };
    }
  },

  /**
   * GET /api/Contracts/{id}
   * Get contract by ID via conversation lookups
   */
  getContractById: async (
    id: string
  ): Promise<ApiResponse<ContractDto>> => {
    try {
      const convRes = await apiService.get<any[]>('conversations');
      if (convRes.success && convRes.data) {
        const conversation = convRes.data.find(c => (c.contractId || c.ContractId) === id);
        const jobPostId = conversation?.jobPostId || conversation?.JobPostId;
        if (jobPostId) {
          const contractRes = await apiService.get<any>(`${contractsUrl}/job/${jobPostId}`);
          if (contractRes.success && contractRes.data) {
            const contract = contractRes.data;
            return {
              success: true,
              statusCode: 200,
              message: 'Success',
              data: {
                contractsId: contract.contractId || contract.contractsId,
                jobPostsId: contract.jobPostId || contract.jobPostsId,
                clientProfilesId: contract.clientProfileId || contract.clientProfilesId,
                freelancerProfilesId: contract.freelancerProfileId || contract.freelancerProfilesId,
                proposalsId: contract.proposalId || contract.proposalsId,
                title: contract.title,
                description: contract.description,
                totalBudget: contract.totalBudget,
                status: contract.status,
                startDate: contract.startDate,
                endDate: contract.endDate,
                esignContractPdfUrl: contract.esignContractPdfUrl,
                createdAt: contract.createdAt,
                updatedAt: contract.updatedAt,
              }
            };
          }
        }
      }
      return {
        success: false,
        statusCode: 404,
        message: 'Contract not found',
        data: undefined as any
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: err.message || 'Failed to get contract details',
        data: undefined as any
      };
    }
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
