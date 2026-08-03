import { useEffect, useMemo, useState } from 'react';

interface UserAvatarProps {
  name: string;
  src?: string | null;
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

export function UserAvatar({ name, src, size = 'md', premium = false, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials = useMemo(() => initialsFor(name), [name]);
  const classes = `${sizeClasses[size]} shrink-0 overflow-hidden rounded-full border border-[var(--border-strong)] bg-gradient-to-br from-[var(--brand)] to-[var(--brand-hover)] text-white ${premium ? 'admin-premium-avatar' : ''} ${className}`;

  return (
    <span className={classes} role="img" aria-label={`${name || 'User'} avatar`}>
      {src && !failed ? (
        <img className="h-full w-full object-cover" src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold" aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

