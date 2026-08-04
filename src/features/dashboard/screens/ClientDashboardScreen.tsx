import {
  AlertCircle,
  Bot,
  Briefcase,
  ChevronRight,
  Crown,
  PlusCircle,
  Wallet,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useClientDashboard } from '../hooks/useClientDashboard';
import { use3DTilt } from '../hooks/use3DTilt';
import { useApp } from '../../../app/providers/AppProvider';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
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
    proposalsCount,
    pendingProposals,
    shortlistedProposalsCount,
    proposalJobScopeCount,
    projects,
    completedContractsCount,
    spendChartData,
  } = useClientDashboard();
  const { role, theme } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const openRolesCount = myJobs.filter(job => job.status === 'open').length;
  const displayName = user?.full_name || user?.first_name || 'Client';
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

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-10 space-y-20">
          <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 stagger-up">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="inline-block text-primary font-bold tracking-[0.4em] uppercase text-xs">
                  Hiring workspace
                </span>
                {!premiumStatus.loading && <PremiumStatusBadge active={premiumStatus.isPremium} />}
              </div>
              <h1 className="font-display-lg text-7xl md:text-[9rem] font-black avant-garde-heading hero-text-overlay mb-6 uppercase">
                CLIENT
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
                className="group glass-card h-16 px-6 rounded-2xl flex items-center gap-3 hover:!border-brand transition-all duration-300 shadow-sm"
                onClick={() => navigate(premiumStatus.isPremium ? '/premium/client' : '/premium/client/pricing')}
              >
                <Crown size={17} className="text-purple" />
                <span className="font-bold text-xs uppercase tracking-widest">
                  {premiumStatus.isPremium ? 'Premium Hub' : 'Upgrade'}
                </span>
              </button>
              <button
                className="group glass-card !border-brand text-brand hover:!border-brand-hover hover:text-brand-hover hover:bg-brand-soft h-16 px-10 rounded-2xl font-bold transition-all duration-300 shadow-sm flex items-center gap-3"
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
            <div className="glass-card rounded-2xl border border-warning/30 p-4 flex items-center gap-3 text-sm text-text-secondary">
              <AlertCircle size={18} className="text-warning shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div
                  className="relative h-[360px] flex items-center justify-between p-8 overflow-hidden rounded-3xl glass-card group transition-all duration-500"
                  onMouseMove={handleOverviewMouseMove}
                  onMouseLeave={handleOverviewMouseLeave}
                  style={overviewCardStyle}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />
                  <div className="relative flex-1 flex flex-col items-center justify-center z-10 text-center">
                    <span className="font-label-md text-brand font-black uppercase tracking-[0.2em] text-[10px] block mb-4">
                      Contract funds released
                    </span>
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="88" cy="88" r="76" className="stroke-surface-muted fill-none" strokeWidth="8" />
                        <circle
                          cx="88"
                          cy="88"
                          r="76"
                          className="stroke-brand fill-none client-dash-success-ring"
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 76}
                          strokeDashoffset={2 * Math.PI * 76 * (1 - financialProgress / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-5xl font-black text-text-primary tracking-tighter">
                          {isFinancialLoading ? '—' : `${financialProgress}%`}
                        </span>
                        <span className="block text-[8px] font-bold text-text-muted uppercase mt-0.5">
                          {hasFinancialActivity ? (chartPeriod === 'monthly' ? 'Past month' : 'Past year') : 'No activity'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-[1px] h-48 bg-border hidden sm:block" />
                  <div className="flex-1 pl-6 space-y-5 z-10 hidden sm:block">
                    <h4 className="text-[10px] font-black tracking-widest text-text-muted uppercase">
                      Financial summary
                    </h4>
                    <div>
                      <span className="block text-[9px] uppercase text-text-muted">Released</span>
                      <GigCoinAmount amount={financialOverview?.progressAmount ?? 0} className="text-sm font-bold text-text-primary" />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-text-muted">Contract value</span>
                      <GigCoinAmount amount={financialOverview?.totalContractValue ?? 0} className="text-sm font-bold text-text-primary" />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-text-muted">Service fees</span>
                      <GigCoinAmount amount={financialOverview?.totalServiceFeePaid ?? 0} className="text-sm font-bold text-text-primary" />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-3xl flex flex-col justify-between h-[360px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-text-primary font-bold text-base">
                        {chartPeriod === 'monthly' ? 'Monthly Spend' : 'Yearly Spend'}
                      </h2>
                      <p className="text-xs text-text-secondary opacity-75">Confirmed contract releases</p>
                    </div>
                    <div className="chart-header-tabs flex">
                      <button
                        className={`chart-tab-btn ${chartPeriod === 'monthly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('monthly')}
                      >
                        M
                      </button>
                      <button
                        className={`chart-tab-btn ${chartPeriod === 'yearly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('yearly')}
                      >
                        Y
                      </button>
                    </div>
                  </div>

                  <div className="w-full flex-1 flex items-center justify-center">
                    {isFinancialLoading ? (
                      <p className="text-sm text-text-muted animate-pulse">Loading financial data…</p>
                    ) : financialError ? (
                      <p className="text-sm text-warning text-center">{financialError}</p>
                    ) : spendChartData.length === 0 || !hasFinancialActivity ? (
                      <p className="text-sm text-text-muted text-center">No confirmed spend in this period.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={spendChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="clientSpendLineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#9F4BFF" />
                              <stop offset="100%" stopColor="#0077FF" />
                            </linearGradient>
                            <linearGradient id="clientSpendGrad2026" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0077FF" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#0077FF" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAxisAmount} />
                          <Tooltip
                            contentStyle={{
                              background: theme === 'black' ? 'rgba(13, 14, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                              border: theme === 'black' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(73, 75, 231, 0.2)',
                              borderRadius: 12,
                              color: theme === 'black' ? '#f5f6f8' : '#19191b',
                            }}
                            formatter={(value: number) => [`${value.toLocaleString()} G-coin`, 'Released']}
                          />
                          <Area type="monotone" dataKey="spend" stroke="url(#clientSpendLineGrad)" strokeWidth={3} fill="url(#clientSpendGrad2026)" isAnimationActive />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="client-dash-wallet-card-container">
                  <div
                    className="glass-card cursor-pointer select-none p-8 rounded-3xl h-80 flex flex-col justify-between group transition-all duration-500 border-brand/20 relative overflow-hidden"
                    onMouseMove={handleWalletMouseMove}
                    onMouseLeave={handleWalletMouseLeave}
                    style={walletCardStyle}
                    onClick={() => navigate('/wallet/deposit')}
                  >
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/10 blur-3xl rounded-full pointer-events-none group-hover:scale-125 transition-transform" />
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="block text-[8px] font-black text-brand uppercase tracking-widest">Wallet</span>
                        <h4 className="text-sm font-black text-text-primary mt-1">GigBridge Pay</h4>
                      </div>
                      <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                        <Wallet size={20} />
                      </div>
                    </div>
                    <div className="my-4 relative z-10">
                      <span className="block text-[9px] uppercase text-text-muted tracking-wider font-semibold mb-1">
                        Available funds
                      </span>
                      <GigCoinAmount
                        amount={wallet?.totalSpendableGigCoin ?? 0}
                        className="text-5xl font-black tracking-tight text-text-primary"
                      />
                      <span className="block text-xs text-text-secondary mt-3">
                        Held: <GigCoinAmount amount={wallet?.heldGigCoin ?? 0} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <span className="block text-[8px] uppercase text-text-muted tracking-wider font-semibold">
                          Account holder
                        </span>
                        <span className="text-xs font-bold text-text-secondary">{displayName}</span>
                      </div>
                      <button className="py-2.5 px-5 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-wider uppercase rounded-xl transition-colors shadow-md border border-transparent">
                        Deposit
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-3xl h-80 flex flex-col justify-between group">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center text-brand shadow-sm">
                      <Briefcase size={22} />
                    </div>
                    <div className="text-right">
                      <span className="block text-5xl font-black text-text-primary">{openRolesCount}</span>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Open roles</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-brand">
                        Proposal pipeline
                      </span>
                      <span className="text-[9px] text-text-muted">
                        Loaded from {proposalJobScopeCount} recent role{proposalJobScopeCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { value: proposalsCount, label: 'Received' },
                        { value: pendingProposals.length, label: 'Pending' },
                        { value: shortlistedProposalsCount, label: 'Shortlisted' },
                        { value: projects.length, label: 'Active contracts' },
                      ].map(item => (
                        <div key={item.label} className="text-center bg-surface-muted p-3 rounded-2xl border border-border">
                          <span className="block text-2xl font-black text-text-primary leading-none">{item.value}</span>
                          <span className="text-[8px] text-text-muted font-black uppercase tracking-wider block mt-2">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative pt-10">
                <h3 className="font-display-lg text-3xl font-black mb-6 pl-2 tracking-tight">TALENT MATCHES</h3>
                <div className="glass-card p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div>
                    <h4 className="text-lg font-black text-text-primary">No dashboard match data</h4>
                    <p className="text-sm text-text-secondary mt-1">
                      Open Talent Matching to run a current search. The dashboard does not invent candidate scores.
                    </p>
                  </div>
                  <button
                    className="shrink-0 flex items-center gap-2 rounded-2xl border border-brand/30 px-5 py-3 text-xs font-black uppercase tracking-widest text-brand hover:bg-brand-soft"
                    onClick={() => navigate('/talent-matching')}
                  >
                    Find talent <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
              <div className="glass-card rounded-[2.5rem] p-8">
                <h3 className="font-display-lg text-xl font-black tracking-tight uppercase mb-4">Activity</h3>
                <p className="text-sm text-text-secondary">
                  Activity events are not included in the dashboard API. Open notifications for persisted updates.
                </p>
                <button
                  className="w-full mt-8 py-5 rounded-2xl border border-dashed border-border text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all bg-transparent"
                  onClick={() => navigate('/notifications')}
                >
                  View notifications
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h3 className="font-display-lg text-xl font-black tracking-tight uppercase">Active contracts</h3>
                  <span className="text-xs font-bold text-text-muted">{projects.length}</span>
                </div>
                {projects.length > 0 ? projects.map(project => (
                  <div key={project.id} className="glass-card rounded-[2.25rem] p-8 border border-brand/10 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <span className="text-[9px] font-black bg-success/10 text-success px-3 py-1.5 rounded-lg tracking-widest uppercase border border-success/20">
                        {project.status}
                      </span>
                      <GigCoinAmount amount={project.totalBudget} className="text-xs font-bold text-text-primary" />
                    </div>
                    <h4 className="text-xl font-black mb-1 text-text-primary">{project.title}</h4>
                    <p className="text-text-secondary text-xs mb-6 font-medium">
                      Freelancer: {project.freelancerName}
                    </p>
                    <button
                      className="w-full py-4.5 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-widest uppercase rounded-2xl transition-colors"
                      onClick={() => navigate(`/workspace/${project.id}`)}
                    >
                      Enter workspace
                    </button>
                  </div>
                )) : (
                  <div className="glass-card rounded-[2.25rem] p-8 border border-border text-center text-text-muted text-sm">
                    No active contracts.
                  </div>
                )}

                <div className="glass-card rounded-[2.25rem] p-8 border border-border flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest text-text-muted">Completed contracts</span>
                    <span className="text-3xl font-black text-text-primary">{completedContractsCount}</span>
                  </div>
                  <button
                    className="text-xs font-black uppercase tracking-widest text-brand"
                    onClick={() => navigate('/contracts')}
                  >
                    View all
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 md:p-8 rounded-[2.5rem] client-dash-ai-bg relative overflow-hidden">
            <div className="ai-radar-graphic">
              <div className="ai-radar-circle-1" />
              <div className="ai-radar-circle-2" />
              <div className="ai-radar-sweep-line" />
              <div className="ai-radar-pulse" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={20} className="client-dash-ai-icon" />
                  <h2 className="text-text-primary font-bold text-lg">AI-assisted job drafting</h2>
                </div>
                <p className="text-sm client-dash-ai-desc text-text-secondary max-w-2xl">
                  Enter your real project requirements first. GigBridge can then generate a draft for review; no market demand or match score is assumed here.
                </p>
              </div>
              <button
                className="client-dash-ai-post-btn py-3 px-5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                onClick={() => navigate('/jobs/post')}
              >
                Start a job post
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
