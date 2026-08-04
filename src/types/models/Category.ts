/**
 * Category & Skill Models - CATEGORIES & SKILLS tables
 */

export interface Category {
  id: string;
  name: string;
  name_vi: string;
  slug: string;
  description: string | null;
  parent_category_id: string | null;
  is_active: boolean;
}

export interface Skill {
  id: string;
  category_id: string;
  name: string;
  name_vi: string;
  is_active: boolean;
}

export interface MajorDto {
  majorId: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface MajorCategoryDto {
  majorCategoryId: string;
  majorId: string;
  majorName: string;
  categoryId: string;
  categoryName: string;
}

export interface CategoryOptionDto {
  majorCategoryId: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface SkillOptionDto {
  skillId: string;
  name: string;
}
