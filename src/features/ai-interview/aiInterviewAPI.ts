import { apiService } from '../../service/apiService';

export interface AiInterviewRequirement {
  required: boolean;
  completed: boolean;
  inProgress: boolean;
  interviewDefinitionId?: string | null;
}

export const aiInterviewAPI = {
  requirement: (jobPostId: string) =>
    apiService.get<AiInterviewRequirement>(`ai-interviews/requirement/${jobPostId}`),
};
