import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';

// Import components
import { TopNav } from '../../../shared/components/TopNav';
import Hero from '../components/Hero';
import About from '../components/About';
import Features from '../components/Features';
import Story from '../components/Story';
import Contact from '../components/Contact';
import { Footer } from '../../../shared/components/Footer';

// Import stylesheet
import '../styles/landing-page-premium-v2.css';

export default function LandingPagePremium() {
  const navigate = useNavigate();

  // Safely get app context
  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const isAuthenticated = appContext?.isAuthenticated || false;
  const isOnboardingComplete = appContext?.isOnboardingComplete || false;
  const role = appContext?.role || null;

  // Auto-redirect if user is logged in
  useEffect(() => {
    if (isAuthenticated && isOnboardingComplete) {
      const dashboardPath = role === 1 ? '/freelancer/dashboard' : '/client/dashboard';
      navigate(dashboardPath);
    }
  }, [isAuthenticated, isOnboardingComplete, role, navigate]);

  return (
    <GuestLayout excludeMeshGradient>
      <main className="relative min-h-screen w-screen overflow-x-hidden bg-background text-foreground transition-colors duration-300">
        <TopNav />
        <Hero />
        <About />
        <Features />
        <Story />
        <Contact />
        <Footer />
      </main>
    </GuestLayout>
  );
}
