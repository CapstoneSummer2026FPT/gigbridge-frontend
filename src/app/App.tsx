import { RouterProvider } from 'react-router';
import { router } from './router';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import InstallAppPrompt from '../shared/components/InstallAppPrompt';

// Import global styles
import '../styles/index.css';
import '../styles/fonts.css';
import '../shared/styles/glass-effects.css';
import '../shared/styles/AppLayout.css';

// Import i18n configuration (must be imported before any component that uses translations)
import '../i18n';

/**
 * GigBridge App - AI-Powered Freelance Marketplace
 * Version: 1.0.5
 * Last Update: 2026-04-17 - Fixed AppProvider context propagation
 * 
 * Architecture:
 * - App.tsx: Entry point with RouterProvider
 * - router.tsx: Route definitions with RootLayout wrapping AppProvider
 * - AppProvider: Global state management (auth, user, theme)
 * 
 * ✅ FIXED: AppProvider now correctly wraps all routes inside RootLayout
 * ✅ Context propagates through React Router's Outlet to all screen components
 */
export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <InstallAppPrompt />
      <SpeedInsights />
      <Analytics />
    </>
  );
}