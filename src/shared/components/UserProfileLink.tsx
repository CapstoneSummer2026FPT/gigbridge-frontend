/**
 * UserProfileLink - Reusable wrapper that makes any user display (name, avatar,
 * or both) clickable and navigates to that user's public profile page.
 *
 * Non-navigable states (missing userId, Admin/Support role, `disabled`) render
 * the children as plain text with no pointer/hover affordance.
 *
 * Non-interference: the link only stops propagation of its own click, so other
 * action buttons inside the same card/row keep working.
 */

import React from 'react';
import { getProfilePath, useProfileNavigation, type ProfileRoleInput } from '../hooks/useProfileNavigation';

interface UserProfileLinkProps {
  /** The user's id (userId, not profile id). When missing the content is not clickable. */
  userId?: string | null;
  /** Role of the user. Admin/Support roles are never navigable. Optional. */
  role?: ProfileRoleInput;
  /** The avatar / name / info content to render. */
  children: React.ReactNode;
  /** Extra classes appended when clickable (preserves existing layout classes). */
  className?: string;
  /** Tooltip shown on hover (default: 'View profile'). */
  tooltip?: string;
  /** Force non-clickable (e.g. anonymous reviews). */
  disabled?: boolean;
}

export function UserProfileLink({
  userId,
  role,
  children,
  className,
  tooltip = 'View profile',
  disabled = false,
}: UserProfileLinkProps) {
  const { navigateToProfile } = useProfileNavigation();

  const navigable = !disabled && getProfilePath(userId, role) !== null;

  if (!navigable) {
    return (
      <span aria-disabled="true" className={className}>
        {children}
      </span>
    );
  }

  return (
    <span
      role="link"
      tabIndex={0}
      title={tooltip}
      aria-label={tooltip}
      className={`cursor-pointer transition-colors hover:text-blue-600 ${className ?? ''}`}
      onClick={(e) => navigateToProfile(userId, role, e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToProfile(userId, role, e);
        }
      }}
    >
      {children}
    </span>
  );
}
