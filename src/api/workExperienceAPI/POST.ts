import { apiService } from '../../service/apiService';
import type { WorkExperienceDto, WorkExperienceInputDto } from '../../types/models/Profile';

export const workExperiencePostAPI = {
  createWorkExperience: async (dto: WorkExperienceInputDto) => {
    return await apiService.post<WorkExperienceDto>('work-experience', dto);
  },
};
