export interface JobPostPromotion {
  jobPostId: string;
  isFeatured: boolean;
  featuredFrom: string;
  featuredUntil: string;
  tokenCost: number;
  walletTransactionId: string;
}

export interface TalentMatch {
  freelancerId: string;
  displayName: string;
  title?: string | null;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
}

export interface TalentMatchingResult {
  jobPostId: string;
  matches: TalentMatch[];
}

export interface AiInterviewDefinition {
  interviewId: string;
  jobPostId: string;
  language: string;
  mode: string;
  questionCount: number;
  status: string;
  createdAt: string;
  externalReference?: string | null;
}

export interface AiInterviewQuestionResult {
  questionIndex: number;
  question?: string | null;
  transcript?: string | null;
  score?: number | null;
}

export interface AiInterviewAttemptResult {
  attemptId: string;
  status: string;
  overallScore?: number | null;
  compatibilityScore?: number | null;
  summary?: string | null;
  technicalSkills: string[];
  softSkills: string[];
  recommendedHire?: boolean | null;
  startedAt: string;
  completedAt?: string | null;
  questions: AiInterviewQuestionResult[];
}

export interface AiInterviewResults {
  interviewId: string;
  jobPostId: string;
  status: string;
  attempts: AiInterviewAttemptResult[];
}

export interface JobPromotionPolicy {
  tokenCost: number;
  durationDays: number;
}
