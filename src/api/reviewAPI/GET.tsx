import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { Review, ReviewStats } from '../../types/models/Job';

export const reviewGetAPI = {
  getReviewsByUser: async (userId: string): Promise<ApiResponse<Review[]>> => {
    return await apiService.get<Review[]>(`Reviews/user/${userId}`);
  },

  getReviewStats: async (userId: string): Promise<ApiResponse<ReviewStats>> => {
    return await apiService.get<ReviewStats>(`Reviews/user/${userId}/stats`);
  },
};
