import React, { useState } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { useApp } from '../../app/providers/AppProvider';
import { AIAssistantWidget } from '../../features/ai-assistant';
import { MeshGradientBackground } from './MeshGradientBackground';
import '../styles/AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  fullWidth?: boolean;
  excludeMeshGradient?: boolean;
  hideAIWidget?: boolean;
  hideTopNav?: boolean;
  mainClassName?: string;
}

export function AppLayout({
  children,
  showSidebar = true,
  fullWidth = false,
  excludeMeshGradient = false,
  hideAIWidget = false,
  hideTopNav = false,
  mainClassName = '',
}: AppLayoutProps) {
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    try {
      return localStorage.getItem('sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => isSidebarPinned);

  // Safely get app context - might throw if not within provider
  let user = null;
  try {
    const appContext = useApp();
    user = appContext.user;
  } catch (e) {
    // Context not available - guest mode
    user = null;
  }
  
  const hasSidebar = !hideTopNav && showSidebar && !!user;

  const togglePin = () => {
    const nextPinned = !isSidebarPinned;
    setIsSidebarPinned(nextPinned);
    try {
      localStorage.setItem('sidebar_pinned', String(nextPinned));
    } catch {
      /* ignore */
    }
    if (nextPinned) {
      setIsSidebarOpen(true);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    if (isSidebarPinned) return;
    setIsSidebarOpen(false);
  };

  const forceCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {!hideTopNav ? (
        <TopNav onMenuClick={toggleSidebar} showMenuButton={hasSidebar} />
      ) : null}

      <div className={`app-layout-content ${hideTopNav ? 'no-top-nav' : ''}`}>
        {hasSidebar && (
          <>
            <Sidebar
              isOpen={isSidebarOpen || isSidebarPinned}
              onClose={isSidebarPinned ? undefined : forceCloseSidebar}
              isPinned={isSidebarPinned}
              onTogglePin={togglePin}
            />
            {/* Overlay for mobile (only active when unpinned) */}
            {isSidebarOpen && !isSidebarPinned && (
              <div 
                className="sidebar-overlay" 
                onClick={closeSidebar}
                aria-hidden="true"
              />
            )}
          </>
        )}

        <main
          className={`app-layout-main ${hideTopNav ? 'no-top-nav' : ''} ${hasSidebar ? 'with-sidebar' : ''} ${isSidebarOpen || isSidebarPinned ? 'sidebar-open' : ''} ${fullWidth ? 'full-width' : ''} ${mainClassName}`}
        >
          {excludeMeshGradient ? (
            children
          ) : (
            <MeshGradientBackground className="min-h-[calc(100vh-6rem)] p-3 sm:p-6">
              {children}
            </MeshGradientBackground>
          )}
        </main>
      </div>

      {user && !hideTopNav && !hideAIWidget && <AIAssistantWidget />}
    </div>
  );
}

// Guest layout (no sidebar)
export function GuestLayout({
  children,
  excludeMeshGradient = false,
}: {
  children: React.ReactNode;
  excludeMeshGradient?: boolean;
}) {
  return (
    <div className="guest-layout">
      <TopNav />
      <main className="guest-layout-main">
        {excludeMeshGradient ? (
          children
        ) : (
          <MeshGradientBackground className="min-h-[calc(100vh-6rem)] p-3 sm:p-6 m-2 sm:m-4">
            {children}
          </MeshGradientBackground>
        )}
      </main>
    </div>
  );
}
