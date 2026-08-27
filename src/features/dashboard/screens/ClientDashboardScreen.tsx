import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Crown,
  PlusCircle,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useClientDashboard } from '../hooks/useClientDashboard';
import { use3DTilt } from '../hooks/use3DTilt';
import { useApp } from '../../../app/providers/AppProvider';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
import { ClientDashboardOverview } from '../components/ClientDashboardOverview';
import { Dashboard3DBackground } from '../components/Dashboard3DBackground';
import '../styles/client-dashboard-screen.css';
import '../../premium/styles/premium.css';

const formatAxisAmount = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

export default function ClientDashboardScreen() {
  const {
    user,
    greeting,
    t,
    navigate,
    isLoading,
    isFinancialLoading,
    error,
    financialError,
    wallet,
    financialOverview,
    chartPeriod,
    setChartPeriod,
    myJobs,
    pendingProposals,
    proposalStatusCounts,
    eloSummary,
    pendingMilestonesCount,
    submittedMilestonesCount,
    totalMilestonesCount,
    contractPipelineCounts,
    projects,
    completedContractsCount,
    spendChartData,
  } = useClientDashboard();
  const { role, theme } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const openRolesCount = myJobs.filter(job => job.status === 'open').length;
  const draftRolesCount = myJobs.filter(job => job.status === 'draft').length;
  const displayName = user?.full_name || user?.first_name || 'Client';
  const [financialSlide, setFinancialSlide] = useState<number>(0);
  const financialProgress = Math.min(
    100,
    Math.max(0, financialOverview?.progressPercentage ?? 0),
  );
  const hasFinancialActivity = Boolean(
    financialOverview
    && (
      financialOverview.totalAmount > 0
      || financialOverview.totalContractValue > 0
      || financialOverview.totalServiceFeePaid > 0
    ),
  );

  const {
    onMouseMove: handleWalletMouseMove,
    onMouseLeave: handleWalletMouseLeave,
    style: walletCardStyle,
  } = use3DTilt(10);
  const {
    onMouseMove: handleOverviewMouseMove,
    onMouseLeave: handleOverviewMouseLeave,
    style: overviewCardStyle,
  } = use3DTilt(4);

  return (
    <AppLayout excludeMeshGradient>
      <div className="bg-background min-h-screen relative w-full overflow-x-hidden">
        {/* Interactive 3D Canvas Mesh Background */}
        <Dashboard3DBackground />

        {/* Ambient Glowing Orbs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <div className="client-dash-glow-orb orb-purple absolute" />
          <div className="client-dash-glow-orb orb-cyan absolute" />
          <div className="client-dash-glow-orb orb-blue absolute" />
          <div className="absolute -top-10 -left-10 text-[20vw] font-black text-primary/[0.015] dark:text-primary/[0.008] avant-garde-heading uppercase leading-none">
            DASHBOARD
          </div>
          <div className="absolute bottom-10 -right-20 text-[15vw] font-black text-secondary/[0.01] dark:text-secondary/[0.005] avant-garde-heading uppercase leading-none">
            GIGBRIDGE
          </div>
        </div>

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-8 sm:py-10 space-y-12 sm:space-y-14">
          {/* Header Hero Section */}
          <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 stagger-up">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="inline-block text-primary font-bold tracking-[0.4em] uppercase text-xs">
                  Hiring workspace
                </span>
                {!premiumStatus.loading && <PremiumStatusBadge active={premiumStatus.isPremium} />}
              </div>
              <h1 className="font-display-lg text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-black avant-garde-heading hero-text-overlay mb-6 uppercase tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                {displayName}
              </h1>
              <p className="font-body-lg text-xl md:text-2xl text-text-secondary max-w-2xl leading-relaxed">
                {greeting} <span className="font-black text-primary">{displayName}</span>.{' '}
                {isLoading
                  ? 'Loading your hiring data…'
                  : `${openRolesCount} open role${openRolesCount === 1 ? '' : 's'}, ${pendingProposals.length} pending proposal${pendingProposals.length === 1 ? '' : 's'}, and ${projects.length} active contract${projects.length === 1 ? '' : 's'}.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 shrink-0">
              <button
                className="group glass-card h-16 px-6 rounded-2xl flex items-center gap-3 hover:!border-brand transition-all duration-300 shadow-sm cursor-pointer"
                onClick={() => navigate(premiumStatus.isPremium ? '/premium/client' : '/premium/client/pricing')}
              >
                <Crown size={17} className="text-purple" />
                <span className="font-bold text-xs uppercase tracking-widest">
                  {premiumStatus.isPremium ? 'Premium Hub' : 'Upgrade'}
                </span>
              </button>
              <button
                className="group glass-card !border-brand text-brand hover:!border-brand-hover hover:text-brand-hover hover:bg-brand-soft h-16 px-10 rounded-2xl font-bold transition-all duration-300 shadow-sm flex items-center gap-3 cursor-pointer"
                onClick={() => navigate('/jobs/post')}
              >
                <span className="text-xs uppercase tracking-widest">
                  {t('jobs.postJob', 'Open New Role')}
                </span>
                <PlusCircle size={18} className="transition-transform group-hover:scale-110" />
              </button>
            </div>
          </section>

          {error && (
            <div className="bento-spotlight-card border border-warning/40 bg-warning/5 p-4 flex items-center gap-3 text-sm text-text-secondary">
              <AlertCircle size={18} className="text-warning shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* High-frequency live metrics overview */}
          <ClientDashboardOverview
            isLoading={isLoading}
            eloSummary={eloSummary}
            proposalCounts={proposalStatusCounts}
            pendingMilestonesCount={pendingMilestonesCount}
            submittedMilestonesCount={submittedMilestonesCount}
            totalMilestonesCount={totalMilestonesCount}
            contractPipelineCounts={contractPipelineCounts}
            theme={theme}
            onOpenEloHistory={() => navigate('/elo')}
            onOpenProposals={() => navigate('/proposals')}
            onOpenContracts={() => navigate('/contracts')}
          />

          {/* Main Matrix Grid */}
          <section className="space-y-6" aria-labelledby="client-workflow-title">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column (col-span-7) */}
              <div className="lg:col-span-7 space-y-8">
                {/* Work In Progress / Hiring Portfolio Bento */}
                <div className="bento-spotlight-card p-7 sm:p-8 min-h-72 flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-brand/10 blur-3xl rounded-full pointer-events-none group-hover:bg-brand/20 transition-all duration-500" />

                  <div className="flex justify-between items-start gap-5 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-brand/15 rounded-2xl flex items-center justify-center text-brand shadow-[0_0_20px_rgba(73,75,231,0.25)] shrink-0 border border-brand/30">
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">
                          {t('dashboard.currentWork', 'Current Work')}
                        </span>
                        <h2 id="client-workflow-title" className="text-xl sm:text-2xl font-black tracking-tight text-text-primary uppercase mt-0.5 font-display-sm">
                          {t('dashboard.workInProgress', 'Hiring Portfolio')}
                        </h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-4xl sm:text-5xl font-black text-text-primary leading-none tracking-tight">{openRolesCount}</span>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1 block">Open roles</span>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6 relative z-10">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Portfolio Status</span>
                        <span className="text-[9px] text-text-muted font-medium">Roles and contracts breakdown</span>
                      </div>
                      <button
                        className="freelancer-dash-overview-link group/link cursor-pointer"
                        onClick={() => navigate('/jobs/my-jobs')}
                      >
                        <span>Manage Roles</span>
                        <ChevronRight size={14} className="transition-transform group-hover/link:translate-x-1" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { value: myJobs.length, label: 'All Roles', color: 'text-text-primary' },
                        { value: draftRolesCount, label: 'Drafts', color: 'text-text-secondary' },
                        { value: projects.length, label: 'Active Contracts', color: 'text-brand' },
                        { value: completedContractsCount, label: 'Completed', color: 'text-success' },
                      ].map(item => (
                        <div
                          key={item.label}
                          className="text-center bg-surface-muted/50 hover:bg-surface-muted/80 p-3.5 rounded-2xl border border-border/70 transition-all duration-200"
                        >
                          <span className={`block text-2xl font-black leading-none ${item.color}`}>{item.value}</span>
                          <span className="text-[8px] text-text-muted font-black uppercase tracking-wider block mt-2">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Talent Matching Bento Banner */}
                <div className="bento-spotlight-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 blur-3xl rounded-full pointer-events-none group-hover:bg-cyan/20 transition-all duration-500" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan">Talent Discovery</span>
                      <h4 className="text-lg font-black text-text-primary tracking-tight mt-0.5">Find Top-Tier Freelancers</h4>
                      <p className="text-xs text-text-secondary mt-0.5">AI-powered candidate sourcing for open and upcoming projects.</p>
                    </div>
                  </div>
                  <button
                    className="shrink-0 flex items-center gap-2 rounded-2xl border border-brand/35 bg-brand/10 hover:bg-brand hover:text-primary-foreground px-6 py-3.5 text-xs font-black uppercase tracking-widest text-brand transition-all duration-200 cursor-pointer shadow-sm relative z-10"
                    onClick={() => navigate('/talent-matching')}
                  >
                    <span>Find Talent</span>
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* Money & Budget Section */}
                <div className="pt-2 space-y-4" aria-labelledby="client-finance-title">
                  <div className="px-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet size={14} className="text-brand" />
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">
                        {t('dashboard.financialControl', 'Financial Control')}
                      </span>
                    </div>
                    <h3 id="client-finance-title" className="text-2xl font-black tracking-tight text-text-primary uppercase font-display-sm">
                      {t('dashboard.moneyAndBudget', 'Treasury & Spending')}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Financial Control Carousel Card (Funds Released & Wallet) */}
                    <div className="bento-spotlight-card p-6 flex flex-col justify-between min-h-[320px] relative group">
                      {/* Carousel Header Controls */}
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-1.5 bg-surface-muted/60 p-1 rounded-xl border border-border">
                          <button
                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${financialSlide === 0 ? 'bg-brand text-primary-foreground shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                            onClick={() => setFinancialSlide(0)}
                          >
                            Funds Released
                          </button>
                          <button
                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${financialSlide === 1 ? 'bg-brand text-primary-foreground shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                            onClick={() => setFinancialSlide(1)}
                          >
                            Wallet
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="w-7 h-7 rounded-lg bg-surface-muted/80 border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-brand/40 transition-all cursor-pointer"
                            onClick={() => setFinancialSlide(prev => (prev === 0 ? 1 : 0))}
                            title="Toggle slide"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            className="w-7 h-7 rounded-lg bg-surface-muted/80 border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-brand/40 transition-all cursor-pointer"
                            onClick={() => setFinancialSlide(prev => (prev === 0 ? 1 : 0))}
                            title="Toggle slide"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Carousel Slide Content */}
                      <div className="flex-1 flex flex-col justify-between relative z-10">
                        {financialSlide === 0 ? (
                          /* Slide 0: Contract funds released */
                          <div
                            className="flex flex-col justify-between h-full transition-opacity duration-300"
                            onMouseMove={handleOverviewMouseMove}
                            onMouseLeave={handleOverviewMouseLeave}
                            style={overviewCardStyle}
                          >
                            <div className="relative flex flex-col items-center justify-center py-2">
                              <div className="relative w-36 h-36 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="72" cy="72" r="58" className="stroke-surface-muted/60 fill-none" strokeWidth="8" />
                                  <circle
                                    cx="72"
                                    cy="72"
                                    r="58"
                                    className="stroke-brand fill-none freelancer-dash-gauge-ring"
                                    strokeWidth="8"
                                    strokeDasharray={2 * Math.PI * 58}
                                    strokeDashoffset={2 * Math.PI * 58 * (1 - financialProgress / 100)}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute text-center">
                                  <span className="text-3xl font-black text-text-primary tracking-tighter">
                                    {isFinancialLoading ? '—' : `${financialProgress}%`}
                                  </span>
                                  <span className="block text-[8px] font-bold text-text-muted uppercase mt-0.5 tracking-wider">
                                    {hasFinancialActivity ? (chartPeriod === 'monthly' ? 'Past Month' : 'Past Year') : 'No activity'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/60">
                              <div className="text-center">
                                <span className="block text-[8px] uppercase font-black text-text-muted">Released</span>
                                <GigCoinAmount amount={financialOverview?.progressAmount ?? 0} className="text-xs font-bold text-text-primary" />
                              </div>
                              <div className="text-center">
                                <span className="block text-[8px] uppercase font-black text-text-muted">Value</span>
                                <GigCoinAmount amount={financialOverview?.totalContractValue ?? 0} className="text-xs font-bold text-text-primary" />
                              </div>
                              <div className="text-center">
                                <span className="block text-[8px] uppercase font-black text-text-muted">Fees</span>
                                <GigCoinAmount amount={financialOverview?.totalServiceFeePaid ?? 0} className="text-xs font-bold text-text-primary" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Slide 1: Wallet Card */
                          <div
                            className="cursor-pointer select-none h-full flex flex-col justify-between transition-opacity duration-300 relative"
                            onMouseMove={handleWalletMouseMove}
                            onMouseLeave={handleWalletMouseLeave}
                            style={walletCardStyle}
                            onClick={() => navigate('/wallet/deposit')}
                          >
                            <div className="flex items-start justify-between relative z-10 pt-1">
                              <div>
                                <span className="block text-[8px] font-black text-brand uppercase tracking-widest">Wallet</span>
                                <h4 className="text-sm font-black text-text-primary mt-0.5">GigBridge Pay</h4>
                              </div>
                              <div className="w-10 h-10 bg-brand/15 text-brand rounded-2xl flex items-center justify-center border border-brand/25 shadow-sm">
                                <Wallet size={18} />
                              </div>
                            </div>
                            <div className="my-2 relative z-10">
                              <span className="block text-[9px] uppercase text-text-muted tracking-wider font-bold mb-0.5">Available Funds</span>
                              <GigCoinAmount amount={wallet?.totalSpendableGigCoin ?? 0} className="text-3xl font-black tracking-tight text-text-primary" />
                              <span className="block text-xs text-text-secondary mt-1 font-medium">Held in Escrow: <GigCoinAmount amount={wallet?.heldGigCoin ?? 0} /></span>
                            </div>
                            <div className="flex items-center justify-between relative z-10 gap-2 pt-2.5 border-t border-border/60">
                              <div className="min-w-0">
                                <span className="block text-[8px] uppercase text-text-muted tracking-wider font-semibold">Account Holder</span>
                                <span className="block truncate text-xs font-bold text-text-secondary">{displayName}</span>
                              </div>
                              <button className="py-2.5 px-4 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm border border-transparent shrink-0 cursor-pointer">
                                Deposit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pagination Dots */}
                      <div className="flex items-center justify-center gap-1.5 mt-3 relative z-10">
                        <button
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${financialSlide === 0 ? 'w-5 bg-brand' : 'w-1.5 bg-border hover:bg-text-muted'}`}
                          onClick={() => setFinancialSlide(0)}
                          aria-label="Go to slide 1"
                        />
                        <button
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${financialSlide === 1 ? 'w-5 bg-brand' : 'w-1.5 bg-border hover:bg-text-muted'}`}
                          onClick={() => setFinancialSlide(1)}
                          aria-label="Go to slide 2"
                        />
                      </div>
                    </div>

                    {/* Spend Chart Card */}
                    <div className="bento-spotlight-card p-6 flex flex-col justify-between min-h-[320px] relative group">
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <div>
                          <h4 className="text-text-primary font-black text-base tracking-tight">
                            {chartPeriod === 'monthly' ? 'Monthly Spend' : 'Yearly Spend'}
                          </h4>
                          <p className="text-xs text-text-secondary font-medium">Confirmed contract releases</p>
                        </div>
                        <div className="fl-chart-header-tabs flex">
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

                      <div className="w-full flex-1 flex items-center justify-center min-h-[190px] relative z-10">
                        {isFinancialLoading ? (
                          <p className="text-sm text-text-muted animate-pulse font-medium">Loading spending flow…</p>
                        ) : financialError ? (
                          <p className="text-sm text-warning text-center font-medium">{financialError}</p>
                        ) : spendChartData.length === 0 || !hasFinancialActivity ? (
                          <p className="text-sm text-text-muted text-center font-medium">No confirmed spend in this interval.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={190}>
                            <AreaChart data={spendChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="clientSpendLineGrad" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#494be7" />
                                  <stop offset="50%" stopColor="#8b5cf6" />
                                  <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                                <linearGradient id="clientSpendGrad2026" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#494be7" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#494be7" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="month" tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAxisAmount} />
                              <Tooltip
                                contentStyle={{
                                  background: theme === 'black' ? 'rgba(13, 14, 25, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                                  border: theme === 'black' ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(73, 75, 231, 0.2)',
                                  borderRadius: 14,
                                  color: theme === 'black' ? '#f5f6f8' : '#19191b',
                                  fontSize: 12,
                                  boxShadow: '0 12px 35px rgba(0,0,0,0.18)',
                                }}
                                formatter={(value: number) => [`${value.toLocaleString()} G-coin`, 'Released']}
                              />
                              <Area type="monotone" dataKey="spend" stroke="url(#clientSpendLineGrad)" strokeWidth={3.5} fill="url(#clientSpendGrad2026)" isAnimationActive />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (col-span-5) */}
              <div className="lg:col-span-5 space-y-8">
                {/* AI Copilot Job Drafting Bento */}
                <div className="bento-spotlight-card p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-brand/15 blur-3xl rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative z-10 flex flex-col gap-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-brand/20 flex items-center justify-center text-brand shrink-0 border border-brand/30 shadow-[0_0_15px_rgba(73,75,231,0.3)]">
                          <Bot size={22} className="animate-pulse" />
                        </div>
                        <div>
                          <span className="block text-[8px] font-black uppercase tracking-widest text-brand">AI Copilot</span>
                          <h4 className="text-base font-black text-text-primary tracking-tight">AI-Assisted Job Drafting</h4>
                        </div>
                      </div>
                      <button
                        className="py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-primary-foreground text-xs font-bold transition-all shadow-[0_0_15px_rgba(73,75,231,0.3)] shrink-0 cursor-pointer flex items-center gap-1.5"
                        onClick={() => navigate('/jobs/post')}
                      >
                        <span>Draft Role</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed font-medium">
                      Generate optimized job postings, scope requirements, and milestone suggestions with intelligent AI assistance.
                    </p>
                  </div>
                </div>

                {/* Active Contracts Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black tracking-tight uppercase text-text-primary font-display-sm">
                      Active Contracts
                    </h3>
                    <span className="text-xs font-black text-brand bg-brand/10 px-3 py-1 rounded-xl border border-brand/25 shadow-xs">
                      {projects.length} {projects.length === 1 ? 'contract' : 'contracts'}
                    </span>
                  </div>

                  {projects.length > 0 ? (
                    projects.slice(0, 2).map(project => (
                      <div
                        key={project.id}
                        className="bento-spotlight-card rounded-3xl p-7 border border-brand/20 relative group hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/15 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform pointer-events-none" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <span className="text-[9px] font-black bg-success/15 text-success px-3 py-1 rounded-lg tracking-widest uppercase border border-success/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                            {project.status}
                          </span>
                          <GigCoinAmount amount={project.totalBudget} className="text-xs font-bold text-text-primary" />
                        </div>
                        <h4 className="text-lg font-black mb-1 text-text-primary relative z-10 line-clamp-1">{project.title}</h4>
                        <p className="text-text-secondary text-xs mb-5 font-medium relative z-10">Freelancer: {project.freelancerName}</p>
                        <button
                          className="w-full py-3.5 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-widest uppercase rounded-2xl transition-all duration-200 shadow-[0_0_20px_rgba(73,75,231,0.35)] flex items-center justify-center gap-2 cursor-pointer relative z-10"
                          onClick={() => navigate(`/workspace/${project.id}`)}
                        >
                          <span>Enter Workspace</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bento-spotlight-card p-8 border border-border text-center text-text-muted text-sm font-medium">
                      No active contracts currently in delivery.
                    </div>
                  )}

                  <div className="bento-spotlight-card p-5 border border-border flex items-center justify-between group hover:border-brand/30 transition-all">
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-text-muted font-bold">Completed Contracts</span>
                      <span className="text-2xl font-black text-text-primary">{completedContractsCount}</span>
                    </div>
                    <button
                      className="freelancer-dash-overview-link group/link cursor-pointer"
                      onClick={() => navigate('/contracts')}
                    >
                      <span>View All</span>
                      <ChevronRight size={14} className="transition-transform group-hover/link:translate-x-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
