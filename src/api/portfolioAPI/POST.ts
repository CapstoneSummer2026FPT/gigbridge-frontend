import { apiService } from '../../service/apiService';
import type { PortfolioItemDto, PortfolioItemInputDto } from '../../types/models/Profile';

export const portfolioPostAPI = {
  createPortfolioItem: async (dto: PortfolioItemInputDto) => {
    return await apiService.post<PortfolioItemDto>('portfolio', dto);
  },
};
