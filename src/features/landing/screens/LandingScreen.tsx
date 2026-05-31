import image_image_15 from '@/imports/image_15.png'
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, ArrowRight, Star, Code, Palette, BarChart2, PenTool, Cpu, Film, Shield, Zap, Bot, Globe, Sparkles, Twitter, Linkedin, Github, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { ParticleBackground } from '../../../shared/components/ParticleBackground';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { MARKET_INSIGHTS } from '../../../mock_backend';
import '../styles/landing-screen.css';

const CATEGORIES = [
  { name: 'Web Development', icon: <Code size={22} />, jobs: '8,921', color: '#0077FF' },
  { name: 'UI/UX Design', icon: <Palette size={22} />, jobs: '6,543', color: '#9F4BFF' },
  { name: 'Data Science', icon: <BarChart2 size={22} />, jobs: '4,210', color: '#22C55E' },
  { name: 'AI & ML', icon: <Cpu size={22} />, jobs: '3,842', color: '#F59E0B' },
  { name: 'Content Writing', icon: <PenTool size={22} />, jobs: '5,128', color: '#0077FF' },
  { name: 'Video & Animation', icon: <Film size={22} />, jobs: '2,341', color: '#9F4BFF' },
];

const TESTIMONIALS = [
  {
    name: 'Jordan Mitchell', role: 'CTO, TechCorp', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=jordan&backgroundColor=b6e3f4',
    quote: 'GigBridge\'s AI matching found us a perfect React developer in under 2 hours. The quality was extraordinary and the AI screening saved us days of interviewing.',
    rating: 5,
  },
  {
    name: 'Alex Johnson', role: 'Senior Developer', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alex&backgroundColor=c0aede',
    quote: 'The AI Proposal Generator is a game-changer. My proposal acceptance rate went from 15% to 67%. GigBridge has transformed my freelance career.',
    rating: 5,
  },
  {
    name: 'Sarah Chen', role: 'UI/UX Designer', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=sarah&backgroundColor=d1d4f9',
    quote: 'Finally a platform that understands creative work. The AI interview feature lets clients see my personality and expertise before we even start.',
    rating: 5,
  },
];

const STATS = [
  { label: 'Active Freelancers', value: '52,847', icon: <Globe size={20} /> },
  { label: 'Projects Completed', value: '134,562', icon: <Shield size={20} /> },
  { label: 'Total Paid Out', value: '$28.4M', icon: <Zap size={20} /> },
  { label: 'Success Rate', value: '96.4%', icon: <Star size={20} /> },
];

