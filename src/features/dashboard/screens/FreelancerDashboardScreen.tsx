import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  Code2,
  Crown,
  FolderGit2,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../../app/providers/AppProvider';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount, GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { useFreelancerDashboard } from '../hooks/useFreelancerDashboard';
import { use3DTilt } from '../hooks/use3DTilt';
import { FreelancerDashboardOverview } from '../components/FreelancerDashboardOverview';
import { Dashboard3DBackground } from '../components/Dashboard3DBackground';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
import '../styles/freelancer-dashboard-screen.css';

const formatAxisAmount = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

export default function FreelancerDashboardScreen() {
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const {
    user,
    theme,
    userName,
    greeting,
    profileStrength,
    rating,
    profileTitle,
    skillsCount,
    portfolioCount,
    majorName,
    wallet,
    financialOverview,
    chartPeriod,
    setChartPeriod,
    earningsData,
    activeProjects,
    workStatusCounts,
    eloSummary,
    pendingMilestoneItems,
    projects,
    recommendedJobs,
    gaugeR,
    gaugeCircumference,
    gaugeOffset,
    isLoading,
    isFinancialLoading,
    error,
    financialError,
    navigate,
  } = useFreelancerDashboard();

  const hasFinancialActivity = Boolean(
    financialOverview
    && (
      financialOverview.totalAmount > 0
      || financialOverview.totalContractValue > 0
      || financialOverview.totalServiceFeePaid > 0
    ),
  );

  const {
    onMouseMove: handleGaugeMouseMove,
    onMouseLeave: handleGaugeMouseLeave,
    style: gaugeCardStyle,
  } = use3DTilt(5);

  return (
    <AppLayout excludeMeshGradient>
      <div className="bg-background min-h-screen relative w-full overflow-x-hidden">
        {/* Interactive 3D Canvas Mesh Background */}
        <Dashboard3DBackground />

        {/* Ambient Glowing Orbs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <div className="freelancer-dash-glow-orb freelancer-orb-purple absolute" />
          <div className="freelancer-dash-glow-orb freelancer-orb-cyan absolute" />
          <div className="freelancer-dash-glow-orb freelancer-orb-blue absolute" />
          <div className="absolute -top-10 -right-10 text-[20vw] font-black text-primary/[0.015] dark:text-primary/[0.008] freelancer-avant-heading uppercase leading-none">
            FREELANCER
          </div>
          <div className="absolute bottom-10 -left-20 text-[15vw] font-black text-secondary/[0.01] dark:text-secondary/[0.005] freelancer-avant-heading uppercase leading-none">
            GIGBRIDGE
          </div>
        </div>

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-10 space-y-12 sm:space-y-14">
          {/* Header Hero Section - Strictly preserved as requested */}
          <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 fl-stagger-up">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="inline-block text-brand font-bold tracking-[0.4em] uppercase text-xs">
                  Freelancer workspace
                </span>
                {!premiumStatus.loading && <PremiumStatusBadge active={premiumStatus.isPremium} />}
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-black freelancer-avant-heading freelancer-hero-text mb-6 uppercase tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                {userName || 'FREELANCER'}
              </h1>
              <p className="text-xl md:text-2xl text-text-secondary max-w-2xl leading-relaxed">
                {greeting} <span className="font-black text-text-primary">{userName}</span>.{' '}
                {isLoading ? (
                  <span className="opacity-50 animate-pulse">Loading your profile…</span>
                ) : (
                  <>
                    Your profile completion is{' '}
                    <span className="text-brand font-bold underline decoration-4 underline-offset-8">
                      {profileStrength}%
                    </span>.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 shrink-0">
              <button
                className="group glass-card h-14 sm:h-16 px-5 sm:px-6 rounded-2xl flex items-center gap-3 hover:!border-brand transition-all duration-300 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                onClick={() => navigate(premiumStatus.isPremium ? '/premium/freelancer' : '/premium/freelancer/pricing')}
              >
                <Crown size={17} className="text-purple shrink-0" />
                <span className="font-bold text-xs uppercase tracking-widest whitespace-nowrap">
                  {premiumStatus.isPremium ? 'Premium Hub' : 'Upgrade'}
                </span>
              </button>
              <button
                className="group glass-card !border-brand text-brand hover:!border-brand-hover hover:text-brand-hover hover:bg-brand-soft h-14 sm:h-16 px-6 sm:px-8 rounded-2xl font-bold transition-all duration-300 shadow-sm flex items-center gap-3 cursor-pointer whitespace-nowrap shrink-0"
                onClick={() => navigate('/jobs/browse')}
              >
                <span className="text-xs uppercase tracking-widest whitespace-nowrap">Browse jobs</span>
                <Zap size={16} className="transition-transform group-hover:translate-x-1 shrink-0" />
              </button>
            </div>
          </section>

          {error && (
            <div className="bento-spotlight-card border border-warning/40 bg-warning/5 p-4 flex items-center gap-3 text-sm text-text-secondary">
              <AlertCircle size={18} className="text-warning shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && skillsCount === 0 && (
            <section className="bento-spotlight-card border border-brand/40 bg-gradient-to-r from-brand/12 via-brand/5 to-transparent p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative group">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0 shadow-[0_0_20px_rgba(73,75,231,0.3)]">
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-black text-text-primary uppercase tracking-tight">
                    Add skills to boost marketplace discoverability
                  </div>
                  <p className="text-xs text-text-secondary mt-1 max-w-xl">
                    Profiles with verified skills achieve up to 3.8x higher invite rates and priority AI job matching.
                  </p>
                </div>
              </div>
              <button
                className="shrink-0 rounded-2xl bg-brand hover:bg-brand-hover px-6 py-3.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_rgba(73,75,231,0.4)] transition-all duration-200 cursor-pointer flex items-center gap-2 relative z-10"
                onClick={() => navigate(`/profile/freelancer/${user?.id || ''}/edit`)}
              >
                <span>Add Skills Now</span>
                <ArrowUpRight size={14} />
              </button>
            </section>
          )}

          {/* High-frequency live metrics overview */}
          <FreelancerDashboardOverview
            isLoading={isLoading}
            workStatusCounts={workStatusCounts}
            pendingMilestoneItems={pendingMilestoneItems}
            eloSummary={eloSummary}
            theme={theme}
            onOpenProposals={() => navigate('/proposals')}
            onOpenContracts={() => navigate('/contracts')}
            onOpenEloHistory={() => navigate('/elo')}
          />

          {/* Main Bento Matrix */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left 8-col Section */}
            <div className="xl:col-span-8 space-y-8 min-w-0">
              <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-6 lg:gap-8">
                {/* 3D Tilt Profile Power Matrix */}
                <div
                  className="relative min-h-[380px] h-auto flex flex-col @[440px]:flex-row items-center justify-between p-5 sm:p-7 bento-spotlight-card group cursor-pointer gap-4 overflow-hidden"
                  onMouseMove={handleGaugeMouseMove}
                  onMouseLeave={handleGaugeMouseLeave}
                  style={gaugeCardStyle}
                  onClick={() => navigate(`/profile/freelancer/${user?.id || ''}/edit`)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent pointer-events-none group-hover:from-brand/15 transition-colors" />
                  <div className="relative flex-1 flex flex-col items-center justify-center z-10 text-center w-full @[440px]:w-auto shrink-0">
                    <span className="font-label-md text-brand font-black uppercase tracking-[0.25em] text-[10px] block mb-3">
                      Profile Power
                    </span>
                    <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 176 176">
                        <circle cx="88" cy="88" r={gaugeR} className="stroke-surface-muted/60 fill-none" strokeWidth="9" />
                        <circle
                          cx="88"
                          cy="88"
                          r={gaugeR}
                          className="stroke-brand fill-none freelancer-dash-gauge-ring"
                          strokeWidth="9"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={gaugeOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl sm:text-4xl font-black text-text-primary tracking-tighter">{profileStrength}%</span>
                        <span className="block text-[8px] font-bold text-text-muted uppercase mt-0.5 tracking-wider">
                          Ready for Hire
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full @[440px]:w-[1px] h-[1px] @[440px]:h-44 bg-border/80 my-1 @[440px]:my-0 @[440px]:mx-1 shrink-0" />

                  <div className="flex-1 w-full @[440px]:pl-2 space-y-2.5 sm:space-y-3 z-10 min-w-0">
                    <h4 className="text-[10px] font-black tracking-widest text-text-muted uppercase mb-2 truncate">
                      Power Factors
                    </h4>
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-muted/50 border border-border/70 hover:border-brand/30 transition-colors min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FolderGit2 size={13} className="text-brand shrink-0" />
                          <span className="text-[9px] uppercase font-bold text-text-muted truncate">Portfolio</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-text-primary shrink-0">{portfolioCount} items</span>
                      </div>
                      <div className="w-full bg-surface-muted h-1 rounded-full overflow-hidden">
                        <div className="bg-brand h-full rounded-full" style={{ width: `${Math.min(100, portfolioCount * 25)}%` }} />
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-muted/50 border border-border/70 hover:border-brand/30 transition-colors min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Code2 size={13} className="text-purple shrink-0" />
                          <span className="text-[9px] uppercase font-bold text-text-muted truncate">Skills</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-text-primary shrink-0">{skillsCount} listed</span>
                      </div>
                      <div className="w-full bg-surface-muted h-1 rounded-full overflow-hidden">
                        <div className="bg-purple h-full rounded-full" style={{ width: `${Math.min(100, skillsCount * 20)}%` }} />
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-muted/50 border border-border/70 hover:border-brand/30 transition-colors min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Star size={13} className="text-warning fill-warning shrink-0" />
                          <span className="text-[9px] uppercase font-bold text-text-muted truncate">Rating</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-text-primary shrink-0">{rating.toFixed(1)}/5.0</span>
                      </div>
                      <div className="w-full bg-surface-muted h-1 rounded-full overflow-hidden">
                        <div className="bg-warning h-full rounded-full" style={{ width: `${Math.min(100, (rating / 5) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings Intelligence AreaChart Card */}
                <div className="bento-spotlight-card p-5 sm:p-6 flex flex-col justify-between min-h-[380px] relative group overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 relative z-10">
                    <div className="min-w-0">
                      <h2 className="text-text-primary font-black text-base tracking-tight truncate">
                        {chartPeriod === 'monthly' ? 'Monthly Revenue Flow' : 'Yearly Revenue Flow'}
                      </h2>
                      <p className="text-xs text-text-secondary font-medium truncate">Verified contract payouts</p>
                    </div>
                    <div className="fl-chart-header-tabs flex shrink-0">
                      <button
                        className={`fl-chart-tab-btn cursor-pointer ${chartPeriod === 'monthly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('monthly')}
                      >
                        Monthly
                      </button>
                      <button
                        className={`fl-chart-tab-btn cursor-pointer ${chartPeriod === 'yearly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('yearly')}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center my-1 relative z-10 w-full overflow-hidden min-h-[190px]">
                    {isFinancialLoading ? (
                      <p className="text-sm text-text-muted animate-pulse font-medium">Syncing blockchain treasury…</p>
                    ) : financialError ? (
                      <p className="text-sm text-warning text-center font-medium">{financialError}</p>
                    ) : earningsData.length === 0 || !hasFinancialActivity ? (
                      <p className="text-sm text-text-muted text-center font-medium">No confirmed revenue in this interval.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={190}>
                        <AreaChart data={earningsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="flEarningsLineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#494be7" />
                              <stop offset="50%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                            <linearGradient id="flEarningsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#494be7" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#494be7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAxisAmount} />
                          <Tooltip
                            contentStyle={{
                              background: theme === 'black' ? 'rgba(13,14,25,0.96)' : 'rgba(255,255,255,0.98)',
                              border: theme === 'black' ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(73,75,231,0.2)',
                              borderRadius: 14,
                              color: theme === 'black' ? '#f5f6f8' : '#19191b',
                              fontSize: 12,
                              boxShadow: '0 12px 35px rgba(0,0,0,0.18)',
                            }}
                            formatter={(value: number) => [`${value.toLocaleString()} G-coin`, 'Payout']}
                          />
                          <Area type="monotone" dataKey="earned" stroke="url(#flEarningsLineGrad)" strokeWidth={3.5} fill="url(#flEarningsAreaGrad)" isAnimationActive />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-border/60 relative z-10 gap-2">
                    <div className="min-w-0">
                      <span className="block text-[8px] uppercase text-text-muted tracking-wider font-bold truncate">Total Inflow</span>
                      <GigCoinAmount
                        amount={financialOverview?.totalAmount ?? 0}
                        className="text-xl sm:text-2xl font-black text-text-primary tracking-tight truncate"
                      />
                    </div>
                    <div className="text-right min-w-0">
                      <span className="block text-[8px] uppercase text-text-muted tracking-wider font-bold truncate">Velocity / Contract</span>
                      <GigCoinAmount amount={financialOverview?.averageAmount ?? 0} className="text-xs sm:text-sm font-bold text-text-secondary truncate" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Marketplace Recommended Jobs Radar */}
              <div className="relative pt-2">
                <div className="flex flex-wrap items-center justify-between mb-5 gap-3 pl-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shadow-[0_0_15px_rgba(73,75,231,0.25)] shrink-0">
                      <Briefcase size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-3xl font-black tracking-tight uppercase text-text-primary font-display-sm truncate">
                        Marketplace Radar
                      </h3>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block truncate">
                        High match roles calculated for you
                      </span>
                    </div>
                  </div>
                  <button
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest freelancer-dash-jobs-link cursor-pointer shrink-0"
                    onClick={() => navigate('/jobs/browse')}
                  >
                    <span>Browse All</span>
                    <ArrowUpRight size={15} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(item => (
                      <div key={item} className="bento-spotlight-card p-8 rounded-3xl animate-pulse h-28 opacity-40" />
                    ))}
                  </div>
                ) : recommendedJobs.length === 0 ? (
                  <div className="bento-spotlight-card p-10 rounded-3xl text-center text-sm text-text-muted border border-border">
                    <Briefcase size={32} className="mx-auto mb-2 text-text-muted opacity-40" />
                    No matched jobs currently. Refine your skill tags to expand recommendations.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:gap-5">
                    {recommendedJobs.map(job => (
                      <div
                        key={job.id}
                        className="bento-spotlight-card p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 freelancer-dash-job-card cursor-pointer group"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand/12 rounded-2xl flex items-center justify-center shrink-0 border border-brand/25 group-hover:scale-105 group-hover:bg-brand/20 transition-all duration-300 shadow-sm">
                          <Briefcase size={22} className="text-brand" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2.5 gap-2">
                            <div className="min-w-0">
                              <h4 className="text-base sm:text-lg font-black tracking-tight text-text-primary group-hover:text-brand transition-colors truncate">
                                {job.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-text-secondary font-medium mt-0.5">
                                <span className="truncate">{job.categoryName}</span>
                                <span>•</span>
                                <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                              </div>
                            </div>
                            {job.hasAiInterview && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-brand shadow-xs shrink-0">
                                <span className="flex items-center gap-0.5 text-brand">
                                  <span className="ai-wave-bar" />
                                  <span className="ai-wave-bar" />
                                  <span className="ai-wave-bar" />
                                </span>
                                AI Interview
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                            {job.skills.slice(0, 4).map(skill => (
                              <span
                                key={skill}
                                className="bg-brand/5 hover:bg-brand/15 text-brand text-[8px] sm:text-[9px] font-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider border border-brand/15 transition-colors"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border border-border/80 bg-surface-muted/60 group-hover:bg-brand group-hover:border-brand group-hover:text-primary-foreground group-hover:shadow-[0_0_18px_rgba(73,75,231,0.5)] transition-all duration-300 flex items-center justify-center shrink-0 shadow-sm self-end sm:self-center cursor-pointer"
                          onClick={event => {
                            event.stopPropagation();
                            navigate(`/jobs/${job.id}`);
                          }}
                        >
                          <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4-col Sidebar */}
            <div className="xl:col-span-4 space-y-8 min-w-0">
              {/* Holographic Treasury & Balances Bento */}
              <div className="bento-spotlight-card p-5 sm:p-6 h-auto flex flex-col justify-between relative group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-brand/15 text-brand flex items-center justify-center border border-brand/30 shadow-[0_0_15px_rgba(73,75,231,0.2)] shrink-0">
                      <Wallet size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black tracking-tight uppercase text-text-primary truncate">Treasury & Balances</h3>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest truncate">Real-time Liquidity</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-brand/20 via-brand/10 to-success/15 rounded-2xl p-3.5 sm:p-4 border border-brand/30 flex flex-wrap items-center justify-between my-2 relative overflow-hidden gap-2">
                  <div className="relative z-10 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--success)] shrink-0" />
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider truncate">Available Balance</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-text-primary tracking-tight leading-none truncate">
                      {isLoading ? '—' : <GigCoinAmount amount={wallet?.totalSpendableGigCoin ?? 0} />}
                    </div>
                  </div>
                  <button
                    className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-brand/15 hover:bg-brand text-brand hover:text-primary-foreground font-bold text-xs tracking-widest uppercase rounded-xl border border-brand/40 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 group/btn relative z-10"
                    onClick={() => navigate('/wallet/withdrawals')}
                  >
                    <span>Details</span>
                    <ArrowUpRight size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mt-2" aria-label="Wallet overview">
                  {[
                    {
                      label: 'Deposited',
                      value: <GigCoinAmount amount={wallet?.depositedGigCoin ?? 0} />,
                      detail: 'Available',
                      color: 'text-brand',
                      barColor: 'bg-brand',
                      border: 'border-brand/20',
                    },
                    {
                      label: 'On hold',
                      value: <GigCoinAmount amount={wallet?.heldGigCoin ?? 0} />,
                      detail: 'In escrow',
                      color: 'text-warning',
                      barColor: 'bg-warning',
                      border: 'border-warning/20',
                    },
                    {
                      label: 'Pending',
                      value: <GigCoinAmount amount={wallet?.pendingWithdrawalGigCoin ?? 0} />,
                      detail: 'Settling',
                      color: 'text-info',
                      barColor: 'bg-info',
                      border: 'border-info/20',
                    },
                  ].map(stat => (
                    <div key={stat.label} className={`bento-spotlight-card p-2.5 sm:p-3 border ${stat.border} flex flex-col justify-between min-h-[92px] min-w-0`}>
                      <span className={`text-[8px] font-black uppercase tracking-tight truncate ${stat.color}`}>
                        {stat.label}
                      </span>
                      <span className="block text-xs sm:text-sm font-black text-text-primary tracking-tight leading-none my-1 truncate">
                        {isLoading ? '—' : stat.value}
                      </span>
                      <div className="w-full bg-surface-muted h-1 rounded-full overflow-hidden mb-1">
                        <div className={`${stat.barColor} h-full rounded-full w-2/3`} />
                      </div>
                      <span className="block text-[8px] font-medium text-text-muted opacity-80 truncate">{stat.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Mission Control Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black tracking-tight uppercase text-text-primary font-display-sm">
                    Active Missions
                  </h3>
                  <span className="text-xs font-black text-brand bg-brand/10 px-3 py-1 rounded-xl border border-brand/25 shadow-xs">
                    {activeProjects} {activeProjects === 1 ? 'project' : 'projects'}
                  </span>
                </div>
                {projects.length === 0 ? (
                  <div className="bento-spotlight-card p-8 border border-border text-sm text-text-muted text-center font-medium">
                    No active contracts in delivery.
                  </div>
                ) : (
                  projects.slice(0, 2).map(project => (
                    <div
                      key={project.id}
                      className="bento-spotlight-card p-6 sm:p-7 border border-brand/20 relative group hover:-translate-y-1 transition-all duration-300 min-w-0"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/15 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform pointer-events-none" />
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <span className="text-[9px] font-black bg-success/15 text-success px-3 py-1 rounded-lg tracking-widest uppercase border border-success/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                          {project.status}
                        </span>
                        <GigCoinAmount amount={project.totalBudget} className="text-xs font-bold text-text-primary" />
                      </div>
                      <h4 className="text-base font-black mb-1 text-text-primary relative z-10 line-clamp-1">
                        {project.title}
                      </h4>
                      <p className="text-text-secondary text-xs mb-4 font-medium relative z-10 truncate">
                        Client: {project.clientName}
                      </p>
                      <button
                        className="w-full py-3.5 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-widest uppercase rounded-2xl transition-all duration-200 relative z-10 cursor-pointer shadow-[0_0_20px_rgba(73,75,231,0.35)] flex items-center justify-center gap-2"
                        onClick={() => navigate(`/workspace/${project.id}`)}
                      >
                        <span>Enter Workspace</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Profile Review Rating & Summary Bento Card */}
              <div className="bento-spotlight-card p-6 sm:p-7 group min-w-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-warning/15 border border-warning/30 text-warning flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0">
                    <Star size={22} fill="currentColor" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-black text-text-muted uppercase tracking-widest truncate">Client Satisfaction</span>
                    <span className="text-2xl font-black text-text-primary">{rating.toFixed(1)} <span className="text-xs text-text-muted font-bold">/ 5.0</span></span>
                  </div>
                </div>
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between text-xs font-semibold gap-4 py-1.5 border-b border-border/50">
                    <span className="text-text-secondary">Major Focus</span>
                    <span className="text-text-primary text-right font-bold truncate">{majorName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold py-1.5 border-b border-border/50">
                    <span className="text-text-secondary">Verified Skills</span>
                    <span className="text-text-primary font-bold">{skillsCount}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold py-1.5 border-b border-border/50">
                    <span className="text-text-secondary">Portfolio Assets</span>
                    <span className="text-text-primary font-bold">{portfolioCount}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold gap-4 py-1.5">
                    <span className="text-text-secondary">Active Title</span>
                    <span className="text-text-primary text-right truncate max-w-[160px] font-bold">
                      {profileTitle || 'Not provided'}
                    </span>
                  </div>
                </div>
                <button
                  className="w-full mt-6 py-3.5 rounded-2xl border border-brand/35 text-brand text-xs font-black uppercase tracking-widest hover:bg-brand-soft hover:border-brand transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  onClick={() => navigate(`/profile/freelancer/${user?.id || ''}/edit`)}
                >
                  <span>Edit Profile</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
