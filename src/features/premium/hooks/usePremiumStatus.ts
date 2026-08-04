import { useContext } from 'react';
import { PremiumStatusContext } from './premiumStatusContext';

export function usePremiumStatus(_role?: number | null) {
  const premiumStatus = useContext(PremiumStatusContext);
  if (!premiumStatus) {
    throw new Error('usePremiumStatus must be used within PremiumStatusProvider');
  }
  return premiumStatus;
}
