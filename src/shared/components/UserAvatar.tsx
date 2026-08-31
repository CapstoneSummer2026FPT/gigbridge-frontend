import { useEffect, useMemo, useState } from 'react';
import { Crown, ShieldAlert } from 'lucide-react';
import { profileGetAPI } from '../../api/profileAPI/GET';
import './styles/UserAvatar.css';

export interface UserAvatarProps {
  name: string;
  src?: string | null;
  userId?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  premium?: boolean;
  role?: number;
  isAdmin?: boolean;
  showCrownBadge?: boolean;
  showSparkles?: boolean;
  badgePosition?: 'bottom-right' | 'top-right';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const;

const crownBadgeSizeClasses = {
  sm: 'user-avatar-crown-badge-sm',
  md: 'user-avatar-crown-badge-md',
  lg: 'user-avatar-crown-badge-lg',
  xl: 'user-avatar-crown-badge-xl',
} as const;

const crownIconSizes = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
} as const;

// In-memory cache for user profile data to avoid redundant API queries during the session
const avatarProfileCache = new Map<string, { avatar?: string | null; isPremium?: boolean; role?: number }>();

const initialsFor = (name?: string | null) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toUpperCase();
};

/** Standard Premium 3D Neon Tube SVG Avatar Ring (Brand Color var(--brand, #494be7)) */
function PremiumNeonTube3DRingSVG() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="neon-tube-ring-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* SVG Glow Filter (feGaussianBlur + feMerge) */}
        <filter id="neonGlowBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur1" />
          <feGaussianBlur stdDeviation="0.8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ambient Outer Halo Blur Filter */}
        <filter id="neonAmbientHalo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
        </filter>

        <linearGradient id="neonBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand, #494be7)" />
          <stop offset="50%" stopColor="#7c93f3" />
          <stop offset="100%" stopColor="var(--brand, #494be7)" />
        </linearGradient>
      </defs>

      {/* Layer 1: Slim Ambient Outer Glow Layer */}
      <circle
        cx="50"
        cy="50"
        r="46.5"
        fill="none"
        stroke="var(--brand, #494be7)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#neonAmbientHalo)"
        opacity="0.65"
      />

      {/* Layer 2: Main Brand Neon Tube Body with Thinner 2px Stroke */}
      <circle
        cx="50"
        cy="50"
        r="46.5"
        fill="none"
        stroke="url(#neonBrandGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#neonGlowBlur)"
      />

      {/* Layer 3: Ultra-Slim 3D Specular Core Line (Lõi ống neon siêu mỏng 0.8px) */}
      <circle
        cx="50"
        cy="50"
        r="46.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

/** Admin Matrix Cyber Green 3D Neon Tube Ring SVG - High Contrast Theme Adaptive */
function AdminNeonTube3DRingSVG() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="admin-neon-tube-ring-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* SVG Matrix Green Neon Blur Filter */}
        <filter id="adminNeonGlowBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur1" />
          <feGaussianBlur stdDeviation="1.2" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ambient Outer Deep Green Halo Filter */}
        <filter id="adminNeonAmbientHalo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
        </filter>

        <linearGradient id="adminGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--admin-matrix-green, #00ff66)" />
          <stop offset="40%" stopColor="var(--admin-matrix-dark, #10b981)" />
          <stop offset="70%" stopColor="var(--admin-matrix-deep, #059669)" />
          <stop offset="100%" stopColor="var(--admin-matrix-green, #00ff66)" />
        </linearGradient>
      </defs>

      {/* Layer 1: Ambient Outer Deep Matrix Green Halo */}
      <circle
        cx="50"
        cy="50"
        r="46.5"
        fill="none"
        stroke="var(--admin-matrix-green, #00ff66)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#adminNeonAmbientHalo)"
        opacity="0.85"
      />

      {/* Layer 2: Main Electric Matrix Green Neon Body */}
      <circle
        cx="50"
        cy="50"
        r="46.5"
        fill="none"
        stroke="url(#adminGreenGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#adminNeonGlowBlur)"
      />

      {/* Layer 3: Concentric Inner Accent Matrix Green Dash Ring */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="var(--admin-matrix-green, #00ff66)"
        strokeWidth="1.2"
        strokeDasharray="4 8"
        strokeLinecap="round"
      />

      {/* Layer 4: Ultra-Bright Specular Core Line */}
      <circle
        cx="50"
        cy="50"
        r="46.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />

      {/* Layer 5: 4 Sharp Admin Corner Diamond Accents */}
      <path
        d="M 50 1 L 52.5 5 L 50 9 L 47.5 5 Z
           M 99 50 L 95 52.5 L 91 50 L 95 47.5 Z
           M 50 99 L 47.5 95 L 50 91 L 52.5 95 Z
           M 1 50 L 5 47.5 L 9 50 L 5 52.5 Z"
        fill="var(--admin-matrix-green, #00ff66)"
        stroke="#ffffff"
        strokeWidth="0.6"
      />
    </svg>
  );
}

