/**
 * Profile Models - CLIENT_PROFILES & FREELANCER_PROFILES tables
 */

export enum CompanySize {
  Solo = 0,
  Small = 1,
  Medium = 2,
  Large = 3,
}

export enum Availability {
  FullTime = 0,
  PartTime = 1,
  NotAvailable = 2,
}

export enum ProficiencyLevel {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2,
  Expert = 3,
}

export interface ClientProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_website: string | null;
  company_size: CompanySize;
  industry: string;
  company_description: string | null;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface FreelancerSkillDto {
  skillId: string;
  skillName: string;
  proficiencyLevel?: number;
}

export interface PortfolioItemDto {
  portfolioItemId: string;
  title: string;
  description?: string;
  projectUrl?: string;
  imageUrl?: string;
}

export interface WorkExperienceDto {
  workExperienceId: string;
  companyName: string;
  jobTitle: string;
  description?: string;
  startDate: string;
  endDate?: string;
}

export interface FreelancerProfileDto {
  freelancerProfileId?: string;
  freelancerProfilesId?: string;
  userId: string;
  title?: string;
  bio?: string;
  availability?: number;
  location?: string;
  profileCompletionScore?: number;
  createdAt: string;
  updatedAt?: string;
  majorId?: string | null;
  majorName?: string | null;
  categories: FreelancerProfileCategoryDto[];
}

export interface FreelancerProfileCategoryDto {
  majorCategoryId: string;
  categoryId: string;
  name: string;
}

export interface FreelancerProfileDetailDto extends FreelancerProfileDto {
  userFullName?: string;
  userEmail?: string;
  userAvatar?: string;
  rating?: number;
  eloPoints?: number;
  showProVerifiedBadge?: boolean;
  premiumUntil?: string | null;
  premiumTierName?: string | null;
  premiumTierProgress?: number | null;
  skills: FreelancerSkillDto[];
  portfolioItems: PortfolioItemDto[];
  workExperiences: WorkExperienceDto[];
  cheatingViolationCount?: number;
  cheatingPenaltyLogs?: CheatingPenaltyLogDto[];
}

export interface CheatingPenaltyLogDto {
  violationId: string;
  proposalId: string;
  jobPostId: string;
  jobTitle: string;
  violationNumber: number;
  totalEventCount: number;
  copyCount: number;
  pasteCount: number;
  tabSwitchCount: number;
  screenshotAttemptCount: number;
  focusLossCount: number;
  fullscreenExitCount: number;
  action: number;
  eloDelta: number;
  suspendedUntil?: string | null;
  createdAt: string;
}

export interface UpdateClientProfileDto {
  CompanyName: string;
  CompanyWebsite?: string;
  CompanySize: number;
  Industry: string;
  CompanyDescription?: string;
  Location: string;
}

export interface UpdateFreelancerProfileDto {
  title: string;
  bio: string;
  availability: number;
  location: string;
  majorId: string;
  categoryIds: string[];
}

export interface ClientProfileDetailDto {
  clientProfilesId: string;
  userId: string;
  companyName?: string | null;
  companyWebsite?: string | null;
  companySize?: number | null;
  industry?: string | null;
  companyDescription?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  userFullName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null;
  eloPoints?: number;
}

export interface ClientProfileResponseDto {
  clientProfilesId: string;
  userId: string;
  companyName: string;
  companyWebsite?: string;
  companySize: number;
  industry: string;
  companyDescription?: string;
  location: string;
  eloPoints?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FreelancerProfileResponseDto {
  freelancerProfilesId: string;
  userId: string;
  title: string;
  bio: string;
  availability: number;
  location: string;
  profileCompletionScore: number;
  createdAt: string;
  updatedAt: string;
  majorId?: string | null;
  majorName?: string | null;
  categories: FreelancerProfileCategoryDto[];
}

export interface FreelancerProfile {
  id: string;
  user_id: string;
  title: string;
  bio: string;
  availability: Availability;
  location: string;
  profile_completion_score: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface WorkExperience {
  id: string;
  freelancer_id: string;
  company_name: string;
  title: string;
  start_date: string;
  end_date: string | null;
  is_current_job: boolean;
}

export interface Education {
  id: string;
  freelancer_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
}

export interface Certification {
  id: string;
  freelancer_id: string;
  name: string;
  issuing_organization: string;
  issue_date: string;
  expiration_date: string | null;
}

export interface PortfolioItem {
  id: string;
  freelancer_id: string;
  title: string;
  description: string;
  project_url: string | null;
  image_urls: string;
}

export interface FreelancerSkill {
  id: string;
  freelancer_id: string;
  skill_id: string;
  years_of_experience: number;
  proficiency_level: ProficiencyLevel;
}
