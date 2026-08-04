import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppProvider } from '../providers/AppProvider';
import { Toaster } from 'sonner';
import { PremiumStatusProvider } from '../../features/premium/hooks';

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-muted-foreground" role="status">
      Loading...
    </div>
  );
}

/**
 * Root Layout - Wrapper for all routes
 * This ensures all child routes have access to AppProvider context
 */
export function RootLayout() {
  return (
    <AppProvider>
      <PremiumStatusProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
        <Toaster position="top-right" richColors />
      </PremiumStatusProvider>
    </AppProvider>
  );
}
