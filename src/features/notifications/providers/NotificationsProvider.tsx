import { createContext, useContext, type ReactNode } from 'react';
import { useApp } from '../../../app/providers/AppProvider';
import { useUserNotifications } from '../hooks/useUserNotifications';

type NotificationsContextValue = ReturnType<typeof useUserNotifications>;

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Mounted once in RootLayout so the notification bell/state and its SignalR connection survive
 * in-app navigation instead of being torn down and rebuilt on every route change (every screen
 * previously created its own instance via AppLayout, which is remounted per route).
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const value = useUserNotifications(user, { pageSize: 20 });

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}
