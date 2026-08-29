import { UserRole } from '../../../types/models/User';

const LAST_ACTIVITY_STORAGE_KEY = 'gigbridge_last_activity_at';
const AUTH_CHANNEL_NAME = 'gigbridge_auth_session';
const REFRESH_LOCK_NAME = 'gigbridge_access_token_refresh';
const ACTIVITY_SYNC_INTERVAL_MS = 30_000;
const RECENT_ACTIVITY_WINDOW_MS = 5 * 60_000;

export const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 60_000;

const IDLE_TIMEOUT_BY_ROLE: Record<UserRole, number> = {
  [UserRole.Client]: 30 * 60_000,
  [UserRole.Freelancer]: 30 * 60_000,
  [UserRole.Admin]: 15 * 60_000,
};

type AuthSessionEvent =
  | { type: 'logout'; reason: string }
  | { type: 'token-refreshed' };

type AuthSessionEventListener = (event: AuthSessionEvent) => void;

interface JwtPayload {
  exp?: number;
  sub?: string;
  [claim: string]: unknown;
}

const nameIdentifierClaim =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return decodeURIComponent(
    Array.from(atob(padded))
      .map(character => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
};

export const decodeAccessTokenPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return typeof payload === 'object' && payload !== null ? payload as JwtPayload : null;
  } catch {
    return null;
  }
};

export const getAccessTokenExpirationMs = (token: string): number | null => {
  const expiration = decodeAccessTokenPayload(token)?.exp;
  return typeof expiration === 'number' && Number.isFinite(expiration)
    ? expiration * 1_000
    : null;
};

export const getAccessTokenUserId = (token: string): string | null => {
  const payload = decodeAccessTokenPayload(token);
  const userId = payload?.[nameIdentifierClaim] ?? payload?.sub;
  return typeof userId === 'string' && userId.trim() ? userId : null;
};

export const accessTokenExpiresWithin = (
  token: string,
  thresholdMs: number,
  now = Date.now(),
): boolean => {
  const expiration = getAccessTokenExpirationMs(token);
  return expiration === null || expiration - now <= thresholdMs;
};

export type RefreshFailureDisposition = 'permanent' | 'transient';

export const classifyRefreshFailureStatus = (
  status?: number,
): RefreshFailureDisposition =>
  status === 400 || status === 401 || status === 403
    ? 'permanent'
    : 'transient';

class AuthSessionManager {
  private role: UserRole | null = null;
  private lastActivityAt = 0;
  private lastActivitySyncAt = 0;
  private idleExpired = false;
  private tracking = false;
  private channel: BroadcastChannel | null = null;
  private readonly listeners = new Set<AuthSessionEventListener>();

  private readonly handleMeaningfulActivity = (): void => {
    const now = Date.now();

    if (this.hasExceededIdleTimeout(now)) {
      this.idleExpired = true;
      return;
    }

    this.lastActivityAt = now;
    this.syncActivityTimestamp(now);
  };

  private readonly handleStorage = (event: StorageEvent): void => {
    if (event.key !== LAST_ACTIVITY_STORAGE_KEY || !event.newValue) return;
    const timestamp = Number(event.newValue);
    if (Number.isFinite(timestamp) && timestamp > this.lastActivityAt) {
      this.lastActivityAt = timestamp;
      this.idleExpired = false;
    }
  };

  beginSession(role: UserRole): void {
    this.role = role;
    this.idleExpired = false;
    this.lastActivityAt = Date.now();
    this.lastActivitySyncAt = 0;
    this.syncActivityTimestamp(this.lastActivityAt, true);
  }

  restoreSession(role: UserRole): void {
    this.role = role;
    const persistedActivity = this.readPersistedActivity();
    this.lastActivityAt = persistedActivity ?? Date.now();
    this.lastActivitySyncAt = this.lastActivityAt;
    this.idleExpired = this.hasExceededIdleTimeout();

    if (persistedActivity === null) {
      this.syncActivityTimestamp(this.lastActivityAt, true);
    }
  }

