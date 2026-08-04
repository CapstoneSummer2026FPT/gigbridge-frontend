import { createContext } from 'react';
import type { PremiumSubscription } from '../types';

export interface PremiumStatusContextValue {
  data: PremiumSubscription | null | undefined;
  loading: boolean;
  error: string | undefined;
  hasResolved: boolean;
  isPremium: boolean;
  refresh: () => Promise<void>;
}

export const PremiumStatusContext = createContext<PremiumStatusContextValue | undefined>(undefined);
