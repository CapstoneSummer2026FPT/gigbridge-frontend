import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { FAQCategoryDto, FAQDto } from '../../types/models/FAQ';

const faqAPI = '/faq';
export const faqGetAPI = {
  getFAQs: async (categoryId?: number): Promise<ApiResponse<FAQDto[]>> => {
    return apiService.get<FAQDto[]>(`${faqAPI}`, categoryId ? { categoryId } : {});
  },

  getCategories: async (): Promise<ApiResponse<FAQCategoryDto[]>> => {
    return apiService.get<FAQCategoryDto[]>(`${faqAPI}/categories`);
  },
};
