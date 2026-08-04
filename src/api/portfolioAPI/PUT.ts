import { apiService } from '../../service/apiService';
import type { PortfolioItemDto, PortfolioItemInputDto } from '../../types/models/Profile';

export const portfolioPutAPI = {
  updatePortfolioItem: async (id: string, dto: PortfolioItemInputDto) => {
    return await apiService.put<PortfolioItemDto>(`portfolio/${id}`, dto);
  },
};
