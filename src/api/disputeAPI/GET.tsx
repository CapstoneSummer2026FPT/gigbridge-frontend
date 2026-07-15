import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { Dispute, DisputeEvidenceDownload } from '../../types/models/Dispute';
import { normalizeDispute, normalizeEvidenceDownload } from './utils';

const baseUrl = (contractId: string) => `contracts/${contractId}/disputes`;

export const disputeGetAPI = {
  getContractDisputes: async (contractId: string): Promise<ApiResponse<Dispute[]>> => {
    const response = await apiService.get<unknown[]>(baseUrl(contractId));
    return {
      ...response,
      data: response.data?.map(normalizeDispute) ?? [],
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
