import { apiService } from '../../service/apiService';
import type { PortfolioItemDto, PortfolioItemInputDto } from '../../types/models/Profile';

export type PortfolioUpdatePayload = FormData | (PortfolioItemInputDto & { imageFile?: File; removeImage?: boolean });

export const portfolioPutAPI = {
  updatePortfolioItem: async (id: string, data: PortfolioUpdatePayload) => {
    let payload: FormData | PortfolioItemInputDto = data as any;
    if (!(data instanceof FormData)) {
      const formData = new FormData();
      if (data.title) formData.append('Title', data.title);
      if (data.description) formData.append('Description', data.description);
      if (data.projectUrl) formData.append('ProjectUrl', data.projectUrl);
      if (data.projectDate) formData.append('ProjectDate', data.projectDate);
      if (data.imageFile) formData.append('Image', data.imageFile);
      if (data.removeImage !== undefined) formData.append('RemoveImage', String(data.removeImage));
      payload = formData;
    }
    return await apiService.put<PortfolioItemDto>(`portfolio/${id}`, payload);
  },
};
