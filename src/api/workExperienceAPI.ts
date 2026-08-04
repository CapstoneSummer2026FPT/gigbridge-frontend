import { apiService } from '../service/apiService';
import type { WorkExperienceDto, WorkExperienceInputDto } from '../types/models/Profile';

export const workExperienceAPI = {
  getMyWorkExperiences: async () => {
    return await apiService.get<WorkExperienceDto[]>('work-experience/me');
  },

  getWorkExperiencesByUserId: async (userId: string) => {
    return await apiService.get<WorkExperienceDto[]>(`work-experience/user/${userId}`);
  },

  createWorkExperience: async (dto: WorkExperienceInputDto) => {
    return await apiService.post<WorkExperienceDto>('work-experience', dto);
  },

  updateWorkExperience: async (id: string, dto: WorkExperienceInputDto) => {
    return await apiService.put<WorkExperienceDto>(`work-experience/${id}`, dto);
  },

  deleteWorkExperience: async (id: string) => {
    return await apiService.delete<boolean>(`work-experience/${id}`);
  },
};
