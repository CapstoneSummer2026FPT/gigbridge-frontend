import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CategoryOptionDto,
  MajorCategoryDto,
  MajorDto,
  SkillOptionDto,
} from '../../types/models/Category';
import { JobPostStatus } from '../../types/models/Job';
import type {
  GetMyJobPostDetailDto,
  GetMyJobPostDto,
  Job,
  JobPostDetailDto,
  JobPostQueryParams,
  JobPostQuestionDto,
  JobPromotionPolicyDto,
  PublicJobPromotionCardDto,
  JobPostSummaryDto,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';
const PUBLIC_JOB_FETCH_PAGE_SIZE = 100;

const mergeSkillNames = (...groups: Array<Array<string | null | undefined> | undefined>): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const rawSkillName of group || []) {
      const skillName = rawSkillName?.trim();
      if (!skillName) continue;

      const key = skillName.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      result.push(skillName);
    }
  }

  return result;
};

type LegacyJobFilters = JobPostQueryParams & {
  category?: string;
  search?: string;
  aiRecommended?: boolean;
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
  category: job.categoryName || 'All',
  majorName: job.majorName,
  categoryName: job.categoryName,
  customSkillNames: job.customSkillNames || [],
  skills: mergeSkillNames(job.skillNames, job.customSkillNames),
  budgetMin: job.budgetMin ?? 0,
  budgetMax: job.budgetMax ?? 0,
  jobType: 'fixed',
  status: 'open',
  proposalCount: 0,
  viewCount: 0,
  postedAt: formatPostedAt(job.createdAt),
  createdAt: job.createdAt,
  isRemote: true,
  clientEloPoints: job.eloPoints ?? 100,
  gigcoin_cost: 0,
  hasAiInterview: Boolean(job.hasAiInterview),
});

const toLegacyStatusFromJobPost = (status: number | string | null | undefined): Job['status'] => {
  const value = Number(status);
  if (value === JobPostStatus.Draft) return 'draft';
  if (value === JobPostStatus.Open) return 'open';
  if (value === JobPostStatus.Closed) return 'closed';
  if (value === JobPostStatus.Cancelled) return 'cancelled';
  return 'draft';
};

const toLegacyJobFromMyJob = (job: GetMyJobPostDto): Job => ({
  id: job.jobPostsId,
  clientId: job.clientProfilesId,
  title: job.title,
  description: job.description,
  category: job.categoryName || 'All',
  majorName: job.majorName,
  categoryName: job.categoryName,
  customSkillNames: job.customSkillNames || [],
  skills: mergeSkillNames(job.skills?.map(skill => skill.name), job.customSkillNames),
  budgetMin: job.budgetMin ?? 0,
  budgetMax: job.budgetMax ?? 0,
  jobType: 'fixed',
  deadline: job.endDate ?? undefined,
  status: toLegacyStatusFromJobPost(job.status),
  proposalCount: job.proposalCount,
  viewCount: 0,
  postedAt: formatPostedAt(job.createdAt),
  createdAt: job.createdAt,
  isRemote: !job.location || job.location.toLowerCase().includes('remote'),
  gigcoin_cost: 0,
});

