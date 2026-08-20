import { apiService } from '../../service/apiService';
import type { PaginatedList } from '../../types/models/Profile';

export interface PublicFreelancerSkillDto {
  skillName: string;
}

export interface PublicFreelancerSummaryDto {
  userId: string;
  userFullName: string | null;
  userAvatar: string | null;
  title: string | null;
  bio: string | null;
  location: string | null;
  majorName: string | null;
  rating: number;
  updatedAt: string | null;
  skills: PublicFreelancerSkillDto[];
}

export interface PublicJobPostSummaryDto {
  jobPostsId: string;
  title: string;
  descriptionPreview: string;
  majorName: string | null;
  categoryName: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  createdAt: string;
  clientFullName: string | null;
  skillNames: string[];
  customSkillNames: string[];
}

export interface PublicJobPostDetailDto {
  jobPostsId: string;
  clientProfilesId: string;
  userId: string;
  fullName: string;
  avatar: string | null;
  clientFullName: string | null;
  title: string;
  description: string;
  majorCategoryId: string | null;
  majorId: string | null;
  majorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string | null;
  estimatedDuration: string | null;
  location: string | null;
  status: number;
  visibility: number | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string | null;
  eloPoints: number;
  skills: { skillId?: string; skillName: string }[];
  customSkillNames: string[];
  milestonePlans: { title: string; description?: string; amount: number; durationDays?: number }[];
  hasAiInterview: boolean;
}

export interface PublicFreelancerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  skills?: string[];
  availabilityStatus?: string;
  minRating?: number;
  sort?: string;
}

export interface PublicJobPostQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  majorCategoryId?: string;
  skillIds?: string[];
  sort?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export const publicMarketplaceAPI = {
  /**
   * GET api/public/freelancers
   */
  getPublicFreelancers: async (params: PublicFreelancerQueryParams = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
    if (params.search) query.set('search', params.search);
    if (params.availabilityStatus) query.set('availabilityStatus', params.availabilityStatus);
    if (params.minRating !== undefined) query.set('minRating', String(params.minRating));
    if (params.sort) query.set('sort', params.sort);
    params.skills?.forEach(s => query.append('skills', s));

    return await apiService.get<PaginatedList<PublicFreelancerSummaryDto>>(
      `public/freelancers?${query.toString()}`
    );
  },

  /**
   * GET api/public/freelancers/{userId}
   */
  getPublicFreelancerProfile: async (userId: string) => {
    return await apiService.get<any>(`public/freelancers/${userId}`);
  },

  /**
   * GET api/public/job-posts
   */
  getPublicJobPosts: async (params: PublicJobPostQueryParams = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
    if (params.search) query.set('search', params.search);
    if (params.majorCategoryId) query.set('majorCategoryId', params.majorCategoryId);
    if (params.sort) query.set('sort', params.sort);
    if (params.budgetMin !== undefined) query.set('budgetMin', String(params.budgetMin));
    if (params.budgetMax !== undefined) query.set('budgetMax', String(params.budgetMax));
    params.skillIds?.forEach(id => query.append('skillIds', id));

    return await apiService.get<PublicJobPostSummaryDto[]>(
      `public/job-posts?${query.toString()}`
    );
  },

  /**
   * GET api/public/job-posts/{id}
   */
  getPublicJobPostDetail: async (id: string) => {
    return await apiService.get<PublicJobPostDetailDto>(`public/job-posts/${id}`);
  },
};
