import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateReviewRequest, Review } from '../../types/models/Job';

export const reviewPostAPI = {
  createReview: async (data: CreateReviewRequest): Promise<ApiResponse<Review>> => {
    return await apiService.post<Review>('Reviews', data);
  },
};
