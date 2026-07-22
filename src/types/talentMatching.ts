export type TalentMatchConfidence = 'high' | 'medium' | 'low';

export interface TalentMatchingFilters {
  majorCategoryId?: string | null;
  skillIds: string[];
}

export interface AiTalentMatchingRequest {
  topK: number;
  filters: TalentMatchingFilters;
}

export interface AiTalentMatchScoreBreakdown {
  embedding: number;
  algorithm: number;
  evidence: number;
}

export interface AiTalentMatchConfidenceBreakdown {
  dataCoverage: number;
  scoreAgreement: number;
  confidenceScore: number;
}

export interface AiTalentMatch {
  freelancerProfileId: string;
  userId: string;
  displayName: string;
  title?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  rank: number;
  finalScore: number;
  confidence: TalentMatchConfidence;
  /** Optional while older backend instances are still serving responses. */
  confidenceBreakdown?: AiTalentMatchConfidenceBreakdown;
  scoreBreakdown: AiTalentMatchScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  semanticStrengths: string[];
  reasons: string[];
  averageRating: number;
  reviewCount: number;
  completedContracts: number;
  eloPoints: number;
}

export interface AiTalentMatchingResult {
  matchRunId: string;
  jobPostId: string;
  mode: 'ai-algorithm-v2' | string;
  algorithmVersion: string;
  matches: AiTalentMatch[];
}

export interface TalentMatchEventRequest {
  matchRunId: string;
  freelancerProfileId: string;
  eventType: 'impression' | 'profile_opened';
  idempotencyKey: string;
}
