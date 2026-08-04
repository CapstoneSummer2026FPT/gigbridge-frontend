import { apiService } from '../service/apiService';
import type { PortfolioItemDto, PortfolioItemInputDto } from '../types/models/Profile';

export const portfolioAPI = {
  getMyPortfolio: async () => {
    return await apiService.get<PortfolioItemDto[]>('portfolio/me');
  },

  getPortfolioByUserId: async (userId: string) => {
    return await apiService.get<PortfolioItemDto[]>(`portfolio/user/${userId}`);
  },

  createPortfolioItem: async (dto: PortfolioItemInputDto) => {
    return await apiService.post<PortfolioItemDto>('portfolio', dto);
  },

  updatePortfolioItem: async (id: string, dto: PortfolioItemInputDto) => {
    return await apiService.put<PortfolioItemDto>(`portfolio/${id}`, dto);
  },

  deletePortfolioItem: async (id: string) => {
    return await apiService.delete<boolean>(`portfolio/${id}`);
  },
};
