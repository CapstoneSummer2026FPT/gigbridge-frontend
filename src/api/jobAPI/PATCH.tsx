import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
    JobPostQuestionDto,
    UpdateBulkJobPostQuestionsRequest,
    UpdateJobPostQuestionRequest,
    UpdateJobPostQuestionRequiredRequest,
    UpdateJobPostStatusRequest,
    UpdateJobPostVisibilityRequest,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobPatchAPI = {
    /**
     * PATCH /api/JobPosts/{jobPostId}/questions/{questionId}
     */
    updateJobPostQuestion: async (
        jobPostId: string,
        questionId: string,
        data: UpdateJobPostQuestionRequest
    ): Promise<ApiResponse<JobPostQuestionDto>> => {
        return apiService.patch<JobPostQuestionDto>(`${jobPostsUrl}/${jobPostId}/questions/${questionId}`, data);
    },

    /**
     * PATCH /api/JobPosts/{jobPostId}/questions/{questionId}/required
     */
    updateJobPostQuestionRequired: async (
        jobPostId: string,
        questionId: string,
        data: UpdateJobPostQuestionRequiredRequest
    ): Promise<ApiResponse<JobPostQuestionDto>> => {
        return apiService.patch<JobPostQuestionDto>(`${jobPostsUrl}/${jobPostId}/questions/${questionId}/required`, data);
    },

    /**
     * PATCH /api/JobPosts/{jobPostId}/questions/bulk
     */
    updateBulkJobPostQuestions: async (
        jobPostId: string,
        data: UpdateBulkJobPostQuestionsRequest
    ): Promise<ApiResponse<JobPostQuestionDto[]>> => {
        return apiService.patch<JobPostQuestionDto[]>(`${jobPostsUrl}/${jobPostId}/questions/bulk`, data);
    },

    /**
     * PATCH /api/JobPosts/{jobPostId}/status
     */
    updateJobPostStatus: async (
        jobPostId: string,
        data: UpdateJobPostStatusRequest
    ): Promise<ApiResponse<boolean>> => {
        return apiService.patch<boolean>(`${jobPostsUrl}/${jobPostId}/status`, data);
    },

    /**
     * PATCH /api/JobPosts/{jobPostId}/visibility
     */
    updateJobPostVisibility: async (
        jobPostId: string,
        data: UpdateJobPostVisibilityRequest
    ): Promise<ApiResponse<boolean>> => {
        return apiService.patch<boolean>(`${jobPostsUrl}/${jobPostId}/visibility`, data);
    },
};