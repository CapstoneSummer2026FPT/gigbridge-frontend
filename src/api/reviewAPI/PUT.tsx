import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ManagedReview, ReviewModerationStatus } from '../../types/models/ReviewManagement';

export const reviewPutAPI = {
  moderateReview: (
    reviewId: string,
    status: ReviewModerationStatus,
    note: string,
  ): Promise<ApiResponse<ManagedReview>> =>
    apiService.put<ManagedReview>(`Reviews/admin/${reviewId}/moderation`, { status, note }),
};