/** Matrix Hacker Binary Digits Orbit SVG (1 0 1 0 Jumping/Flickering) */
function MatrixBinaryCodeSVG() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="admin-matrix-binary-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fontSize="7" className="font-mono font-bold">
        {/* Top Arc */}
        <text x="60" y="7" textAnchor="middle" className="matrix-digit">1</text>
        <text x="75" y="10" textAnchor="middle" className="matrix-digit">0</text>
        <text x="90" y="18" textAnchor="middle" className="matrix-digit">1</text>
        <text x="103" y="30" textAnchor="middle" className="matrix-digit">0</text>

        {/* Right Arc */}
        <text x="113" y="45" textAnchor="middle" className="matrix-digit">1</text>
        <text x="115" y="62" textAnchor="middle" className="matrix-digit">0</text>
        <text x="111" y="78" textAnchor="middle" className="matrix-digit">1</text>
        <text x="102" y="93" textAnchor="middle" className="matrix-digit">0</text>

        {/* Bottom Arc */}
        <text x="88" y="105" textAnchor="middle" className="matrix-digit">1</text>
        <text x="72" y="113" textAnchor="middle" className="matrix-digit">0</text>
        <text x="55" y="115" textAnchor="middle" className="matrix-digit">1</text>
        <text x="38" y="111" textAnchor="middle" className="matrix-digit">0</text>

        {/* Left Arc */}
        <text x="23" y="102" textAnchor="middle" className="matrix-digit">1</text>
        <text x="12" y="87" textAnchor="middle" className="matrix-digit">0</text>
        <text x="7" y="70" textAnchor="middle" className="matrix-digit">1</text>
        <text x="7" y="52" textAnchor="middle" className="matrix-digit">0</text>
        <text x="14" y="35" textAnchor="middle" className="matrix-digit">1</text>
        <text x="25" y="21" textAnchor="middle" className="matrix-digit">0</text>
        <text x="40" y="11" textAnchor="middle" className="matrix-digit">1</text>
      </g>
    </svg>
  );
}

