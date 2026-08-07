import { apiService } from '../../service/apiService';
import type { PortfolioItemDto, PortfolioItemInputDto } from '../../types/models/Profile';

export type PortfolioCreatePayload = FormData | (PortfolioItemInputDto & { imageFile?: File });

export const portfolioPostAPI = {
  createPortfolioItem: async (data: PortfolioCreatePayload) => {
    let payload: FormData | PortfolioItemInputDto = data as any;
    if (!(data instanceof FormData)) {
      const formData = new FormData();
      if (data.title) formData.append('Title', data.title);
      if (data.description) formData.append('Description', data.description);
      if (data.projectUrl) formData.append('ProjectUrl', data.projectUrl);
      if (data.projectDate) formData.append('ProjectDate', data.projectDate);
      if (data.imageFile) formData.append('Image', data.imageFile);
      payload = formData;
    }
    return await apiService.post<PortfolioItemDto>('portfolio', payload);
  },
};
