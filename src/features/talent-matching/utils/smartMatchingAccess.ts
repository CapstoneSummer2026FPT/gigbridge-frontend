import { UserRole } from '../../../types/models/User';

export const canUseSmartMatching = (
  role: UserRole | null | undefined,
  isPremium: boolean,
) => role === UserRole.Client && isPremium;
