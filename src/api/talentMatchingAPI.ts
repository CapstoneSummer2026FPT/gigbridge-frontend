import { apiService } from '../service/apiService';
import type { ApiResponse } from '../types/common';
import type {
  AiTalentMatchingRequest,
  AiTalentMatchingResult,
  TalentMatchEventRequest,
} from '../types/talentMatching';

const jobPostsUrl = 'JobPosts';

export const talentMatchingAPI = {
  getMatches: (
    jobPostId: string,
    request: AiTalentMatchingRequest,
  ): Promise<ApiResponse<AiTalentMatchingResult>> =>
    apiService.post<AiTalentMatchingResult>(
      `${jobPostsUrl}/${jobPostId}/talent-matches/ai`,
      request,
    ),

  recordEvent: (
    jobPostId: string,
    request: TalentMatchEventRequest,
  ): Promise<ApiResponse<object>> =>
    apiService.post<object>(
      `${jobPostsUrl}/${jobPostId}/talent-matches/events`,
      request,
    ),
};
