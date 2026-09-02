import type { ApiResponse } from '../../../types/common';
import {
  JobPostStatus,
  type AiInterviewDefinitionDto,
  type CreateAiInterviewRequest,
} from '../../../types/models/Job';

const DEFAULT_AI_INTERVIEW_REQUEST: CreateAiInterviewRequest = {
  language: 'auto',
  mode: 'voice',
  questionCount: 5,
};

export interface PublishJobPostApi {
  updateJobPostStatus: (
    jobPostId: string,
    data: { status: JobPostStatus },
  ) => Promise<ApiResponse<boolean>>;
  createAiInterview: (
    jobPostId: string,
    data: CreateAiInterviewRequest,
  ) => Promise<ApiResponse<AiInterviewDefinitionDto>>;
}

export interface PublishJobPostResult {
  aiInterviewEnabled: boolean;
  aiInterviewError?: string;
}

export const publishJobPost = async (
  api: PublishJobPostApi,
  jobPostId: string,
  hasAiInterview: boolean,
): Promise<PublishJobPostResult> => {
  const publishResponse = await api.updateJobPostStatus(jobPostId, {
    status: JobPostStatus.Open,
  });
  if (!publishResponse.success) {
    throw new Error(publishResponse.message || 'Project request could not be published.');
  }

  if (!hasAiInterview) {
    return { aiInterviewEnabled: false };
  }

  try {
    const interviewResponse = await api.createAiInterview(
      jobPostId,
      DEFAULT_AI_INTERVIEW_REQUEST,
    );
    if (!interviewResponse.success || !interviewResponse.data) {
      return {
        aiInterviewEnabled: false,
        aiInterviewError: interviewResponse.message || 'AI interview could not be enabled.',
      };
    }
  } catch (error) {
    return {
      aiInterviewEnabled: false,
      aiInterviewError: error instanceof Error
        ? error.message
        : 'AI interview could not be enabled.',
    };
  }

  return { aiInterviewEnabled: true };
};
