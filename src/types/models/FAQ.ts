export interface FAQDto {
  id: number;
  faqCategoryId: number;
  faqCategoryName?: string | null;
  question: string;
  questionVi?: string | null;
  answer: string;
  answerVi?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface FAQCategoryDto {
  id: number;
  name: string;
  nameVi?: string | null;
  slug: string;
  sortOrder?: number | null;
  isActive?: boolean | null;
  createdAt: string;
  faqCount: number;
}

export interface CreateFAQPayload {
  faqCategoryId: number;
  question: string;
  questionVi?: string | null;
  answer: string;
  answerVi?: string | null;
  sortOrder?: number | null;
}

export interface UpdateFAQPayload {
  faqCategoryId?: number | null;
  question?: string | null;
  questionVi?: string | null;
  answer?: string | null;
  answerVi?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}

export interface CreateFAQCategoryPayload {
  name: string;
  nameVi?: string | null;
  slug: string;
  sortOrder?: number | null;
}

export interface UpdateFAQCategoryPayload {
  name?: string | null;
  nameVi?: string | null;
  slug?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}
