import { apiService } from '../../service/apiService';

export const workExperienceDeleteAPI = {
  deleteWorkExperience: async (id: string) => {
    return await apiService.delete<boolean>(`work-experience/${id}`);
  },
};
