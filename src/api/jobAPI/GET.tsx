import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  Job,
  JobPostDetailDto,
  JobPostQueryParams,
  JobPostSummaryDto,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

type LegacyJobFilters = JobPostQueryParams & {
  category?: string;
  search?: string;
  aiRecommended?: boolean;
};

const experienceLevelMap: Record<number, Job['experienceLevel']> = {
  0: 'entry',
  1: 'intermediate',
  2: 'expert',
};

const formatPostedAt = (createdAt?: string): string => {
  if (!createdAt) return '';

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return createdAt;

  const diffDays = Math.max(0, Math.floor((Date.now() - createdTime) / 86400000));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

const toLegacyJobFromSummary = (job: JobPostSummaryDto): Job => ({
  id: job.jobPostsId,
  clientId: '',
  title: job.title,
  description: job.descriptionPreview,
  category: 'All',
  skills: job.skillNames || [],
  budgetMin: job.budgetMin ?? 0,
  budgetMax: job.budgetMax ?? 0,
  jobType: job.budgetType === 1 ? 'hourly' : 'fixed',
  experienceLevel: experienceLevelMap[job.experienceLevelRequired ?? 1] ?? 'intermediate',
  status: 'open',
  proposalCount: 0,
  viewCount: 0,
  postedAt: formatPostedAt(job.createdAt),
  isRemote: job.locationType == null || job.locationType === 0,
  gigcoin_cost: 0,
});

const toLegacyJobFromDetail = (job: JobPostDetailDto): Job => ({
  id: job.jobPostsId,
  clientId: job.clientProfilesId,
  title: job.title,
  description: job.description,
  category: 'All',
  skills: job.skills?.map(skill => skill.skillName) || [],
  budgetMin: job.budgetMin ?? 0,
  budgetMax: job.budgetMax ?? 0,
  jobType: job.budgetType === 1 ? 'hourly' : 'fixed',
  experienceLevel: experienceLevelMap[job.experienceLevelRequired ?? 1] ?? 'intermediate',
  deadline: job.applicationDeadline ?? undefined,
  status: 'open',
  proposalCount: 0,
  viewCount: 0,
  postedAt: formatPostedAt(job.createdAt),
  isRemote: job.locationType == null || job.locationType === 0,
  gigcoin_cost: 0,
});

const filterLegacyJobs = (jobs: Job[], filters: LegacyJobFilters = {}): Job[] => {
  let list = jobs;

  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(job =>
      job.title.toLowerCase().includes(search)
      || job.description.toLowerCase().includes(search)
      || job.skills.some(skill => skill.toLowerCase().includes(search))
    );
  }

  if (filters.category && filters.category !== 'All') {
    list = list.filter(job => job.category === filters.category);
  }

  if (filters.aiRecommended) {
    list = list.filter(job => job.isAiRecommended);
  }

  return list;
};

export const jobGetAPI = {
  /**
   * GET /api/JobPosts/public
   * Public job posts list.
   */
  getPublicJobPosts: async (
    params: JobPostQueryParams = {}
  ): Promise<ApiResponse<JobPostSummaryDto[]>> => {
    return apiService.get<JobPostSummaryDto[]>(`${jobPostsUrl}/public`, params);
  },

  /**
   * GET /api/JobPosts/{id}
   * Public job post detail.
   */
  getJobPostDetail: async (id: string): Promise<ApiResponse<JobPostDetailDto>> => {
    return apiService.get<JobPostDetailDto>(`${jobPostsUrl}/${id}`);
  },

  /**
   * GET /api/JobPosts/admin/all
   * Admin-only job posts list.
   */
  getAllJobPosts: async (
    params: JobPostQueryParams = {}
  ): Promise<ApiResponse<JobPostSummaryDto[]>> => {
    return apiService.get<JobPostSummaryDto[]>(`${jobPostsUrl}/admin/all`, params);
  },

  /**
   * GET /api/JobPosts/my-jobs
   * Client-only current user's job posts.
   */
  getMyJobPosts: async (
    params: JobPostQueryParams = {}
  ): Promise<ApiResponse<JobPostSummaryDto[]>> => {
    return apiService.get<JobPostSummaryDto[]>(`${jobPostsUrl}/my-jobs`, params);
  },

  /**
   * GET /api/JobPosts/my-applications
   * Freelancer-only job posts the current user applied to.
   */
  getMyAppliedJobPosts: async (
    params: JobPostQueryParams = {}
  ): Promise<ApiResponse<JobPostSummaryDto[]>> => {
    return apiService.get<JobPostSummaryDto[]>(`${jobPostsUrl}/my-applications`, params);
  },

  // Backward-compatible aliases for older screens.
  getJobs: async (params: LegacyJobFilters = {}): Promise<Job[]> => {
    const response = await jobGetAPI.getPublicJobPosts(params);
    return filterLegacyJobs((response.data || []).map(toLegacyJobFromSummary), params);
  },

  getJobById: async (id: string): Promise<{ job: Job; client: null; clientProfile: null }> => {
    const response = await jobGetAPI.getJobPostDetail(id);

    if (!response.data) {
      throw new Error(response.message || 'Job post not found');
    }

    return {
      job: toLegacyJobFromDetail(response.data),
      client: null,
      clientProfile: null,
    };
  },

  getClientJobs: async (params: JobPostQueryParams = {}): Promise<Job[]> => {
    const response = await jobGetAPI.getMyJobPosts(params);
    return (response.data || []).map(toLegacyJobFromSummary);
  },
};
