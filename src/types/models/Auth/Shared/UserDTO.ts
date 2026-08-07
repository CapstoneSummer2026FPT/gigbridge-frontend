import { UserRole } from '../../User';

export interface UserDTO {
  userId: string;
  fullName: string;
  email: string;
  avatar?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  isSetup: boolean;
  isPremium: boolean;
  preferredLanguage?: string | null;
  provider?: string | null;
  eloPoints?: number;
  createdAt: string;
  updatedAt?: string | null;
}
