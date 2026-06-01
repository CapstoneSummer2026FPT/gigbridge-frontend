import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'motion/react';
import {
  Search, ArrowRight, Star, Code, Palette, BarChart2, PenTool, Cpu, Film,
  Shield, Zap, Bot, Globe, Sparkles, CheckCircle, Users, TrendingUp,
  Clock, Award, Target, Rocket, Video, MessageSquare, ChevronRight
} from 'lucide-react';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { Footer } from '../../../shared/components/Footer';
import { useApp } from '../../../app/providers/AppProvider';
import '../styles/landing-screen-new.css';

const CATEGORIES = [
  { name: 'Web Development', icon: <Code size={24} />, jobs: '8.9K+', growth: '+23%', color: 'cyan' },
  { name: 'UI/UX Design', icon: <Palette size={24} />, jobs: '6.5K+', growth: '+18%', color: 'purple' },
  { name: 'Data Science', icon: <BarChart2 size={24} />, jobs: '4.2K+', growth: '+31%', color: 'green' },
  { name: 'AI & ML', icon: <Cpu size={24} />, jobs: '3.8K+', growth: '+45%', color: 'amber-400' },
  { name: 'Content Writing', icon: <PenTool size={24} />, jobs: '5.1K+', growth: '+12%', color: 'cyan' },
  { name: 'Video & Animation', icon: <Film size={24} />, jobs: '2.3K+', growth: '+28%', color: 'purple' },
];

const FEATURES = [
  {
    icon: <Bot size={32} />,
    title: 'AI-Powered Matching',
    description: 'Our advanced AI analyzes skills, experience, and project requirements to find perfect matches in seconds.',
    color: 'purple',
    stat: '10x Faster'
  },
  {
    icon: <Video size={32} />,
    title: 'AI Video Interview',
    description: 'Automated video interviews with AI analysis help clients evaluate candidates efficiently and accurately.',
    color: 'cyan',
    stat: '94% Satisfaction'
  },
  {
    icon: <Sparkles size={32} />,
    title: 'Smart Proposals',
    description: 'AI-generated proposal suggestions increase your acceptance rate and save hours of writing time.',
    color: 'green',
    stat: '3x Acceptance'
  },
  {
    icon: <Shield size={32} />,
    title: 'Secure Escrow',
    description: 'Protected payments with milestone-based release ensure both parties are safeguarded throughout the project.',
    color: 'amber-400',
    stat: '100% Safe'
  },
];

const HOW_IT_WORKS_CLIENT = [
  { step: '01', title: 'Post Your Job', desc: 'AI helps you write the perfect job description', icon: <PenTool size={24} /> },
  { step: '02', title: 'AI Interview Setup', desc: 'Create questions for automatic candidate screening', icon: <Bot size={24} /> },
  { step: '03', title: 'Review Matches', desc: 'Get ranked candidates based on AI analysis', icon: <Users size={24} /> },
  { step: '04', title: 'Start Working', desc: 'Secure escrow protects your investment', icon: <Rocket size={24} /> },
];

const HOW_IT_WORKS_FREELANCER = [
  { step: '01', title: 'Create Profile', desc: 'Showcase your skills and portfolio', icon: <Users size={24} /> },
  { step: '02', title: 'AI Interview', desc: 'Complete one-time video interview for all jobs', icon: <Video size={24} /> },
  { step: '03', title: 'Get Matched', desc: 'AI connects you with relevant opportunities', icon: <Target size={24} /> },
  { step: '04', title: 'Earn & Grow', desc: 'Build reputation and increase rates', icon: <TrendingUp size={24} /> },
];