const toLegacyJobFromDetail = (job: JobPostDetailDto): Job => ({
  id: job.jobPostsId,
  clientId: job.clientProfilesId,
  title: job.title,
  description: job.description,
  category: job.categoryName || 'All',
  majorName: job.majorName,
  categoryName: job.categoryName,
  customSkillNames: job.customSkillNames || [],
  skills: mergeSkillNames(job.skills?.map(skill => skill.skillName), job.customSkillNames),
  budgetMin: job.budgetMin ?? 0,
  budgetMax: job.budgetMax ?? 0,
  jobType: 'fixed',
  deadline: job.endDate ?? undefined,
  status: toLegacyStatusFromJobPost(job.status),
  proposalCount: 0,
  viewCount: 0,
  postedAt: formatPostedAt(job.createdAt),
  createdAt: job.createdAt,
  isRemote: !job.location || job.location.toLowerCase().includes('remote'),
  clientEloPoints: job.eloPoints ?? 100,
  gigcoin_cost: 0,
  visibility: job.visibility ?? undefined,
  milestonePlans: job.milestonePlans || [],
  hasAiInterview: Boolean(job.hasAiInterview),
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
   * GET /api/Majors
   */
  getMajors: async (): Promise<ApiResponse<MajorDto[]>> => {
    return apiService.get<MajorDto[]>('Majors');
  },

  /**
   * GET /api/MajorCategories
   */
  getMajorCategories: async (): Promise<ApiResponse<MajorCategoryDto[]>> => {
    return apiService.get<MajorCategoryDto[]>('MajorCategories');
  },

  /**
   * GET /api/Categories/by-major/{majorId}
   */
  getCategoriesByMajor: async (majorId: string): Promise<ApiResponse<CategoryOptionDto[]>> => {
    return apiService.get<CategoryOptionDto[]>(`Categories/by-major/${majorId}`);
  },

  /**
   * GET /api/Skills/by-category/{categoryId}
   */
  getSkillsByCategory: async (categoryId: string): Promise<ApiResponse<SkillOptionDto[]>> => {
    return apiService.get<SkillOptionDto[]>(`Skills/by-category/${categoryId}`);
  },

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
  getPublicJobById: async (id: string): Promise<ApiResponse<JobPostDetailDto>> => {
    return apiService.get<JobPostDetailDto>(`${jobPostsUrl}/${id}`);
  },

  getJobPostDetail: async (id: string): Promise<ApiResponse<JobPostDetailDto>> => {
    return jobGetAPI.getPublicJobById(id);
  },

  /**
   * GET /api/JobPosts/my-jobs/{jobPostId}
   * Client-owned job post detail.
   */
  getMyJobPostById: async (jobPostId: string): Promise<ApiResponse<GetMyJobPostDetailDto>> => {
    return apiService.get<GetMyJobPostDetailDto>(`${jobPostsUrl}/my-jobs/${jobPostId}`);
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
  ): Promise<ApiResponse<GetMyJobPostDto[]>> => {
    return apiService.get<GetMyJobPostDto[]>(`${jobPostsUrl}/my-jobs`, params);
  },

  getJobPromotionPolicy: async (): Promise<ApiResponse<JobPromotionPolicyDto>> =>
    apiService.get<JobPromotionPolicyDto>(`${jobPostsUrl}/promotion-policy`),

  getJobPromotionFeed: async (limit = 10): Promise<ApiResponse<PublicJobPromotionCardDto[]>> =>
    apiService.get<PublicJobPromotionCardDto[]>('job-promotions/feed', { limit }),

  /**
   * GET /api/JobPosts/my-drafts
   * Client-only current user's draft job posts.
   */
  getMyDraftJobPosts: async (): Promise<ApiResponse<GetMyJobPostDto[]>> => {
    return apiService.get<GetMyJobPostDto[]>(`${jobPostsUrl}/my-drafts`);
  },

  /**
   * GET /api/JobPosts/my-applications/{jobPostId}
   * Freelancer-only job post detail for jobs the current user applied to or was invited to.
   */
  getMyAppliedJobPostById: async (jobPostId: string): Promise<ApiResponse<JobPostDetailDto>> => {
    return apiService.get<JobPostDetailDto>(`${jobPostsUrl}/my-applications/${jobPostId}`);
  },

  /**
   * GET /api/JobPosts/{jobPostId}/questions
   * Questions attached to a job post.
   */
  getJobPostQuestions: async (jobPostId: string): Promise<ApiResponse<JobPostQuestionDto[]>> => {
    return apiService.get<JobPostQuestionDto[]>(`${jobPostsUrl}/${jobPostId}/questions`);
  },

  // Backward-compatible aliases for older screens.
  getJobs: async (params: LegacyJobFilters = {}): Promise<Job[]> => {
    const response = await jobGetAPI.getPublicJobPosts(params);
    return filterLegacyJobs((response.data || []).map(toLegacyJobFromSummary), params);
  },

  getAllPublicJobs: async (params: LegacyJobFilters = {}): Promise<Job[]> => {
    const allJobs: JobPostSummaryDto[] = [];
    let pageIndex = 1;

    while (true) {
      const response = await jobGetAPI.getPublicJobPosts({
        ...params,
        pageIndex,
        pageSize: PUBLIC_JOB_FETCH_PAGE_SIZE,
      });

      if (!response.success) {
        throw new Error(response.message || 'Unable to load public jobs.');
      }

      const items = response.data || [];
      allJobs.push(...items);

      if (items.length < PUBLIC_JOB_FETCH_PAGE_SIZE) {
        break;
      }

      pageIndex += 1;
    }

    return filterLegacyJobs(allJobs.map(toLegacyJobFromSummary), params);
  },

  getJobById: async (id: string): Promise<{ job: Job; client: null; clientProfile: null }> => {
    const response = await jobGetAPI.getPublicJobById(id);

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
    return (response.data || []).map(toLegacyJobFromMyJob);
  },
};
