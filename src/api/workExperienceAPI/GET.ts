import { apiService } from '../../service/apiService';
import type { WorkExperienceDto } from '../../types/models/Profile';

export const workExperienceGetAPI = {
  getMyWorkExperiences: async () => {
    return await apiService.get<WorkExperienceDto[]>('work-experience/me');
  },

  getWorkExperiencesByUserId: async (userId: string) => {
    return await apiService.get<WorkExperienceDto[]>(`work-experience/user/${userId}`);
  },
};
