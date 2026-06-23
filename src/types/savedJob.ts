export interface SavedJobSkillDto {
  skillId?: string;
  skillsId?: string;
  name?: string;
  skillName?: string;
}

export interface SavedJobDto {
  savedJobId?: string;
  savedJobsId?: string;

  jobPostId?: string;
  jobPostsId?: string;

  title?: string;
  description?: string | null;
  descriptionPreview?: string | null;
  majorCategoryId?: string | null;
  majorId?: string | null;
  majorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  skills?: SavedJobSkillDto[];
  skillNames?: string[];
  customSkillNames?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  status?: number;
  visibility?: number | null;
  jobCreatedAt?: string;
  savedAt?: string;
}
