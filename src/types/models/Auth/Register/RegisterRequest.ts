import { UserRole } from '../../User';

export interface RegisterRequest {
  email: string;
  fullName?: string | null;
  password: string;
  confirmPassword: string;
  role: UserRole;
}