  startActivityTracking(role: UserRole): void {
    this.role = role;
    if (this.tracking || typeof window === 'undefined') return;

    this.tracking = true;
    const captureOptions: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', this.handleMeaningfulActivity, captureOptions);
    window.addEventListener('touchstart', this.handleMeaningfulActivity, captureOptions);
    window.addEventListener('wheel', this.handleMeaningfulActivity, captureOptions);
    window.addEventListener('keydown', this.handleMeaningfulActivity, true);
    window.addEventListener('storage', this.handleStorage);
    this.ensureChannel();
  }

  stopActivityTracking(): void {
    if (!this.tracking || typeof window === 'undefined') return;

    this.tracking = false;
    window.removeEventListener('pointerdown', this.handleMeaningfulActivity, true);
    window.removeEventListener('touchstart', this.handleMeaningfulActivity, true);
    window.removeEventListener('wheel', this.handleMeaningfulActivity, true);
    window.removeEventListener('keydown', this.handleMeaningfulActivity, true);
    window.removeEventListener('storage', this.handleStorage);
  }

  isIdleExpired(now = Date.now()): boolean {
    if (this.idleExpired) return true;
    this.idleExpired = this.hasExceededIdleTimeout(now);
    return this.idleExpired;
  }

  hasRecentActivity(now = Date.now()): boolean {
    return !this.isIdleExpired(now) && now - this.lastActivityAt <= RECENT_ACTIVITY_WINDOW_MS;
  }

  clearSession(reason: string, broadcast = true): void {
    this.stopActivityTracking();
    this.role = null;
    this.lastActivityAt = 0;
    this.lastActivitySyncAt = 0;
    this.idleExpired = false;

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
    }

    if (broadcast) {
      this.publish({ type: 'logout', reason });
    }
  }

  notifyTokenRefreshed(): void {
    this.publish({ type: 'token-refreshed' });
  }

  subscribe(listener: AuthSessionEventListener): () => void {
    this.listeners.add(listener);
    this.ensureChannel();
    return () => {
      this.listeners.delete(listener);
    };
  }

  async withRefreshLock(
    tokenBeingReplaced: string,
    refresh: () => Promise<string>,
  ): Promise<string> {
    if (typeof navigator === 'undefined' || !navigator.locks) {
      return refresh();
    }

    return navigator.locks.request(REFRESH_LOCK_NAME, async () => {
      const latestToken = localStorage.getItem('access_token');
      if (latestToken && latestToken !== tokenBeingReplaced) {
        return latestToken;
      }

      return refresh();
    });
  }

  private hasExceededIdleTimeout(now = Date.now()): boolean {
    if (this.role === null || this.lastActivityAt <= 0) return false;
    return now - this.lastActivityAt >= IDLE_TIMEOUT_BY_ROLE[this.role];
  }

  private readPersistedActivity(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const value = Number(localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private syncActivityTimestamp(timestamp: number, force = false): void {
    if (typeof localStorage === 'undefined') return;
    if (!force && timestamp - this.lastActivitySyncAt < ACTIVITY_SYNC_INTERVAL_MS) return;

    this.lastActivitySyncAt = timestamp;
    localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp));
  }

  private ensureChannel(): void {
    if (this.channel || typeof BroadcastChannel === 'undefined') return;
    this.channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    this.channel.addEventListener('message', event => {
      const authEvent = event.data as AuthSessionEvent;
      if (authEvent?.type !== 'logout' && authEvent?.type !== 'token-refreshed') return;

      if (authEvent.type === 'logout') {
        this.clearSession(authEvent.reason, false);
      }

      this.listeners.forEach(listener => listener(authEvent));
    });
  }

  private publish(event: AuthSessionEvent): void {
    this.ensureChannel();
    this.channel?.postMessage(event);
  }
}

export const authSessionManager = new AuthSessionManager();
