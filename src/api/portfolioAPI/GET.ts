import { apiService } from '../../service/apiService';
import type { PortfolioItemDto } from '../../types/models/Profile';

export const portfolioGetAPI = {
  getMyPortfolio: async () => {
    return await apiService.get<PortfolioItemDto[]>('portfolio/me');
  },

  getPortfolioByUserId: async (userId: string) => {
    return await apiService.get<PortfolioItemDto[]>(`portfolio/user/${userId}`);
  },
};
