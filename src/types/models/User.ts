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

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
}
