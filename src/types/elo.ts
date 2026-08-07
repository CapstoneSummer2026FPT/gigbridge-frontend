/**
 * Elo point ledger, dispute-penalty policy, and appeal types.
 *
 * Mirrors the backend DTOs (Application/Features/{Elo,Admin/Elo}/DTOs) which
 * serialize with camelCase. Enums are kept as raw numbers so the UI owns the
 * display mapping through i18n label maps (see features/elo/utils/eloLabels.ts).
 */

export enum UserEloPointReason {
  InitialGrant = 0,
  InactivityPenalty = 1,
  ReturnBonus = 2,
  JobCompletion = 3,
  ReviewRating = 4,
  /** Persisted ledger value from the retired integrity-monitoring workflow. */
  LegacyIntegrityPenalty = 5,
  ReviewModeration = 6,
  CompletedJobReview = 7,
  DisputeResolutionPenalty = 8,
  AdminIncrease = 9,
  AdminDecrease = 10,
  AppealCorrection = 11,
  Reversal = 12,
  SystemAdjustment = 13,
}

export enum EloAdjustmentSourceType {
  Review = 0,
  Dispute = 1,
  EloAppeal = 2,
  Admin = 3,
  System = 4,
}

export enum EloAdjustmentMode {
  FixedPoints = 0,
  Percentage = 1,
}

export enum EloPointAppealStatus {
  Pending = 0,
  UnderReview = 1,
  Approved = 2,
  PartiallyApproved = 3,
  Rejected = 4,
  Cancelled = 5,
}

export enum EloPointAppealResolution {
  NoChange = 0,
  FullReversal = 1,
  PartialCorrection = 2,
  CustomAdjustment = 3,
}

/** History filter tabs accepted by GET /api/elo/history (backend EloHistoryFilter). */
export type EloHistoryFilter = 'All' | 'Reviews' | 'Disputes' | 'Admin' | 'Appeal' | 'Gained' | 'Lost';

/** A single Elo ledger transaction (EloTransactionDto). */
export interface EloTransaction {
  transactionId: string;
  userId: string;
  pointsDelta: number;
  pointsBefore: number;
  pointsAfter: number;
  reason: number;
  sourceType?: number | null;
  mode?: number | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  contractId?: string | null;
  reviewId?: string | null;
  rating?: number | null;
  eloAppealId?: string | null;
  appliedByAdminId?: string | null;
  createdAt: string;
}

/** Headline Elo state: current score plus lifetime totals and recent rows. */
export interface EloSummary {
  currentPoints: number;
  totalGained: number;
  totalLost: number;
  totalTransactions: number;
  recentTransactions: EloTransaction[];
}

/** Transaction detail with the active appeal (if any). */
export interface EloTransactionDetail {
  transaction: EloTransaction;
  activeAppeal?: EloAppeal | null;
}

/** Attachment submitted as part of an Elo appeal. */
export interface EloAppealEvidence {
  evidenceId: string;
  appealId: string;
  uploadedById: string;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  description?: string | null;
  createdAt: string;
}

/** Appeal row for list endpoints (evidence excluded until detail). */
export interface EloAppeal {
  appealId: string;
  userId: string;
  transactionId: string;
  status: number;
  resolution?: number | null;
  reason: string;
  resolutionNote?: string | null;
  correctedDelta?: number | null;
  appliedTransactionId?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Appeal detail including evidence and the appealed transaction. */
export interface EloAppealDetail {
  appeal: EloAppeal;
  transaction?: EloTransaction | null;
  evidence: EloAppealEvidence[];
}

/** Identity/contact subset of the target user shown beside admin Elo rows. */
export interface AdminEloUserInfo {
  userId: string;
  fullName: string;
  avatar?: string | null;
  email: string;
  role: number;
}

/** An Elo ledger row decorated with the owning user for admin browsing. */
export interface AdminEloTransactionRow {
  transactionId: string;
  user: AdminEloUserInfo;
  pointsDelta: number;
  pointsBefore: number;
  pointsAfter: number;
  reason: number;
  sourceType?: number | null;
  mode?: number | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  contractId?: string | null;
  reviewId?: string | null;
  rating?: number | null;
  eloAppealId?: string | null;
  appliedByAdminId?: string | null;
  createdAt: string;
}

/** Headline state + recent rows for a single user from the admin perspective. */
export interface AdminEloUserSummary {
  user: AdminEloUserInfo;
  currentPoints: number;
  totalGained: number;
  totalLost: number;
  totalTransactions: number;
  recentTransactions: EloTransaction[];
}

/** An appeal row with the appealing user and (when resolved) the reviewing admin. */
export interface AdminEloAppealRow {
  appealId: string;
  user: AdminEloUserInfo;
  transactionId: string;
  status: number;
  resolution?: number | null;
  reason: string;
  resolutionNote?: string | null;
  correctedDelta?: number | null;
  appliedTransactionId?: string | null;
  reviewedByAdminId?: string | null;
  reviewedByAdminName?: string | null;
  reviewedAt?: string | null;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin appeal detail plus the user's current score summary. */
export interface AdminEloAppealDetail {
  appeal: AdminEloAppealRow;
  transaction?: EloTransaction | null;
  evidence: EloAppealEvidence[];
  userSummary: AdminEloUserSummary;
}

/** Platform-configured Elo policy (dispute penalty mode/value). */
export interface EloPolicy {
  mode: number;
  value: number;
}

/** Generic pagination envelope returned by the backend (PaginatedList<T>). */
export interface PaginatedElo<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface EloHistoryQuery {
  page?: number;
  pageSize?: number;
  filter?: EloHistoryFilter;
}

export interface MyEloAppealsQuery {
  page?: number;
  pageSize?: number;
  status?: number;
}

export interface AdminEloHistoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: EloHistoryFilter;
}

export interface AdminEloAppealsQuery {
  page?: number;
  pageSize?: number;
  status?: number;
  search?: string;
}

export interface CreateEloAppealPayload {
  transactionId: string;
  reason: string;
  files?: File[];
}

export interface AdminEloAdjustmentPayload {
  userId: string;
  increase: boolean;
  mode: EloAdjustmentMode;
  amount: number;
  reason?: string | null;
  requestId?: string;
}

export interface AdminResolveEloAppealPayload {
  status: EloPointAppealStatus;
  resolution: EloPointAppealResolution;
  correctedDelta?: number | null;
  resolutionNote?: string | null;
}