const TESTIMONIALS = [
  {
    name: 'Jordan Mitchell',
    role: 'CTO, TechCorp',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=jordan',
    quote: 'AI matching found us a perfect developer in under 2 hours. The quality was extraordinary.',
    rating: 5,
    project: 'React Dashboard'
  },
  {
    name: 'Alex Johnson',
    role: 'Senior Developer',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alex',
    quote: 'My proposal acceptance rate went from 15% to 67%. GigBridge transformed my career.',
    rating: 5,
    project: 'E-commerce Platform'
  },
  {
    name: 'Sarah Chen',
    role: 'UI/UX Designer',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=sarah',
    quote: 'Finally a platform that understands creative work. AI interviews showcase my expertise.',
    rating: 5,
    project: 'Mobile App Design'
  },
];

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const duration = 2000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingScreenNew() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState<'client' | 'freelancer'>('client');
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();

  // Parallax effects
  const y1 = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/jobs/browse${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  };

  const stats = [
    { label: 'Active Freelancers', value: 52847, icon: <Users size={24} />, color: 'cyan' },
    { label: 'Projects Completed', value: 134562, icon: <CheckCircle size={24} />, color: 'green' },
    { label: 'Total Earnings', value: 28, suffix: 'M+', icon: <TrendingUp size={24} />, color: 'purple' },
    { label: 'Client Satisfaction', value: 96, suffix: '%', icon: <Star size={24} />, color: 'amber-400' },
  ];

  return (
    <GuestLayout>
      <div className="landing-new-container">
        {/* Hero Section */}
        <section className="landing-new-hero" ref={heroRef}>
          {/* Animated Background */}
          <div className="landing-new-bg-gradient" />
          <div className="landing-new-grid-pattern" />

          {/* Floating Elements */}
          <motion.div
            className="landing-new-float-element landing-new-float-1"
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="landing-new-float-element landing-new-float-2"
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            className="landing-new-hero-content"
            style={{ opacity }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-5xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-block mb-6"
              >
                <span className="landing-new-badge">
                  <Sparkles size={16} />
                  AI-Powered Freelance Marketplace
                </span>
              </motion.div>

              <h1 className="landing-new-hero-title">
                Find Perfect Talent.
                <br />
                <span className="landing-new-gradient-text">Powered by AI.</span>
              </h1>

              <p className="landing-new-hero-subtitle">
                Revolutionary platform connecting businesses with top freelancers through
                <br className="hidden sm:block" />
                intelligent matching, automated interviews, and secure escrow payments.
              </p>

              {/* Search Bar */}
              <motion.form
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="landing-new-search-container"
              >
                <div className="landing-new-search-wrapper">
                  <Search className="landing-new-search-icon" size={20} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for Web Developers, Designers, Writers..."
                    className="landing-new-search-input"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="landing-new-search-btn"
                  >
                    Search Jobs
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.form>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-4 justify-center mt-8"
              >
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    localStorage.setItem('selected_role', '1');
                    navigate('/auth/signup');
                  }}
                  className="landing-new-cta-primary"
                >
                  <Bot size={20} />
                  Start AI Interview
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/jobs/browse')}
                  className="landing-new-cta-secondary"
                >
                  Browse Talent
                  <ChevronRight size={18} />
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section className="landing-new-section">
          <div className="landing-new-stats-grid">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="landing-new-stat-card"
              >
                <div className={`landing-new-stat-icon landing-new-stat-icon-${stat.color}`}>
                  {stat.icon}
                </div>
                <div className="landing-new-stat-value">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="landing-new-stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-new-section">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="landing-new-section-badge">Features</span>
            <h2 className="landing-new-section-title">
              Why Choose <span className="landing-new-gradient-text">GigBridge</span>
            </h2>
            <p className="landing-new-section-subtitle">
              Revolutionary features powered by artificial intelligence
            </p>
          </motion.div>

          <div className="landing-new-features-grid">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, rotateY: 5, rotateX: 5 }}
                className="landing-new-feature-card"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className={`landing-new-feature-icon landing-new-feature-icon-${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="landing-new-feature-title">{feature.title}</h3>
                <p className="landing-new-feature-desc">{feature.description}</p>
                <div className={`landing-new-feature-stat landing-new-feature-stat-${feature.color}`}>
                  {feature.stat}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="landing-new-section landing-new-how-section">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="landing-new-section-badge">How It Works</span>
            <h2 className="landing-new-section-title">
              Get Started in <span className="landing-new-gradient-text">4 Simple Steps</span>
            </h2>
          </motion.div>

          {/* Toggle */}
          <div className="landing-new-toggle-container">
            <button
              onClick={() => setUserType('client')}
              className={`landing-new-toggle-btn ${userType === 'client' ? 'active' : ''}`}
            >
              For Clients
            </button>
            <button
              onClick={() => setUserType('freelancer')}
              className={`landing-new-toggle-btn ${userType === 'freelancer' ? 'active' : ''}`}
            >
              For Freelancers
            </button>
          </div>

          <div className="landing-new-timeline">
            {(userType === 'client' ? HOW_IT_WORKS_CLIENT : HOW_IT_WORKS_FREELANCER).map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="landing-new-timeline-item"
              >
                <div className="landing-new-timeline-line" />
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="landing-new-timeline-icon"
                >
                  {item.icon}
                </motion.div>
                <div className="landing-new-timeline-content">
                  <span className="landing-new-timeline-step">{item.step}</span>
                  <h3 className="landing-new-timeline-title">{item.title}</h3>
                  <p className="landing-new-timeline-desc">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Categories Section */}
        <section className="landing-new-section">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="landing-new-section-badge">Categories</span>
            <h2 className="landing-new-section-title">
              Explore <span className="landing-new-gradient-text">Top Categories</span>
            </h2>
          </motion.div>

          <div className="landing-new-categories-grid">
            {CATEGORIES.map((cat, index) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="landing-new-category-card"
                onClick={() => navigate('/jobs/browse')}
              >
                <div className={`landing-new-category-icon landing-new-category-icon-${cat.color}`}>
                  {cat.icon}
                </div>
                <h3 className="landing-new-category-name">{cat.name}</h3>
                <div className="landing-new-category-jobs">{cat.jobs} jobs</div>
                <div className={`landing-new-category-growth text-${cat.color}`}>{cat.growth}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="landing-new-section">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="landing-new-section-badge">Testimonials</span>
            <h2 className="landing-new-section-title">
              Loved by <span className="landing-new-gradient-text">Thousands</span>
            </h2>
          </motion.div>

          <div className="landing-new-testimonials-grid">
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, rotateY: 3 }}
                className="landing-new-testimonial-card"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="landing-new-testimonial-stars">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="landing-new-testimonial-quote">"{testimonial.quote}"</p>
                <div className="landing-new-testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.name} className="landing-new-testimonial-avatar" />
                  <div>
                    <div className="landing-new-testimonial-name">{testimonial.name}</div>
                    <div className="landing-new-testimonial-role">{testimonial.role}</div>
                    <div className="landing-new-testimonial-project">
                      <Award size={12} />
                      {testimonial.project}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-new-cta-section">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="landing-new-cta-container"
          >
            <div className="landing-new-cta-glow" />
            <h2 className="landing-new-cta-title">
              Ready to Transform Your Freelance Career?
            </h2>
            <p className="landing-new-cta-subtitle">
              Join thousands of freelancers and clients already using AI-powered matching
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/auth/signup')}
                className="landing-new-cta-btn-primary"
              >
                <Bot size={20} />
                Sign Up Free
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/about')}
                className="landing-new-cta-btn-secondary"
              >
                Learn More
                <ArrowRight size={18} />
              </motion.button>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </GuestLayout>
  );
}
