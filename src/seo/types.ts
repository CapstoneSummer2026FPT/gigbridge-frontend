export interface SeoJobSkill {
  readonly skillName?: string;
  readonly name?: string;
}

export interface SeoJobSummary {
  readonly jobPostsId: string;
  readonly title: string;
  readonly descriptionPreview: string;
  readonly categoryName?: string | null;
  readonly majorName?: string | null;
  readonly budgetMin?: number | null;
  readonly budgetMax?: number | null;
  readonly createdAt: string;
  readonly clientFullName?: string | null;
  readonly skillNames?: readonly string[];
  readonly customSkillNames?: readonly string[];
}

export interface SeoJobDetail {
  readonly jobPostsId: string;
  readonly title: string;
  readonly description: string;
  readonly fullName: string;
  readonly clientFullName?: string | null;
  readonly avatar?: string | null;
  readonly categoryName?: string | null;
  readonly majorName?: string | null;
  readonly budgetMin?: number | null;
  readonly budgetMax?: number | null;
  readonly currency?: string | null;
  readonly estimatedDuration?: string | null;
  readonly location?: string | null;
  readonly endDate?: string | null;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
  readonly skills?: readonly SeoJobSkill[];
  readonly customSkillNames?: readonly string[];
}

export interface SeoFreelancerSkill {
  readonly skillName: string;
}

export interface SeoFreelancerSummary {
  readonly userId: string;
  readonly userFullName?: string | null;
  readonly userAvatar?: string | null;
  readonly title?: string | null;
  readonly bio?: string | null;
  readonly location?: string | null;
  readonly majorName?: string | null;
  readonly rating: number;
  readonly skills?: readonly SeoFreelancerSkill[];
  readonly updatedAt?: string | null;
}

export interface SeoPortfolioItem {
  readonly portfolioItemId: string;
  readonly title: string;
  readonly description?: string | null;
  readonly projectUrl?: string | null;
  readonly imageUrl?: string | null;
}

export interface SeoWorkExperience {
  readonly workExperienceId: string;
  readonly companyName: string;
  readonly jobTitle: string;
  readonly description?: string | null;
}

export interface SeoFreelancerDetail extends SeoFreelancerSummary {
  readonly availability?: number | null;
  readonly createdAt: string;
  readonly eloPoints: number;
  readonly isIdentityVerified: boolean;
  readonly showProVerifiedBadge: boolean;
  readonly allowSearchEngineIndexing: boolean;
  readonly portfolioItems?: readonly SeoPortfolioItem[];
  readonly workExperiences?: readonly SeoWorkExperience[];
}

export interface SeoPaginatedList<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly totalCount: number;
}

export interface SeoSitemapEntry {
  readonly id: string;
  readonly lastModified: string;
}

export interface SeoSitemapResources {
  readonly jobs: readonly SeoSitemapEntry[];
  readonly freelancers: readonly SeoSitemapEntry[];
}

export type MarketingRoute =
  | '/'
  | '/about'
  | '/careers'
  | '/faq'
  | '/guide'
  | '/press-kit'
  | '/terms'
  | '/privacy';

export type SeoRouteState =
  | { readonly kind: 'marketing'; readonly route: MarketingRoute }
  | { readonly kind: 'jobs'; readonly jobs: readonly SeoJobSummary[] }
  | { readonly kind: 'job'; readonly job: SeoJobDetail }
  | { readonly kind: 'freelancers'; readonly freelancers: SeoPaginatedList<SeoFreelancerSummary> }
  | { readonly kind: 'freelancer'; readonly freelancer: SeoFreelancerDetail }
  | { readonly kind: 'not-found'; readonly path: string }
  | { readonly kind: 'unavailable'; readonly path: string };

export interface SeoMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly robots: 'index, follow' | 'noindex, nofollow';
  readonly jsonLd: readonly Readonly<Record<string, unknown>>[];
}
