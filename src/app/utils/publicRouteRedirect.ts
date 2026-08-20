import { UserRole, type User } from '../../types/models/User';

type PublicRouteUser = Pick<User, 'role' | 'is_setup'>;

export const getPublicRouteRedirect = (user: PublicRouteUser | null | undefined): string | null => {
  if (!user) return null;
  if (user.role === UserRole.Admin) return '/admin';
  if (!user.is_setup) return '/onboarding/profile-setup';
  if (user.role === UserRole.Client) return '/client/dashboard';
  if (user.role === UserRole.Freelancer) return '/freelancer/dashboard';
  return null;
};
