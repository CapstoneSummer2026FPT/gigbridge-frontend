import { useState, useRef, useEffect, MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Building2,
  UserCheck,
  FileText,
  Search,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Zap,
  Lock,
  Star,
  Play,
  Pause,
  Compass
} from 'lucide-react';
import '../../../shared/components/styles/conic-border-button.css';

interface BentoTiltProps {
  children: ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

function BentoTilt({ children, className = '', onMouseEnter, onMouseLeave, onClick }: BentoTiltProps) {
  const [transformStyle, setTransformStyle] = useState('');
  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!itemRef.current) return;

    const { left, top, width, height } = itemRef.current.getBoundingClientRect();

    const relativeX = (event.clientX - left) / width;
    const relativeY = (event.clientY - top) / height;

    const tiltX = (relativeY - 0.5) * 6;
    const tiltY = (relativeX - 0.5) * -6;

    const newTransform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(.98, .98, .98)`;
    setTransformStyle(newTransform);
  };

  const handleMouseLeave = () => {
    setTransformStyle('');
    if (onMouseLeave) onMouseLeave();
  };

  return (
    <div
      ref={itemRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ transform: transformStyle }}
    >
      {children}
    </div>
  );
}

export default function HowItWorks() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'client' | 'freelancer'>('client');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  const stepBadgeText = t('landing.howItWorks.stepBadge');

  // Auto-guide step cycling & tab swiper logic
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveStep((prevStep) => {
        if (prevStep < 2) {
          return prevStep + 1;
        } else {
          // Swipe to next tab when step 3 finishes
          setActiveTab((prevTab) => (prevTab === 'client' ? 'freelancer' : 'client'));
          return 0;
        }
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleTabChange = (tab: 'client' | 'freelancer') => {
    setActiveTab(tab);
    setActiveStep(0);
  };

  const clientSteps = [
    {
      num: '01',
      badge: `${stepBadgeText} 01`,
      icon: FileText,
      title: t('landing.howItWorks.client.step1.title'),
      desc: t('landing.howItWorks.client.step1.desc'),
      renderMiniUi: (isActive: boolean) => (
        <div className="mt-5 rounded-xl border border-border/50 bg-secondary/20 p-4 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 flex items-center gap-1.5 font-general">
              <Zap className={`size-3 text-primary ${isActive ? 'animate-bounce' : ''}`} /> AI Scope Engine
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Verified Draft
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-foreground tracking-tight">
            E-Commerce & AI Assistant Architecture
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-border/30 text-muted-foreground">
            <span className="font-mono font-medium text-foreground">
              $1,500 – $3,000 USD
            </span>
            <div className="flex gap-1.5">
              <span className="rounded-md bg-background/80 px-2 py-0.5 text-[9px] font-mono font-medium border border-border/60 text-foreground">React</span>
              <span className="rounded-md bg-background/80 px-2 py-0.5 text-[9px] font-mono font-medium border border-border/60 text-foreground">Node.js</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      badge: `${stepBadgeText} 02`,
      icon: UserCheck,
      title: t('landing.howItWorks.client.step2.title'),
      desc: t('landing.howItWorks.client.step2.desc'),
      renderMiniUi: () => (
        <div className="mt-5 rounded-xl border border-border/50 bg-secondary/20 p-4 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-[11px]">
                AR
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Alex Rivera</p>
                <p className="text-[10px] text-muted-foreground">Principal Architect</p>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
              98% Match
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2 text-[11px]">
            <span className="flex items-center gap-1 font-mono font-medium text-foreground">
              <Star className="size-3 text-amber-400 fill-amber-400" /> 4.98 <span className="text-muted-foreground">(42 jobs)</span>
            </span>
          </div>
        </div>
      ),
    },
    {
      num: '03',
      badge: `${stepBadgeText} 03`,
      icon: ShieldCheck,
      title: t('landing.howItWorks.client.step3.title'),
      desc: t('landing.howItWorks.client.step3.desc'),
      renderMiniUi: (isActive: boolean) => (
        <div className="mt-5 rounded-xl border border-border/50 bg-secondary/20 p-4 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 flex items-center gap-1.5 font-general">
              <Lock className="size-3 text-primary" /> Milestone #1 Escrow
            </span>
            <span className="text-xs font-mono font-bold text-foreground">$800.00</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-secondary/80 overflow-hidden p-0.5 border border-border/40">
            <div className={`h-full rounded-full bg-foreground transition-all duration-1000 ${isActive ? 'w-4/5' : 'w-1/4'}`} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground font-medium">
              <CheckCircle2 className={`size-3 ${isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} /> Legal e-Sign Contract
            </span>
            <span className="font-mono font-semibold text-foreground">{isActive ? '80% Approved' : 'Pending'}</span>
          </div>
        </div>
      ),
    },
  ];

  const freelancerSteps = [
    {
      num: '01',
      badge: `${stepBadgeText} 01`,
      icon: Building2,
      title: t('landing.howItWorks.freelancer.step1.title'),
      desc: t('landing.howItWorks.freelancer.step1.desc'),
      renderMiniUi: () => (
        <div className="mt-5 rounded-xl border border-border/50 bg-secondary/20 p-4 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-[10px]">
                PRO
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Verified Profile</p>
                <p className="text-[10px] text-muted-foreground">Identity & Skills Checked</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Verified
            </span>
          </div>
          <div className="mt-3 flex gap-1.5 pt-2 border-t border-border/30">
            <span className="rounded-md bg-background/80 px-2 py-0.5 text-[9px] font-mono font-medium border border-border/60 text-foreground">Top Rated</span>
            <span className="rounded-md bg-background/80 px-2 py-0.5 text-[9px] font-mono font-medium border border-border/60 text-foreground">Fast Response</span>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      badge: `${stepBadgeText} 02`,
      icon: Search,
      title: t('landing.howItWorks.freelancer.step2.title'),
      desc: t('landing.howItWorks.freelancer.step2.desc'),
      renderMiniUi: (isActive: boolean) => (
        <div className="mt-5 rounded-xl border border-border/50 bg-secondary/20 p-4 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 flex items-center gap-1.5 font-general">
              <Sparkles className={`size-3 text-primary ${isActive ? 'animate-pulse' : ''}`} /> Smart Matching
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
              High Fit
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-foreground tracking-tight line-clamp-1">
            Senior Frontend Engineer Project
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-border/30">
            <span className="font-mono font-bold text-foreground">$2,400 USD</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-colors ${isActive ? 'bg-foreground text-background shadow-sm' : 'bg-secondary text-muted-foreground'}`}>
              Quick Apply
            </span>
          </div>
        </div>
      ),
    },
    {
      num: '03',
      badge: `${stepBadgeText} 03`,
      icon: TrendingUp,
      title: t('landing.howItWorks.freelancer.step3.title'),
      desc: t('landing.howItWorks.freelancer.step3.desc'),
      renderMiniUi: (isActive: boolean) => (
        <div className="mt-5 rounded-xl border border-border/50 bg-secondary/20 p-4 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-general">
              <CheckCircle2 className="size-3" /> Payout Approved
            </span>
            <span className="font-mono font-bold text-foreground text-xs">+$1,200.00</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2 text-[10px]">
            <span className="flex items-center gap-1 font-mono font-bold text-foreground">
              <Star className="size-3 text-amber-400 fill-amber-400" /> 5.0 Rating
            </span>
            <span className={`font-mono font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>+150 Points</span>
          </div>
        </div>
      ),
    },
  ];

  const currentSteps = activeTab === 'client' ? clientSteps : freelancerSteps;

  return (
    <section id="how-it-works" className="relative w-full py-24 px-5 md:px-10 overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Ambient background radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[550px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[140px]" />

      <div className="mx-auto max-w-7xl flex flex-col items-center">
        {/* Section Badge & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="border-hsla flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-general uppercase tracking-widest text-foreground shadow-sm">
            <Compass className="size-3.5 text-primary" />
            <span className="font-semibold">{t('landing.howItWorks.badge')}</span>
          </div>

          <h2
            className="mt-5 font-zentry text-3xl font-black uppercase tracking-wide text-foreground md:text-6xl text-center"
            dangerouslySetInnerHTML={{ __html: t('landing.howItWorks.animatedTitle') }}
          />

          <p className="mt-4 max-w-xl font-circular-web text-base text-muted-foreground">
            {t('landing.howItWorks.subtitle')}
          </p>
        </div>

        {/* Dynamic Dual-Tab Selector & Auto-Play Control */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center rounded-full bg-secondary/80 p-1.5 border border-border/80 shadow-sm backdrop-blur-md">
            <button
              onClick={() => handleTabChange('client')}
              className={`flex items-center gap-2.5 rounded-full px-7 py-3 text-xs font-general uppercase tracking-wider transition-all duration-300 ${activeTab === 'client'
                  ? 'bg-foreground text-background shadow-md font-bold scale-100'
                  : 'text-muted-foreground hover:text-foreground font-semibold'
                }`}
            >
              <Building2 className="size-4" />
              <span>{t('landing.howItWorks.tabClient')}</span>
            </button>

            <button
              onClick={() => handleTabChange('freelancer')}
              className={`flex items-center gap-2.5 rounded-full px-7 py-3 text-xs font-general uppercase tracking-wider transition-all duration-300 ${activeTab === 'freelancer'
                  ? 'bg-foreground text-background shadow-md font-bold scale-100'
                  : 'text-muted-foreground hover:text-foreground font-semibold'
                }`}
            >
              <UserCheck className="size-4" />
              <span>{t('landing.howItWorks.tabFreelancer')}</span>
            </button>
          </div>

          {/* Toggle Auto Tour Button */}
          <button
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            className="flex items-center gap-2 rounded-full bg-secondary/60 border border-border/80 px-4 py-3 text-xs font-general uppercase tracking-widest text-muted-foreground transition-all hover:text-foreground hover:bg-secondary"
            title={isAutoPlaying ? 'Pause Auto Guide' : 'Play Auto Guide'}
          >
            {isAutoPlaying ? (
              <>
                <Pause className="size-3.5 text-primary animate-pulse" />
                <span className="text-[10px] font-bold">Auto Guide: ON</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold">Auto Guide: OFF</span>
              </>
            )}
          </button>
        </div>

        {/* 3D Interactive Pipeline Grid with Gated Step Conic Border Animation */}
        <div className="relative mt-16 w-full">
          {/* Desktop Connecting Line & Traveling Laser Light Pulse */}
          <div className="pointer-events-none absolute top-1/2 left-[12%] right-[12%] hidden -translate-y-1/2 md:block z-0">
            {/* Base dashed pipeline */}
            <div className="h-[2px] w-full border-t-2 border-dashed border-border/40" />

            {/* Active Traveling Energy Light Beam */}
            <div
              className="absolute top-[-1px] left-0 h-[4px] w-1/3 rounded-full bg-gradient-to-r from-transparent via-foreground to-transparent shadow-[0_0_20px_rgba(255,255,255,0.9)] dark:shadow-[0_0_20px_rgba(255,255,255,0.7)] transition-transform duration-700 ease-in-out will-change-transform"
              style={{
                transform: `translate3d(${activeStep * 100}%, 0, 0)`,
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 relative z-10">
            {currentSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;

              return (
                <div
                  key={idx}
                  className={`relative rounded-3xl transition-all duration-500 ${
                    isActive
                      ? 'conic-border-wrap p-[2px] shadow-[0_0_40px_rgba(73,75,231,0.4)] dark:shadow-[0_0_40px_rgba(255,255,255,0.18)] scale-[1.03] z-20'
                      : 'border border-border/50 hover:border-border/80 hover:scale-[1.01] opacity-75 grayscale-[15%] hover:opacity-100 hover:grayscale-0 p-0'
                  }`}
                >
                  <BentoTilt
                    onMouseEnter={() => setIsAutoPlaying(false)}
                    onMouseLeave={() => setIsAutoPlaying(true)}
                    onClick={() => setActiveStep(idx)}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-[calc(1.5rem-2px)] bg-card text-card-foreground p-7 transition-all duration-500 backdrop-blur-xl cursor-pointer w-full h-full ${
                      isActive ? 'bg-gradient-to-b from-card via-card to-secondary/30' : ''
                    }`}
                  >
                    {/* Top Accent Line - ONLY runs animation when isActive */}
                    {isActive && (
                      <div className="absolute left-0 top-0 h-[3px] w-full bg-foreground shadow-[0_0_12px_rgba(255,255,255,0.9)] transition-all duration-500" />
                    )}

                    {/* Background Watermark Number */}
                    <span
                      className={`pointer-events-none absolute -right-4 -bottom-6 font-zentry text-9xl font-black transition-all duration-700 select-none ${
                        isActive ? 'text-foreground/15 scale-110' : 'text-foreground/5 group-hover:text-primary/10'
                      }`}
                    >
                      {step.num}
                    </span>

                    <div className="relative z-10">
                      {/* Unique Header Chip & Icon */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex items-center gap-2 rounded-full px-3.5 py-1 font-general text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                            isActive
                              ? 'bg-foreground text-background shadow-lg scale-105'
                              : 'bg-secondary/80 text-muted-foreground border border-border/60'
                          }`}
                        >
                          {isActive && <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />}
                          <span>{step.badge}</span>
                        </div>

                        <div
                          className={`flex size-12 items-center justify-center rounded-2xl transition-all duration-500 shadow-sm ${
                            isActive
                              ? 'bg-foreground text-background scale-110 shadow-xl border border-foreground/20'
                              : 'bg-secondary text-muted-foreground border border-border/60 group-hover:text-foreground'
                          }`}
                        >
                          <Icon className="size-6" />
                        </div>
                      </div>

                      {/* Step Title & Description */}
                      <h3
                        className={`mt-6 font-zentry text-2xl font-bold uppercase tracking-wide transition-colors duration-300 ${
                          isActive ? 'text-foreground font-black' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                      >
                        {step.title}
                      </h3>

                      <p className="mt-2.5 font-circular-web text-xs leading-relaxed text-muted-foreground">
                        {step.desc}
                      </p>

                      {/* Mini-UI Feature Preview Card (Pass isActive) */}
                      {step.renderMiniUi(isActive)}
                    </div>

                    {/* Step Footer Status Indicator */}
                    <div className="relative z-10 mt-6 flex items-center justify-between pt-4 border-t border-border/40 text-xs text-muted-foreground font-general uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className={`size-2 rounded-full transition-all ${
                            isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'
                          }`}
                        />
                        <span className={isActive ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                          {isActive ? 'Step Guide Active' : t('landing.howItWorks.badge')}
                        </span>
                      </span>
                      <span className={`font-mono font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {idx + 1} / 3
                      </span>
                    </div>

                    {/* Step Progress Line - ONLY runs countdown animation when step is active */}
                    {isActive && isAutoPlaying && (
                      <div className="absolute bottom-0 left-0 h-[2.5px] w-full bg-secondary overflow-hidden">
                        <div className="h-full bg-foreground animate-[progress_3.2s_linear_infinite]" />
                      </div>
                    )}
                  </BentoTilt>
                </div>
              );
            })}
          </div>
        </div>

        {/* High-Contrast Action Button */}
        <div className="mt-14 flex flex-col items-center gap-4">
          <button
            onClick={() => navigate('/auth/login')}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-foreground px-9 py-4 text-xs font-general uppercase tracking-widest text-background shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
          >
            <span className="font-bold">
              {activeTab === 'client'
                ? t('landing.howItWorks.client.cta')
                : t('landing.howItWorks.freelancer.cta')}
            </span>
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