export function UserAvatar({
  name,
  src,
  userId,
  size = 'md',
  premium,
  role,
  isAdmin,
  showCrownBadge = true,
  showSparkles = true,
  badgePosition = 'bottom-right',
  className = '',
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);
  const [fetchedIsPremium, setFetchedIsPremium] = useState<boolean>(false);
  const [fetchedRole, setFetchedRole] = useState<number | undefined>(undefined);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Fetch avatar, role, and premium status by userId ONLY IF data is missing
  useEffect(() => {
    if (!userId || (Boolean(src) && premium !== undefined && role !== undefined)) {
      return;
    }

    const cached = avatarProfileCache.get(userId);
    if (cached) {
      if (cached.avatar && !src) setFetchedSrc(cached.avatar);
      if (typeof cached.isPremium === 'boolean' && premium === undefined) {
        setFetchedIsPremium(cached.isPremium);
      }
      if (typeof cached.role === 'number' && role === undefined) {
        setFetchedRole(cached.role);
      }
      return;
    }

    let isMounted = true;
    profileGetAPI
      .getUserById(userId)
      .then(res => {
        if (isMounted && res.success && res.data) {
          const avatarUrl = res.data.avatar || (res.data as any).avatarUrl || null;
          const profileData = {
            avatar: avatarUrl,
            isPremium: res.data.isPremium,
            role: res.data.role,
          };
          avatarProfileCache.set(userId, profileData);

          if (avatarUrl && !src) {
            setFetchedSrc(avatarUrl);
          }
          if (typeof res.data.isPremium === 'boolean' && premium === undefined) {
            setFetchedIsPremium(res.data.isPremium);
          }
          if (typeof res.data.role === 'number' && role === undefined) {
            setFetchedRole(res.data.role);
          }
        }
      })
      .catch(() => {
        /* Fallback silently */
      });

    return () => {
      isMounted = false;
    };
  }, [src, userId, premium, role]);

  const effectiveSrc = src || fetchedSrc;
  const effectiveRole = role !== undefined ? role : fetchedRole;
  const isAdminUser = Boolean(isAdmin) || effectiveRole === 2;
  const isPremiumUser = premium !== undefined ? Boolean(premium) : fetchedIsPremium;
  const isSpecialUser = isAdminUser || isPremiumUser;
  const initials = useMemo(() => initialsFor(name), [name]);

  const ringClass = isSpecialUser ? 'user-avatar-premium-ring' : 'user-avatar-normal-ring';
  const containerClasses = `user-avatar-container ${sizeClasses[size]} ${className}`;
  const outerClasses = `user-avatar-wrapper h-full w-full ${ringClass}`;
  const badgeSizeClass = crownBadgeSizeClasses[size];
  const crownIconSize = crownIconSizes[size];

  return (
    <div
      className={containerClasses}
      title={isAdminUser ? 'System Administrator (Matrix Cyber Green 3D Neon)' : isPremiumUser ? 'Premium Account (Brand 3D Neon)' : name}
    >
      {/* Admin Matrix Green 3D Neon Ring SVG & Matrix Binary 1 0 1 0 Orbit SVG */}
      {isAdminUser ? (
        <>
          <AdminNeonTube3DRingSVG />
          <MatrixBinaryCodeSVG />
        </>
      ) : isPremiumUser ? (
        <PremiumNeonTube3DRingSVG />
      ) : null}

      <span className={outerClasses} role="img" aria-label={`${name || 'User'} avatar`}>
        <span className="user-avatar-inner">
          {/* Avatar Image / Initials rendered first */}
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

          {/* Sparse Admin Matrix Pixel 1 0 Glitch Overlay ON TOP of avatar image */}
          {isAdminUser && (
            <div className="matrix-pixel-overlay" aria-hidden="true">
              <span className="matrix-pixel-digit">1</span>
              <span className="matrix-pixel-digit">0</span>
              <span className="matrix-pixel-digit">1</span>
              <span className="matrix-pixel-digit">0</span>
            </div>
          )}

          {/* Falling Sparkle Particles Overlay */}
          {isSpecialUser && showSparkles && (
            <div className={`shiny-sparkle-container ${isAdminUser ? 'admin-sparkle-container' : ''}`} aria-hidden="true">
              <span className="shiny-sparkle" />
              <span className="shiny-sparkle" />
              <span className="shiny-sparkle" />
              <span className="shiny-sparkle" />
            </div>
          )}
        </span>
      </span>

      {/* Admin Matrix Green Shield Badge OR Premium Crown Badge */}
      {isSpecialUser && showCrownBadge && (
        <span
          className={`user-avatar-crown-badge ${badgePosition} ${badgeSizeClass} ${isAdminUser ? 'admin-crown-badge' : ''}`}
          title={isAdminUser ? 'Administrator' : 'Premium User'}
          aria-hidden="true"
        >
          {isAdminUser ? (
            <ShieldAlert size={crownIconSize} strokeWidth={2.5} className="fill-[var(--admin-matrix-green,#00ff66)] text-[var(--admin-matrix-green,#00ff66)]" />
          ) : (
            <Crown size={crownIconSize} strokeWidth={2.5} className="fill-[var(--brand,#494be7)] text-[var(--brand,#494be7)]" />
          )}
        </span>
      )}
    </div>
  );
}
