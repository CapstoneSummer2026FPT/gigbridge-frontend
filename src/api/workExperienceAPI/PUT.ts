import { apiService } from '../../service/apiService';
import type { WorkExperienceDto, WorkExperienceInputDto } from '../../types/models/Profile';

export const workExperiencePutAPI = {
  updateWorkExperience: async (id: string, dto: WorkExperienceInputDto) => {
    return await apiService.put<WorkExperienceDto>(`work-experience/${id}`, dto);
  },
};
