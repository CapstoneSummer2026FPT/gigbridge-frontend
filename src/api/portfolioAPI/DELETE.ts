import { apiService } from '../../service/apiService';

export const portfolioDeleteAPI = {
  deletePortfolioItem: async (id: string) => {
    return await apiService.delete<boolean>(`portfolio/${id}`);
  },
};
