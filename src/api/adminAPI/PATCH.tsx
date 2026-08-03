import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { AdminUserDto } from '../../types/models/User';
import type { AdminDisputeDetail } from '../../types/models/AdminDispute';
import type { DisputeStatus } from '../../types/models/Dispute';
import { normalizeAdminDisputeDetail } from './disputeUtils';
import type { AdminProposalDetail } from '../../types/models/AdminProposal';

const Admin_Api_Base_Url = '/admin';

export const adminPatchAPI = {
  invalidateProposal: (proposalId:string, payload:{reason:string;internalNote?:string}): Promise<ApiResponse<AdminProposalDetail>> => apiService.patch(`/Proposals/admin/${proposalId}/invalidate`,payload),
  restoreProposal: (proposalId:string, payload:{reason:string;internalNote?:string}): Promise<ApiResponse<AdminProposalDetail>> => apiService.patch(`/Proposals/admin/${proposalId}/restore`,payload),
  updateDisputeStatus: async (
    disputeId: string,
    status: DisputeStatus
  ): Promise<ApiResponse<AdminDisputeDetail>> => {
    const response = await apiService.patch<unknown>(
      `${Admin_Api_Base_Url}/disputes/${disputeId}/status`,
      { status }
    );
    return {
      ...response,
      data: response.data ? normalizeAdminDisputeDetail(response.data) : undefined,
    };
  },

  /**
   * PATCH /api/v1/admin/users/toggle-activity
   * Toggles the IsActive flag for the user with the given email.
   * - If the user was active (IsActive = true), they become inactive (banned).
   * - If the user was inactive (IsActive = false), they become active (unbanned).
   *
   * Returns true on success, false if the user was not found.
   */
  toggleUserActivity: async (email: string): Promise<ApiResponse<object>> => {
    return apiService.patch<object>(`${Admin_Api_Base_Url}/users/toggle-activity`, {
      email,
    });
  },

  clearUserSuspension: async (email: string): Promise<ApiResponse<AdminUserDto>> => {
    return apiService.patch<AdminUserDto>(`${Admin_Api_Base_Url}/users/clear-suspension`, {
      email,
    });
  },

  toggleFAQActivity: async (id: number): Promise<ApiResponse<object>> => {
    return apiService.patch<object>(`${Admin_Api_Base_Url}/faq/${id}/toggle-activity`);
  },

  toggleFAQCategoryActivity: async (id: number): Promise<ApiResponse<object>> => {
    return apiService.patch<object>(`${Admin_Api_Base_Url}/faq/categories/${id}/toggle-activity`);
  },

};
