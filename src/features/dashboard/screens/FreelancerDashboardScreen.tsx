import { useCallback, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Crown,
  FileText,
  Megaphone,
  Shield,
  Star,
  Wallet,
  Zap,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount, GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { useFreelancerDashboard } from '../hooks/useFreelancerDashboard';
import { use3DTilt } from '../hooks/use3DTilt';
import { premiumAPI } from '../../premium/api';
import { usePremiumResource } from '../../premium/hooks';
import '../styles/freelancer-dashboard-screen.css';

const formatAxisAmount = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

export default function FreelancerDashboardScreen() {
  const premium = usePremiumResource(useCallback(premiumAPI.points, []));
  const [premiumBarOpen, setPremiumBarOpen] = useState(false);
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
    pendingProposalsCount,
    activeProjects,
    completedProjectsCount,
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
  } = use3DTilt(4);

  return (
    <AppLayout excludeMeshGradient>
      <div className="bg-background min-h-screen relative w-full overflow-x-hidden">
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

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-10 space-y-20">
          <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 fl-stagger-up">
            <div className="flex-1 min-w-0">
              <span className="inline-block text-brand font-bold tracking-[0.4em] uppercase text-xs mb-4">
                Freelancer workspace
              </span>
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
            <button
              className="group glass-card h-16 px-8 rounded-2xl flex items-center gap-3 hover:!border-brand hover:text-brand transition-all duration-300 shadow-sm"
              onClick={() => navigate('/jobs/browse')}
            >
              <span className="font-bold text-xs uppercase tracking-widest">Browse jobs</span>
              <Zap size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </section>

          {error && (
            <div className="glass-card rounded-2xl border border-warning/30 p-4 flex items-center gap-3 text-sm text-text-secondary">
              <AlertCircle size={18} className="text-warning shrink-0" />
              {error}
            </div>
          )}

          {!isLoading && skillsCount === 0 && (
            <section className="glass-card rounded-3xl border border-brand/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <div className="text-sm font-black text-text-primary">Add skills to improve discoverability</div>
                <p className="text-sm text-text-secondary mt-1">
                  Your profile currently has no canonical skills. Add the skills you can verify from your real work.
                </p>
              </div>
              <button
                className="shrink-0 rounded-2xl bg-brand px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground"
                onClick={() => navigate(`/profile/freelancer/${user?.id || ''}/edit`)}
              >
                Add skills
              </button>
            </section>
          )}

          {premium.data?.isPremium && (
            <div className="glass-card w-full rounded-3xl overflow-hidden transition-all hover:!border-brand">
              <button
                type="button"
                className="w-full p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 text-left"
                onClick={() => setPremiumBarOpen(open => !open)}
                aria-expanded={premiumBarOpen}
              >
                <div className="flex items-center gap-4">
                  <Crown size={24} className="text-purple" />
                  <div>
                    <div className="font-black text-text-primary">Premium status</div>
                    <div className="text-sm text-text-secondary">
                      {premium.data.tierName || 'Premium'} · {premium.data.eloPoints} Elo
                    </div>
                  </div>
                </div>
                <span className="font-bold text-brand flex items-center gap-2">
                  {premiumBarOpen ? 'Hide details' : 'Show details'}
                  <ChevronDown size={18} className={`transition-transform ${premiumBarOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {premiumBarOpen && (
                <div className="border-t border-border px-6 py-4 flex flex-wrap items-center gap-3">
                  <button className="premium-dashboard-link" onClick={() => navigate('/premium/freelancer/points')}>
                    <Star size={16} /> Points & tier
                  </button>
                  <button className="premium-dashboard-link" onClick={() => navigate('/premium/freelancer/rank-protection')}>
                    <Shield size={16} /> Rank protection
                  </button>
                  <button className="premium-dashboard-link" onClick={() => navigate('/premium/freelancer/promotions')}>
                    <Megaphone size={16} /> Promotions
                  </button>
                  <button className="premium-dashboard-link ml-auto" onClick={() => navigate('/premium/freelancer')}>
                    Open hub <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div
                  className="relative h-[360px] flex items-center justify-between p-8 overflow-hidden rounded-3xl glass-card group cursor-pointer transition-all duration-500"
                  onMouseMove={handleGaugeMouseMove}
                  onMouseLeave={handleGaugeMouseLeave}
                  style={gaugeCardStyle}
                  onClick={() => navigate(`/profile/freelancer/${user?.id || ''}/edit`)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />
                  <div className="relative flex-1 flex flex-col items-center justify-center z-10 text-center">
                    <span className="font-label-md text-brand font-black uppercase tracking-[0.2em] text-[10px] block mb-4">
                      Profile completion
                    </span>
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="88" cy="88" r={gaugeR} className="stroke-surface-muted fill-none" strokeWidth="8" />
                        <circle
                          cx="88"
                          cy="88"
                          r={gaugeR}
                          className="stroke-brand fill-none freelancer-dash-gauge-ring"
                          strokeWidth="8"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={gaugeOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-5xl font-black text-text-primary tracking-tighter">{profileStrength}%</span>
                        <span className="block text-[8px] font-bold text-text-muted uppercase mt-0.5">From profile API</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-[1px] h-48 bg-border hidden sm:block" />
                  <div className="flex-1 pl-6 space-y-5 z-10 hidden sm:block">
                    <h4 className="text-[10px] font-black tracking-widest text-text-muted uppercase">Profile facts</h4>
                    <div>
                      <span className="block text-[9px] uppercase text-text-muted">Portfolio items</span>
                      <span className="text-lg font-black text-text-primary">{portfolioCount}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-text-muted">Listed skills</span>
                      <span className="text-lg font-black text-text-primary">{skillsCount}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-text-muted">Review rating</span>
                      <span className="text-lg font-black text-text-primary">{rating.toFixed(1)}/5.0</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-3xl flex flex-col justify-between h-[360px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-text-primary font-bold text-base">
                        {chartPeriod === 'monthly' ? 'Monthly earnings' : 'Yearly earnings'}
                      </h2>
                      <p className="text-xs text-text-secondary opacity-75">Confirmed contract releases</p>
                    </div>
                    <div className="fl-chart-header-tabs flex">
                      <button
                        className={`fl-chart-tab-btn ${chartPeriod === 'monthly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('monthly')}
                      >
                        M
                      </button>
                      <button
                        className={`fl-chart-tab-btn ${chartPeriod === 'yearly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('yearly')}
                      >
                        Y
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {isFinancialLoading ? (
                      <p className="text-sm text-text-muted animate-pulse">Loading financial data…</p>
                    ) : financialError ? (
                      <p className="text-sm text-warning text-center">{financialError}</p>
                    ) : earningsData.length === 0 || !hasFinancialActivity ? (
                      <p className="text-sm text-text-muted text-center">No confirmed earnings in this period.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={earningsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="flEarningsLineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#494be7" />
                              <stop offset="100%" stopColor="#3f41d0" />
                            </linearGradient>
                            <linearGradient id="flEarningsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#494be7" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#494be7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAxisAmount} />
                          <Tooltip
                            contentStyle={{
                              background: theme === 'black' ? 'rgba(13,14,25,0.95)' : 'rgba(255,255,255,0.95)',
                              border: theme === 'black' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(73,75,231,0.2)',
                              borderRadius: 12,
                              color: theme === 'black' ? '#f5f6f8' : '#19191b',
                            }}
                            formatter={(value: number) => [`${value.toLocaleString()} G-coin`, 'Received']}
                          />
                          <Area type="monotone" dataKey="earned" stroke="url(#flEarningsLineGrad)" strokeWidth={3} fill="url(#flEarningsAreaGrad)" isAnimationActive />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="block text-[8px] uppercase text-text-muted tracking-wider font-semibold">This period</span>
                      <GigCoinAmount
                        amount={financialOverview?.totalAmount ?? 0}
                        className="text-2xl font-black text-text-primary tracking-tight"
                      />
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] uppercase text-text-muted tracking-wider font-semibold">Average / project</span>
                      <GigCoinAmount amount={financialOverview?.averageAmount ?? 0} className="text-xs font-bold text-text-secondary" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  {
                    label: 'Available balance',
                    value: <GigCoinAmount amount={wallet?.totalSpendableGigCoin ?? 0} />,
                    icon: <GCoinIcon size={18} />,
                    detail: 'Current wallet',
                    color: 'text-success',
                    bg: 'bg-success/10',
                    border: 'border-success/20',
                  },
                  {
                    label: 'Completed projects',
                    value: completedProjectsCount,
                    icon: <Briefcase size={18} />,
                    detail: 'From contracts',
                    color: 'text-brand',
                    bg: 'bg-brand/10',
                    border: 'border-brand/20',
                  },
                  {
                    label: 'Pending proposals',
                    value: pendingProposalsCount,
                    icon: <FileText size={18} />,
                    detail: 'Awaiting decision',
                    color: 'text-info',
                    bg: 'bg-info/10',
                    border: 'border-info/20',
                  },
                  {
                    label: 'Active contracts',
                    value: activeProjects,
                    icon: <Wallet size={18} />,
                    detail: 'Current work',
                    color: 'text-warning',
                    bg: 'bg-warning/10',
                    border: 'border-warning/20',
                  },
                ].map(stat => (
                  <div key={stat.label} className={`glass-card freelancer-bento-stat p-6 rounded-3xl border ${stat.border}`}>
                    <div className={`w-10 h-10 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                      {stat.icon}
                    </div>
                    <span className="block text-3xl font-black text-text-primary tracking-tight leading-none mb-2">
                      {isLoading ? '—' : stat.value}
                    </span>
                    <span className="block text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">{stat.label}</span>
                    <span className={`text-[10px] font-bold ${stat.color}`}>{stat.detail}</span>
                  </div>
                ))}
              </div>

              <div className="relative pt-4">
                <div className="flex items-center justify-between mb-6 pl-2">
                  <h3 className="text-3xl font-black tracking-tight uppercase">
                    <Briefcase size={22} className="inline mr-2 text-brand" />Recent open jobs
                  </h3>
                  <button
                    className="flex items-center gap-1 text-xs font-black uppercase tracking-widest freelancer-dash-jobs-link"
                    onClick={() => navigate('/jobs/browse')}
                  >
                    Browse all <ArrowUpRight size={14} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(item => (
                      <div key={item} className="glass-card p-8 rounded-3xl animate-pulse h-24 opacity-40" />
                    ))}
                  </div>
                ) : recommendedJobs.length === 0 ? (
                  <div className="glass-card p-8 rounded-3xl text-center text-sm text-text-muted">
                    No open jobs were returned by the jobs API.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {recommendedJobs.map(job => (
                      <div
                        key={job.id}
                        className="glass-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 freelancer-dash-job-card border border-border cursor-pointer"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center shrink-0 border border-brand/20">
                          <Briefcase size={24} className="text-brand" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-3 gap-4">
                            <div>
                              <h4 className="text-lg font-black tracking-tight text-text-primary">{job.title}</h4>
                              <p className="text-xs text-text-secondary font-medium">
                                {job.categoryName} · <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                              </p>
                            </div>
                            {job.hasAiInterview && (
                              <span className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-brand">
                                AI interview enabled
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            {job.skills.slice(0, 4).map(skill => (
                              <span key={skill} className="bg-brand/5 text-brand text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-brand/10">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          className="w-14 h-14 rounded-full border border-border hover:bg-text-primary hover:border-text-primary hover:text-background transition-all flex items-center justify-center shrink-0 shadow-sm"
                          onClick={event => {
                            event.stopPropagation();
                            navigate(`/jobs/${job.id}`);
                          }}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
              <div className="glass-card rounded-[2.5rem] p-8">
                <h3 className="text-xl font-black tracking-tight uppercase mb-4">Activity</h3>
                <p className="text-sm text-text-secondary">
                  Activity events are not included in the dashboard API. Open notifications for persisted updates.
                </p>
                <button
                  className="w-full mt-8 py-5 rounded-2xl border border-dashed border-border text-[10px] font-black uppercase tracking-widest hover:border-brand hover:text-brand transition-all bg-transparent"
                  onClick={() => navigate('/notifications')}
                >
                  View notifications
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xl font-black tracking-tight uppercase">Active work</h3>
                  <span className="text-xs font-bold text-text-muted">{activeProjects}</span>
                </div>
                {projects.length === 0 ? (
                  <div className="glass-card rounded-[2.25rem] p-8 border border-border text-sm text-text-muted text-center">
                    No active contracts.
                  </div>
                ) : projects.slice(0, 2).map(project => (
                  <div key={project.id} className="glass-card rounded-[2.25rem] p-8 border border-brand/10 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <span className="text-[9px] font-black bg-success/10 text-success px-3 py-1.5 rounded-lg tracking-widest uppercase border border-success/20">
                        {project.status}
                      </span>
                      <GigCoinAmount amount={project.totalBudget} className="text-xs font-bold text-text-primary" />
                    </div>
                    <h4 className="text-lg font-black mb-1 text-text-primary relative z-10">{project.title}</h4>
                    <p className="text-text-secondary text-xs mb-4 font-medium relative z-10">
                      Client: {project.clientName}
                    </p>
                    <button
                      className="w-full py-3 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-widest uppercase rounded-2xl transition-colors relative z-10"
                      onClick={() => navigate(`/workspace/${project.id}`)}
                    >
                      Enter workspace
                    </button>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-[2.25rem] p-8 border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                    <Star size={18} fill="currentColor" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-text-muted uppercase tracking-widest">Review rating</span>
                    <span className="text-2xl font-black text-text-primary">{rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold gap-4">
                    <span className="text-text-secondary">Major</span>
                    <span className="text-text-primary text-right">{majorName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-secondary">Listed skills</span>
                    <span className="text-text-primary">{skillsCount}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-secondary">Portfolio items</span>
                    <span className="text-text-primary">{portfolioCount}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold gap-4">
                    <span className="text-text-secondary">Active title</span>
                    <span className="text-text-primary text-right truncate max-w-[150px]">{profileTitle || 'Not provided'}</span>
                  </div>
                </div>
                <button
                  className="w-full mt-6 py-4 rounded-2xl border border-brand/30 text-brand text-[10px] font-black uppercase tracking-widest hover:bg-brand-soft transition-all"
                  onClick={() => navigate(`/profile/freelancer/${user?.id || ''}/edit`)}
                >
                  Edit profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
