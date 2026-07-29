import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { Review } from '../../types/models/Job';

export const reviewGetAPI = {
  getReviewsByUser: async (userId: string): Promise<ApiResponse<Review[]>> => {
    return await apiService.get<Review[]>(`Reviews/user/${userId}`);
  },
};
