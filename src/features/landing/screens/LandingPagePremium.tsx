import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';

// Import components
import { TopNav } from '../../../shared/components/TopNav';
import GlassIcon from '../components/GlassIcon';
import Hero from '../components/Hero';
import About from '../components/About';
import HowItWorks from '../components/HowItWorks';
import CategoriesSection from '../components/CategoriesSection';
import Features from '../components/Features';
import Pathways from '../components/Pathways';
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

        {/* Floating Decorative 3D Glass Icon 2 - Near Features / Pathways */}
        <div className="absolute top-[44%] left-[1.5vw] z-0 hidden lg:block w-56 h-56 lg:w-72 lg:h-72 pointer-events-none opacity-40 lg:opacity-60 drop-shadow-2xl">
          <GlassIcon
            background="transparent"
            shape="Logo"
            logo="/img/logo.png"
            size={125}
            depth={15}
            speed={25}
            direction="Counterclockwise"
            backdrop={{ type: "None" }}
            glass={{ chromatic: 75, frost: 25, tint: "#ffffff" }}
          />
        </div>

        {/* Floating Decorative 3D Glass Icon 3 - Near Story / Contact / Footer */}
        <div className="absolute top-[80%] right-[2.5vw] z-0 hidden md:block w-44 h-44 lg:w-56 lg:h-56 pointer-events-none opacity-40 lg:opacity-60 drop-shadow-xl">
          <GlassIcon
            background="transparent"
            shape="Logo"
            logo="/img/logo.png"
            size={80}
            depth={10}
            speed={35}
            backdrop={{ type: "None" }}
            glass={{ chromatic: 50, frost: 15, tint: "#ffffff" }}
          />
        </div>

        <TopNav />
        <Hero />
        <About />
        <HowItWorks />
        <CategoriesSection />
        <Features />
        <Pathways />
        <Story />
        <Contact />
        <Footer />
      </main>
    </GuestLayout>
  );
}
