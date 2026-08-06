import { useEffect, useMemo, useState } from 'react';
import { profileGetAPI } from '../../api/profileAPI/GET';

interface UserAvatarProps {
  name: string;
  src?: string | null;
  userId?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  premium?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const;

const initialsFor = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toUpperCase();
};

export function UserAvatar({
  name,
  src,
  userId,
  size = 'md',
  premium = false,
  className = '',
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Fetch avatar by userId if src is not provided
  useEffect(() => {
    if (src || !userId) {
      setFetchedSrc(null);
      return;
    }

    let isMounted = true;
    profileGetAPI
      .getUserById(userId)
      .then(res => {
        if (isMounted && res.success && res.data?.avatar) {
          setFetchedSrc(res.data.avatar);
        }
      })
      .catch(() => {
        /* Fallback silently to initials */
      });

    return () => {
      isMounted = false;
    };
  }, [src, userId]);

  const effectiveSrc = src || fetchedSrc;
  const initials = useMemo(() => initialsFor(name), [name]);

  // Outer wrapper with gradient stroke (background to mint from theme)
  const outerClasses = `${sizeClasses[size]} shrink-0 inline-block p-[2px] rounded-full bg-gradient-to-br from-[var(--background)] to-[var(--mint)] ${premium ? 'admin-premium-avatar' : ''
    } ${className}`;

  return (
    <span className={outerClasses} role="img" aria-label={`${name || 'User'} avatar`}>
      <span className="flex h-full w-full items-center justify-center rounded-full overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
        {effectiveSrc && !failed ? (
          <img
            className="h-full w-full object-cover"
            src={effectiveSrc}
            alt=""
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-bold" aria-hidden="true">
            {initials}
          </span>
        )}
      </span>
    </span>
  );
}