export default function LandingScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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
      navigate(role === 0 ? '/client/dashboard' : '/freelancer/dashboard');
    }
    // Note: We don't auto-redirect to onboarding here to allow users to visit landing page
    // Users can manually navigate to /auth to continue onboarding
  }, [isAuthenticated, isOnboardingComplete, role, navigate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/jobs/browse${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  };

  return (
    <GuestLayout>
      <div className="relative min-h-screen overflow-hidden landing-hero-background">
        {/* Decorative Background Circles */}
        <div className="landing-hero-circle-1" />
        <div className="landing-hero-circle-2" />

        {/* Main Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* Top Bar */}
          

          {/* Main Hero Card */}
          <div className="landing-hero-card">
            {/* Gradient Orbs inside card */}
            <div className="landing-hero-orb-purple-inside" />
            <div className="landing-hero-orb-cyan-inside" />

            <div className="relative grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

              {/* Left Content */}
              <div className="space-y-6 lg:space-y-8 z-10">
                <div className="space-y-3">
                  <span className="badge-cyan inline-block">AI-Powered Marketplace</span>
                  <h1 className="landing-hero-title">
                    GigBridge
                  </h1>
                </div>

                <p className="landing-hero-description-new">
                  The world's first AI-powered freelance marketplace. Connect talent with intelligence — featuring smart matching, automated interviews, and AI-generated proposals.
                </p>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="landing-search-form">
                  <div className="relative flex items-center">
                    <Search size={18} className="absolute left-4 landing-search-icon" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search for React, Design, ML..."
                      className="landing-search-input-new"
                    />
                    <button type="submit" className="landing-search-button">
                      <span className="hidden sm:inline">Find Talent</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button className="landing-cta-primary" onClick={() => {
                    localStorage.setItem('selected_role', '1');
                    navigate('/auth/signup');
                  }}>
                    <Bot size={18} />
                    <span>Start as Freelancer</span>
                    <ArrowRight size={18} />
                  </button>
                  <button className="landing-cta-secondary" onClick={() => {
                    localStorage.setItem('selected_role', '0');
                    navigate('/auth/signup');
                  }}>
                    Hire Top Talent
                  </button>
                </div>
              </div>

              {/* Right Image */}
              <div className="relative z-10 hidden lg:block">
                <div className="landing-hero-image-wrapper">
                  <img
                    src={image_image_15}
                    alt="AI-powered workspace"
                    className="landing-hero-image"
                  />
                  <div className="landing-hero-image-glow" />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Stats Section */}
        <section className="relative z-10 py-12 sm:py-16 lg:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {STATS.map(stat => (
                <div key={stat.label} className="landing-stat-card">
                  <div className="flex justify-center mb-2 sm:mb-3 landing-stats-icon">{stat.icon}</div>
                  <p className="text-2xl sm:text-3xl font-black text-primary mb-1">{stat.value}</p>
                  <p className="text-xs sm:text-sm landing-stats-label">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="relative z-10 py-12 sm:py-16 lg:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 lg:mb-14">
              <span className="badge-cyan mb-3 sm:mb-4 inline-block">How It Works</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary mt-2 sm:mt-3">AI-Powered Workflow</h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base landing-section-desc">From posting to payment — intelligence at every step</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {[
                { step: '01', title: 'Post or Find', desc: 'Clients describe their project with AI assistance. Freelancers browse AI-matched opportunities with compatibility scores.', icon: <Search size={24} />, color: 'cyan' },
                { step: '02', title: 'AI Matching', desc: 'Our neural network analyzes 200+ signals to match the perfect talent. AI Instant Interviews replace boring applications.', icon: <Bot size={24} />, color: 'purple' },
                { step: '03', title: 'Build & Pay', desc: 'Collaborate in our secure workspace with milestone payments, real-time chat, and AI work assistance throughout.', icon: <Shield size={24} />, color: 'green' },
              ].map((step, i) => (
                <div key={i} className="glass-card p-5 sm:p-6 text-center relative overflow-hidden">
                  <div className="absolute -top-3 -right-3 text-6xl sm:text-7xl lg:text-8xl font-black opacity-5 text-primary">{step.step}</div>
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center landing-step-icon-bg-${step.color}`}>
                    <span className={`landing-step-icon-${step.color}`}>{step.icon}</span>
                  </div>
                  <div className="badge-cyan mb-2 sm:mb-3 inline-block text-xs">Step {step.step}</div>
                  <h3 className="text-primary text-lg sm:text-xl font-bold mb-2 sm:mb-3">{step.title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed landing-step-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 landing-section-bg-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 lg:mb-14">
              <span className="badge-purple mb-3 sm:mb-4 inline-block">Top Categories</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary mt-2 sm:mt-3">Explore Opportunities</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {CATEGORIES.map((cat, i) => {
                const colorClass = cat.color === '#0077FF' ? 'cyan' : cat.color === '#9F4BFF' ? 'purple' : cat.color === '#22C55E' ? 'green' : 'amber';
                return (
                  <button key={i} className="glass-card p-4 sm:p-5 lg:p-6 text-left group" onClick={() => navigate(`/jobs/browse?cat=${cat.name}`)}>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-all landing-category-icon-bg-${colorClass}`}>
                      <span className={`landing-category-icon-${colorClass}`}>{cat.icon}</span>
                    </div>
                    <h3 className="text-primary font-semibold text-sm sm:text-base mb-1">{cat.name}</h3>
                    <p className="text-xs landing-category-jobs">{cat.jobs} open jobs</p>
                    <ArrowRight size={14} className={`mt-2 sm:mt-3 transition-transform group-hover:translate-x-1 landing-category-arrow-${colorClass}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Market Insights Preview ── */}
        <section className="relative z-10 py-12 sm:py-16 lg:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
              <div className="flex-1 w-full">
                <span className="badge-green mb-3 sm:mb-4 inline-block">Live Market Data</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary mt-2 sm:mt-3 mb-3 sm:mb-4">AI Market Insights</h2>
                <p className="mb-5 sm:mb-6 text-sm sm:text-base landing-market-desc">
                  Make data-driven decisions with real-time market intelligence. See trending skills,
                  average rates, and demand forecasts powered by our AI.
                </p>
                <div className="space-y-3 sm:space-y-4">
                  {MARKET_INSIGHTS.trendingCategories.slice(0, 4).map((cat, i) => (
                    <div key={i} className="flex items-center gap-3 sm:gap-4">
                      <span className="text-lg sm:text-xl flex-shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1 gap-2">
                          <span className="text-xs sm:text-sm text-primary font-medium truncate">{cat.name}</span>
                          <span className="text-xs font-bold landing-market-growth flex-shrink-0">{cat.growth}</span>
                        </div>
                        <div className="progress-bar-gb">
                          <div className="progress-bar-gb-fill" style={{ width: `${Math.min((cat.jobs / 10000) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-medium landing-market-jobs-count hidden sm:inline flex-shrink-0">{cat.jobs.toLocaleString()} jobs</span>
                    </div>
                  ))}
                </div>
                <button className="btn-ghost-cyan mt-5 sm:mt-6 px-5 sm:px-6 py-2 text-xs sm:text-sm" onClick={() => navigate('/market-insights')}>
                  View Full Report →
                </button>
              </div>
              <div className="flex-1 w-full grid grid-cols-2 gap-3 sm:gap-4">
                {MARKET_INSIGHTS.averageRatesBySkill.slice(0, 4).map((skill, i) => (
                  <div key={i} className="glass-card p-4 sm:p-5">
                    <p className="text-primary font-semibold text-xs sm:text-sm mb-1 truncate">{skill.skill}</p>
                    <p className="text-xl sm:text-2xl font-black mb-1 landing-market-rate">${skill.rate}<span className="text-xs sm:text-sm text-primary opacity-50">/hr</span></p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full landing-market-demand-dot" />
                      <span className="text-xs landing-market-demand-text truncate">High {skill.demand}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 landing-section-bg-subtle">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 lg:mb-14">
              <span className="badge-cyan mb-3 sm:mb-4 inline-block">Testimonials</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary mt-2 sm:mt-3">Loved by Thousands</h2>
            </div>

            <div className="glass-card neon-border-cyan p-5 sm:p-6 lg:p-8 mb-5 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <img src={TESTIMONIALS[activeTestimonial].avatar} alt=""
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full avatar-glow flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} fill="#F59E0B" className="landing-star-icon" />
                    ))}
                  </div>
                  <p className="text-primary text-sm sm:text-base lg:text-lg leading-relaxed mb-4">"{TESTIMONIALS[activeTestimonial].quote}"</p>
                  <div>
                    <p className="text-primary font-semibold text-sm sm:text-base">{TESTIMONIALS[activeTestimonial].name}</p>
                    <p className="text-xs sm:text-sm landing-testimonial-role">{TESTIMONIALS[activeTestimonial].role}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 sm:gap-3">
              {TESTIMONIALS.map((t, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`flex items-center gap-2 p-2 rounded-xl transition-all border ${activeTestimonial === i ? 'landing-testimonial-nav-active' : 'landing-testimonial-nav-inactive'}`}>
                  <img src={t.avatar} alt={t.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
                  <span className={`text-xs sm:text-sm hidden sm:block ${activeTestimonial === i ? 'landing-ai-badge-text' : 'landing-stats-label'}`}>{t.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative z-10 py-16 sm:py-20 lg:py-24 px-4 text-center overflow-hidden">
          <div className="absolute inset-0 landing-cta-bg" />
          <div className="relative max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-primary mb-4 sm:mb-6">
              Ready to Build the Future?
            </h2>
            <p className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 landing-cta-desc px-4">
              Join 52,000+ freelancers and 18,000+ clients on the world's most intelligent marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <button className="btn-cyan px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base flex items-center gap-2 justify-center"
                onClick={() => {
                  localStorage.setItem('selected_role', '1');
                  navigate('/auth/signup');
                }}>
                Start as Freelancer <ArrowRight size={18} />
              </button>
              <button className="btn-ghost-cyan px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base"
                onClick={() => {
                  localStorage.setItem('selected_role', '0');
                  navigate('/auth/signup');
                }}>
                Hire Top Talent
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main Footer Content */}
            <div className="py-12 sm:py-16 lg:py-20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

                {/* Company Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan to-purple">
                      <Zap size={16} className="text-white" />
                    </div>
                    <span className="text-primary font-bold text-lg">GigBridge</span>
                    <span className="badge-cyan text-xs">AI</span>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">
                    The world's first AI-powered freelance marketplace connecting top talent with innovative companies.
                  </p>
                  <div className="flex gap-3">
                    {[
                      { icon: <Twitter size={18} />, href: '#', label: 'Twitter' },
                      { icon: <Linkedin size={18} />, href: '#', label: 'LinkedIn' },
                      { icon: <Github size={18} />, href: '#', label: 'GitHub' },
                      { icon: <Instagram size={18} />, href: '#', label: 'Instagram' },
                    ].map((social, i) => (
                      <a
                        key={i}
                        href={social.href}
                        aria-label={social.label}
                        className="w-10 h-10 rounded-lg glass-button flex items-center justify-center hover:bg-cyan/10 transition-all group"
                      >
                        <span className="text-muted group-hover:text-cyan transition-colors">{social.icon}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Platform */}
                <div>
                  <h3 className="text-primary font-semibold mb-4">Platform</h3>
                  <ul className="space-y-3">
                    {[
                      { label: 'Find Jobs', path: '/jobs/browse' },
                      { label: 'Hire Talent', path: '/auth' },
                      { label: 'AI Features', path: '/ai-assistant' },
                      { label: 'Market Insights', path: '/market-insights' },
                      { label: 'Categories', path: '/jobs/browse' },
                    ].map((link, i) => (
                      <li key={i}>
                        <button
                          onClick={() => navigate(link.path)}
                          className="text-sm text-secondary hover:text-cyan transition-colors"
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h3 className="text-primary font-semibold mb-4">Company</h3>
                  <ul className="space-y-3">
                    {[
                      { label: 'About Us', path: '/about' },
                      { label: 'Careers', path: '/careers' },
                      { label: 'FAQ', path: '/faq' },
                      { label: 'Press Kit', path: '/press-kit' },
                      { label: 'Guide', path: '/guide' },
                    ].map((link, i) => (
                      <li key={i}>
                        <button
                          onClick={() => navigate(link.path)}
                          className="text-sm text-secondary hover:text-cyan transition-colors"
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Newsletter */}
                <div>
                  <h3 className="text-primary font-semibold mb-4">Stay Updated</h3>
                  <p className="text-sm text-secondary mb-4">
                    Get the latest updates on AI features, market trends, and platform news.
                  </p>
                  <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); alert('Thanks for subscribing!'); }}>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="input-gb w-full py-2.5 text-sm pl-10"
                        required
                      />
                    </div>
                    <button type="submit" className="btn-cyan w-full py-2.5 text-sm">
                      Subscribe
                    </button>
                  </form>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <MapPin size={14} className="text-muted flex-shrink-0" />
                      <span>San Francisco, CA 94102</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <Phone size={14} className="text-muted flex-shrink-0" />
                      <span>+1 (555) 123-4567</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10 py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs text-secondary">
                  © 2026 GigBridge. All rights reserved.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                  {[
                    { label: 'Privacy Policy', path: '/' },
                    { label: 'Terms of Service', path: '/' },
                    { label: 'Cookie Policy', path: '/' },
                    { label: 'Security', path: '/' },
                  ].map((link, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(link.path)}
                      className="text-xs text-secondary hover:text-cyan transition-colors"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </GuestLayout>
  );
}