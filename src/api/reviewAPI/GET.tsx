import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { Review } from '../../types/models/Job';
import type {
  AdminReviewFilters,
  AdminReviewsResponse,
  MyReviewsResponse,
} from '../../types/models/ReviewManagement';

export const reviewGetAPI = {
  getReviewsByUser: async (userId: string): Promise<ApiResponse<Review[]>> => {
    return await apiService.get<Review[]>(`Reviews/user/${userId}`);
  },
  getMyReviews: async (
    direction: 'received' | 'sent',
    page = 1,
    pageSize = 10,
  ): Promise<ApiResponse<MyReviewsResponse>> =>
    apiService.get<MyReviewsResponse>('Reviews/my', { direction, page, pageSize }),
  getAdminReviews: async (params: AdminReviewFilters): Promise<ApiResponse<AdminReviewsResponse>> =>
    apiService.get<AdminReviewsResponse>('Reviews/admin', params),
};
