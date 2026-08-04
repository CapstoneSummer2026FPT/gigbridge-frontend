import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { DisputeEvidence } from '../../types/models/Dispute';
import { normalizeEvidence } from './utils';

const baseUrl = (contractId: string) => `contracts/${contractId}/disputes`;

export const disputePostAPI = {
  addEvidence: async (
    contractId: string,
    disputeId: string,
    files: File[],
    requestEvidenceId?: string,
  ): Promise<ApiResponse<DisputeEvidence[]>> => {
    const formData = new FormData();
    for (const file of files) formData.append('evidenceFiles', file);
    if (requestEvidenceId) formData.append('requestEvidenceId', requestEvidenceId);

    const response = await apiService.post<unknown[]>(
      `${baseUrl(contractId)}/${disputeId}/evidence`,
      formData,
    );
    return {
      ...response,
      data: response.data?.map(normalizeEvidence) ?? [],
    };
  },
};
