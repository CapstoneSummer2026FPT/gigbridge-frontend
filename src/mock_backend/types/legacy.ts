/**
 * Legacy types for mock database seed data
 * These are simplified versions for demo/testing purposes
 */

export interface Job {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budgetMin: number;
  budgetMax: number;
  jobType: 'fixed' | 'hourly';
  experienceLevel: 'entry' | 'intermediate' | 'expert';
  deadline?: string;
  status: 'draft' | 'open' | 'in_progress' | 'closed';
  proposalCount: number;
  viewCount: number;
  aiMatchScore?: number;
  isAiRecommended?: boolean;
  postedAt: string;
  isRemote: boolean;
  gigcoin_cost: number;
}

export interface Proposal {
  id: string;
  jobId: string;
  freelancerId: string;
  clientId: string;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: 'pending' | 'shortlisted' | 'rejected' | 'accepted';
  aiScore?: number;
  aiSummary?: string;
  submittedAt: string;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'paid';
  completedAt?: string;
}

export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  skills?: { name: string; rating: number }[];
}
