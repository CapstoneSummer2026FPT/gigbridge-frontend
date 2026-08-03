/**
 * useProfileNavigation - Shared profile-navigation helper
 *
 * Centralizes role normalization, profile path building, and navigation so
 * every surface that displays a user (name, avatar, creator, participant...)
 * can link to that user's public profile page consistently.
 *
 * Profile routes: `/profile/freelancer/:userId` and `/profile/client/:userId`
 * where `:userId` is the USER id (not the profile id).
 *
 * Admin-role users (UserRole.Admin = 2, ParticipantRole.Support = 3) have no
 * public profile route and are never navigable.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router';

export type ProfileRoleInput = number | string | null | undefined;

const FREELANCER_SEGMENT = 'freelancer';
const CLIENT_SEGMENT = 'client';

/**
 * Maps a role representation to the profile URL segment.
 * - number: 0 -> client, 1 -> freelancer, 2 (Admin) / 3 (Support) -> null
 * - string: 'Client'/'client' -> client, 'Freelancer'/'freelancer' -> freelancer
 * - anything else -> null (not navigable)
 */
export function resolveProfileSegment(role: ProfileRoleInput): 'freelancer' | 'client' | null {
  if (typeof role === 'number') {
    if (role === 0) return CLIENT_SEGMENT;
    if (role === 1) return FREELANCER_SEGMENT;
    return null;
  }

  if (typeof role === 'string') {
    const normalized = role.toLowerCase();
    if (normalized === 'client') return CLIENT_SEGMENT;
    if (normalized === 'freelancer') return FREELANCER_SEGMENT;
    return null;
  }

  return null;
}

/**
 * Builds the profile path for a user, or null when navigation must be disabled
 * (missing userId, Admin/Support role, or unknown role).
 */
export function getProfilePath(
  userId?: string | null,
  role?: ProfileRoleInput
): string | null {
  if (!userId) return null;
  const segment = resolveProfileSegment(role);
  if (!segment) return null;
  return `/profile/${segment}/${userId}`;
}

/**
 * Returns true when the given user can be navigated to a public profile.
 * Pass `role` when known; when omitted the check only requires a userId.
 */
export function canViewProfile(userId?: string | null, role?: ProfileRoleInput): boolean {
  if (!userId) return false;
  if (role === undefined || role === null) return true;
  return resolveProfileSegment(role) !== null;
}

/**
 * Hook providing navigation helpers for user profile links.
 */
export function useProfileNavigation() {
  const navigate = useNavigate();

  const navigateToProfile = useCallback(
    (
      userId?: string | null,
      role?: ProfileRoleInput,
      event?: { stopPropagation?: () => void; preventDefault?: () => void }
    ) => {
      const path = getProfilePath(userId, role);
      if (!path) return;

      // Prevent the click from bubbling to a card/row handler or default action.
      event?.stopPropagation?.();
      event?.preventDefault?.();
      navigate(path);
    },
    [navigate]
  );

  return {
    getProfilePath,
    navigateToProfile,
    canViewProfile,
  };
}
