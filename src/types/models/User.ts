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
  is_setup: boolean;
  preferred_language: string;
  last_login_at: string | null;
  login_failed_time: string | null;
  access_failed_count: number;
  gigcoin_balance: number;
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
  preferredLanguage: string | null;
  provider: string | null;
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
  totalPages: number;
}

export interface GetUsersParams {
  Page?: number;
  PageSize?: number;
  Search?: string;
  /** 1 = active, 0 = inactive/banned, omit = all */
  Status?: number;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: number;
  phoneNumber?: string;
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
