/**
 * User Model - Based on USERS table
 */

export enum UserRole {
  Client = 0,
  Freelancer = 1,
  Admin = 2,
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  is_email_verified: boolean;
  is_active: boolean;
  account_status?: number;
  is_flagged?: boolean;
  violation_count?: number;
  banned_at?: string | null;
  ban_reason?: string | null;
  suspended_until?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  is_setup: boolean;
  preferred_language: string;
  last_login_at: string | null;
  login_failed_time: string | null;
  access_failed_count: number;
  elo_points: number;
  gigcoin_balance: number;
  open_report_count?: number;
  is_currently_reported?: boolean;
  is_premium?: boolean;
  premium_until?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Backend AdminUserDto shape returned from api/v1/admin/users
 */
export interface AdminUserDto {
  userId: string;
  fullName: string;
  email: string;
  avatar: string | null;
  phoneNumber: string | null;
  role: number;
  isEmailVerified: boolean;
  isActive: boolean;
  accountStatus: number;
  isFlagged: boolean;
  violationCount: number;
  bannedAt?: string | null;
  banReason?: string | null;
  suspendedUntil?: string | null;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  preferredLanguage: string | null;
  provider: string | null;
  openReportCount: number;
  isCurrentlyReported: boolean;
  isPremium: boolean;
  premiumUntil?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Paginated response from GET /api/v1/admin/users
 */
export interface PaginatedUsersResponse {
  items: AdminUserDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  reportedUserCount: number;
  totalPages: number;
}

export interface GetUsersParams {
  Page?: number;
  PageSize?: number;
  Search?: string;
  /** 1 = active, 0 = inactive/banned, omit = all */
  Status?: number;
  Premium?: boolean;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: number;
  phoneNumber?: string;
  isEmailVerified?: boolean;
}

export interface UpdateUserPayload {
  fullName?: string;
  phoneNumber?: string;
  avatar?: string;
  preferredLanguage?: string;
  /** Setting isActive = false bans the user. */
  isActive?: boolean;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
}
