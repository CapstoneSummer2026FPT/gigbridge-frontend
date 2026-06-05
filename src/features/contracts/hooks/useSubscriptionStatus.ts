/**
 * Hook: useSubscriptionStatus
 * 
 * Provides subscription status information for a user.
 * Used to determine Premium feature access, including:
 * - IP clause availability (Premium-only)
 * - Watermarking features
 * - Advanced legal protections
 * 
 * Integration point: Should be connected to user profile/subscription API
 */

import { useState, useEffect } from 'react';
import { SubscriptionType, SubscriptionStatus } from '../../../types/models/Financial';

export interface SubscriptionInfo {
  type: SubscriptionType;
  status: SubscriptionStatus;
  isPremium: boolean;
  expiresAt?: string;
}

interface UseSubscriptionStatusOptions {
  userId?: string;
  // Can be extended with additional options
}

/**
 * Mock hook - to be replaced with actual API integration
 * Current implementation returns mock data based on environment
 */
export function useSubscriptionStatus(options?: UseSubscriptionStatusOptions): {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
} {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Replace with actual API call to get user subscription
        // const response = await userAPI.getSubscription(options?.userId);
        
        // Mock implementation for now
        const mockSubscription: SubscriptionInfo = {
          type: SubscriptionType.Free,
          status: SubscriptionStatus.Active,
          isPremium: false,
          expiresAt: undefined,
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        setSubscription(mockSubscription);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [options?.userId]);

  return { subscription, loading, error };
}

/**
 * Hook: usePremiumStatus
 * 
 * Simplified hook that returns just the Premium status
 */
export function usePremiumStatus(userId?: string): boolean {
  const { subscription, loading } = useSubscriptionStatus({ userId });
  
  if (loading) {
    return false; // Default to non-Premium while loading
  }

  return subscription?.isPremium ?? false;
}

/**
 * Hook: useClausesAvailability
 * 
 * Determines which clauses are available based on subscription
 */
export function useClausesAvailability(userId?: string): {
  availableClauses: string[];
  isPremium: boolean;
} {
  const isPremium = usePremiumStatus(userId);

  const availableClauses = isPremium 
    ? ['nda-01', 'ip-01'] 
    : ['nda-01'];

  return { availableClauses, isPremium };
}

/**
 * Utility: Check if user can access Premium features
 */
export function canAccessPremiumFeatures(subscription: SubscriptionInfo | null): boolean {
  if (!subscription) {
    return false;
  }

  return subscription.type === SubscriptionType.Pro && 
         subscription.status === SubscriptionStatus.Active;
}

/**
 * Utility: Get subscription status label for UI display
 */
export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.Active]: 'Active',
    [SubscriptionStatus.Expired]: 'Expired',
    [SubscriptionStatus.Cancelled]: 'Cancelled',
    [SubscriptionStatus.Pending]: 'Pending',
  };

  return labels[status] ?? 'Unknown';
}

/**
 * Utility: Get subscription type label for UI display
 */
export function getSubscriptionTypeLabel(type: SubscriptionType): string {
  const labels: Record<SubscriptionType, string> = {
    [SubscriptionType.Free]: 'Free Plan',
    [SubscriptionType.Pro]: 'Premium Plan',
  };

  return labels[type] ?? 'Unknown Plan';
}

/**
 * Utility: Check if subscription is expiring soon
 */
export function isSubscriptionExpiringSoon(
  subscription: SubscriptionInfo | null,
  daysThreshold: number = 7
): boolean {
  if (!subscription?.expiresAt) {
    return false;
  }

  const expiresAt = new Date(subscription.expiresAt);
  const today = new Date();
  const daysUntilExpiry = Math.floor(
    (expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
}

/**
 * Utility: Get message about Premium features
 */
export function getPremiumFeatureMessage(isPremium: boolean): string {
  if (isPremium) {
    return 'Premium features unlocked: IP protection clauses and advanced watermarking available';
  }

  return 'Upgrade to Premium to unlock IP protection clauses and advanced watermarking';
}
