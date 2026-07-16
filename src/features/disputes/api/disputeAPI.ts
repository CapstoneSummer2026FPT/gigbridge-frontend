import { apiService } from '../../../service/apiService';
import type { ApiResponse } from '../../../types/common';
import type { AdminDispute, Dispute } from '../types';

export const disputeAPI = {
  create: (request: { contractId: string; milestoneId?: string | null; reason: string }): Promise<ApiResponse<Dispute>> =>
    apiService.post('disputes', request),

  getAdminDisputes: (): Promise<ApiResponse<AdminDispute[]>> =>
    apiService.get('admin/disputes'),

  getAdminDispute: (disputeId: string): Promise<ApiResponse<AdminDispute>> =>
    apiService.get(`admin/disputes/${disputeId}`),

  resolve: (disputeId: string, resolution: number, resolutionNote: string): Promise<ApiResponse<AdminDispute>> =>
    apiService.patch(`admin/disputes/${disputeId}/resolve`, { resolution, resolutionNote }),
};
