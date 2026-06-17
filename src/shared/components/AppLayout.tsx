import React, { useState } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { useApp } from '../../app/providers/AppProvider';
import { AIAssistantWidget } from '../../features/ai-assistant';
import '../styles/AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  fullWidth?: boolean;
}

export function AppLayout({ children, showSidebar = true, fullWidth = false }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Safely get app context - might throw if not within provider
  let user = null;
  try {
    const appContext = useApp();
    user = appContext.user;
  } catch (e) {
    // Context not available - guest mode
    user = null;
  }
  
  const hasSidebar = showSidebar && !!user;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      <TopNav onMenuClick={toggleSidebar} showMenuButton={hasSidebar} />

      <div className="app-layout-content">
        {hasSidebar && (
          <>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            {/* Overlay for mobile */}
            {isSidebarOpen && (
              <div 
                className="sidebar-overlay" 
                onClick={closeSidebar}
                aria-hidden="true"
              />
            )}
          </>
        )}

        <main
          className={`app-layout-main ${hasSidebar ? 'with-sidebar' : ''} ${isSidebarOpen ? 'sidebar-open' : ''} ${fullWidth ? 'full-width' : ''}`}
        >
          {children}
        </main>
      </div>

      {user && <AIAssistantWidget />}
    </div>
  );
}

// Guest layout (no sidebar)
export function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="guest-layout">
      <TopNav />
      <main className="guest-layout-main">
        {children}
      </main>
    </div>
  );
}