import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../../../app/providers/AppProvider';
import { getErrorMessage } from '../../../shared/utils/errorUtils';
import { UserRole } from '../../../types/models/User';
import { clientPremiumAPI, premiumAPI } from '../api';
import { PremiumSubscriptionStatus, type PremiumSubscription } from '../types';
import { PremiumStatusContext } from './premiumStatusContext';

interface PremiumResourceState {
  subjectKey: string | null;
  data: PremiumSubscription | null | undefined;
  loading: boolean;
  error: string | undefined;
}

const initialState: PremiumResourceState = {
  subjectKey: null,
  data: undefined,
  loading: true,
  error: undefined,
};

export function PremiumStatusProvider({ children }: { children: ReactNode }) {
  const { user, role, isLoading: isAppLoading } = useApp();
  const requestId = useRef(0);
  const stateRef = useRef(initialState);
  const [state, setState] = useState(initialState);
  const applicableRole = role === UserRole.Client || role === UserRole.Freelancer;
  const subjectKey = user && applicableRole ? `${user.id}:${role}` : null;

  const updateState = useCallback((nextState: PremiumResourceState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const refresh = useCallback(async () => {
    const currentSubjectKey = subjectKey;
    const currentRole = role;
    const id = ++requestId.current;

    if (!currentSubjectKey || !applicableRole) {
      updateState({
        subjectKey: null,
        data: undefined,
        loading: isAppLoading,
        error: undefined,
      });
      return;
    }

    const cachedData = stateRef.current.subjectKey === currentSubjectKey
      ? stateRef.current.data
      : undefined;

    updateState({
      subjectKey: currentSubjectKey,
      data: cachedData,
      loading: true,
      error: undefined,
    });

    try {
      const response = currentRole === UserRole.Client
        ? await clientPremiumAPI.currentSubscription()
        : await premiumAPI.currentSubscription();

      if (id !== requestId.current) return;

      if (!response.success) {
        updateState({
          subjectKey: currentSubjectKey,
          data: cachedData,
          loading: false,
          error: response.message || 'Unable to verify Premium access.',
        });
        return;
      }

      updateState({
        subjectKey: currentSubjectKey,
        data: response.data ?? null,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      if (id !== requestId.current) return;
      updateState({
        subjectKey: currentSubjectKey,
        data: cachedData,
        loading: false,
        error: getErrorMessage(error) || 'Unable to verify Premium access.',
      });
    }
  }, [applicableRole, isAppLoading, role, subjectKey, updateState]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    const handlePremiumUpdated = () => {
      void refresh();
    };
    window.addEventListener('gigbridge-premium-updated', handlePremiumUpdated);
    return () => window.removeEventListener('gigbridge-premium-updated', handlePremiumUpdated);
  }, [refresh]);

  const currentState = state.subjectKey === subjectKey
    ? state
    : {
      subjectKey,
      data: undefined,
      loading: Boolean(subjectKey) || isAppLoading,
      error: undefined,
    };
  const hasResolved = currentState.data !== undefined;
  const isPremium = Boolean(
    hasResolved &&
    currentState.data?.isPremium &&
    currentState.data.status === PremiumSubscriptionStatus.Active &&
    new Date(currentState.data.endDate) > new Date(),
  );
  const value = useMemo(() => ({
    data: currentState.data,
    loading: currentState.loading,
    error: currentState.error,
    hasResolved,
    isPremium,
    refresh,
  }), [
    currentState.data,
    currentState.error,
    currentState.loading,
    hasResolved,
    isPremium,
    refresh,
  ]);

  return (
    <PremiumStatusContext.Provider value={value}>
      {children}
    </PremiumStatusContext.Provider>
  );
}
