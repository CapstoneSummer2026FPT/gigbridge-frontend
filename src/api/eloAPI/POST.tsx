import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateEloAppealPayload, EloAppeal, EloAppealEvidence } from '../../types/elo';

export const eloPostAPI = {
  /**
   * POST /api/elo/appeals (multipart) — file an appeal against an Elo transaction.
   * Up to 5 files, 100MB each (backend enforces limits).
   */
  createEloAppeal: async (payload: CreateEloAppealPayload): Promise<ApiResponse<EloAppeal>> => {
    const formData = new FormData();
    formData.append('transactionId', payload.transactionId);
    formData.append('reason', payload.reason);
    for (const file of payload.files ?? []) {
      formData.append('files', file);
    }
    return apiService.post<EloAppeal>('elo/appeals', formData);
  },

  /** POST /api/elo/appeals/{appealId}/evidence — append evidence while Pending. */
  uploadEloAppealEvidence: async (appealId: string, files: File[]): Promise<ApiResponse<EloAppealEvidence[]>> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return apiService.post<EloAppealEvidence[]>(`elo/appeals/${appealId}/evidence`, formData);
  },

  /** POST /api/elo/appeals/{appealId}/cancel — withdraw a Pending appeal. */
  cancelEloAppeal: (appealId: string): Promise<ApiResponse<EloAppeal>> =>
    apiService.post<EloAppeal>(`elo/appeals/${appealId}/cancel`),
};
