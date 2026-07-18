import { useCallback, useEffect } from 'react';
import { clientPremiumAPI, premiumAPI } from '../api';
import { usePremiumResource } from './usePremiumResource';

export function usePremiumStatus(role: number | null | undefined) {
  const loader = useCallback(
    () => role === 0
      ? clientPremiumAPI.currentSubscription()
      : role === 1
        ? premiumAPI.currentSubscription()
        : Promise.resolve({ success: true, statusCode: 200, message: 'Not applicable', data: null }),
    [role],
  );
  const resource = usePremiumResource(loader);
  const isPremium = Boolean(
    resource.data?.isPremium &&
    resource.data.status === 0 &&
    new Date(resource.data.endDate) > new Date(),
  );

  useEffect(() => {
    const refresh = () => { void resource.refresh(); };
    window.addEventListener('gigbridge-premium-updated', refresh);
    return () => window.removeEventListener('gigbridge-premium-updated', refresh);
  }, [resource.refresh]);

  return { ...resource, isPremium };
}
