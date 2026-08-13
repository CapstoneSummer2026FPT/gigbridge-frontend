import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  Dispute,
  DisputeEvidenceDownload,
  DisputeRemainingJobPostPlan,
  MyDisputesResponse,
} from '../../types/models/Dispute';
import {
  normalizeDispute,
  normalizeDisputeRemainingJobPostPlan,
  normalizeEvidenceDownload,
  normalizeMyDisputesResponse,
} from './utils';

const baseUrl = (contractId: string) => `contracts/${contractId}/disputes`;

export const disputeGetAPI = {
  getMyDisputes: async (page = 1, pageSize = 20): Promise<ApiResponse<MyDisputesResponse>> => {
    const response = await apiService.get<unknown>('disputes/my', { page, pageSize });
    return {
      ...response,
      data: response.data ? normalizeMyDisputesResponse(response.data) : undefined,
    };
  },

  getActiveDispute: async (contractId: string): Promise<ApiResponse<Dispute | null>> => {
    const response = await apiService.get<unknown | null>(`${baseUrl(contractId)}/active`);
    return {
      ...response,
      data: response.data ? normalizeDispute(response.data) : null,
    };
  },

  getDisputeById: async (
    contractId: string,
    disputeId: string
  ): Promise<ApiResponse<Dispute>> => {
    const response = await apiService.get<unknown>(`${baseUrl(contractId)}/${disputeId}`);
    return {
      ...response,
      data: response.data ? normalizeDispute(response.data) : undefined,
    };
  },

  getRemainingJobPostPlan: async (
    disputeId: string
  ): Promise<ApiResponse<DisputeRemainingJobPostPlan>> => {
    const response = await apiService.get<unknown>(`disputes/${disputeId}/remaining-job-post-plan`);
    return {
      ...response,
      data: response.data ? normalizeDisputeRemainingJobPostPlan(response.data) : undefined,
    };
  },

  getEvidenceDownload: async (
    contractId: string,
    disputeId: string,
    evidenceId: string
  ): Promise<ApiResponse<DisputeEvidenceDownload>> => {
    const response = await apiService.get<unknown>(
      `${baseUrl(contractId)}/${disputeId}/evidence/${evidenceId}/download`
    );
    return {
      ...response,
      data: response.data ? normalizeEvidenceDownload(response.data) : undefined,
    };
  },
};
