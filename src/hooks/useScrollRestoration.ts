import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Hook to save and restore scroll position when navigating between pages
 * Uses sessionStorage to persist scroll positions across page navigations
 */
export function useScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    // Restore scroll position when component mounts
    const savedPosition = sessionStorage.getItem(`scroll-${location.pathname}`);
    if (savedPosition !== null) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }, 0);
    } else {
      // Scroll to top for new pages
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Save scroll position when navigating
  const saveScrollPosition = () => {
    sessionStorage.setItem(`scroll-${location.pathname}`, window.scrollY.toString());
  };

  return { saveScrollPosition };
}
