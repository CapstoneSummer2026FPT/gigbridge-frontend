import { useNavigate } from 'react-router';
import {
  TrendingUp, Star, Zap, ChevronRight,
  FileText, Briefcase, ArrowUpRight,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useFreelancerDashboard } from '../hooks/useFreelancerDashboard';
import { use3DTilt } from '../hooks/use3DTilt';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import '../styles/freelancer-dashboard-screen.css';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';

export default function FreelancerDashboardScreen() {
  const navigate = useNavigate();

  const {
    user,
    theme,
    userName,
    profileStrength,
    rating,
    profileTitle,
    chartPeriod,
    setChartPeriod,
    earningsData,
    pendingProposalsCount,
    activeProjects,
    projects,
    recommendedJobs,
    recentActivity,
    gaugeR,
    gaugeCircumference,
    gaugeOffset,
    isLoading,
  } = useFreelancerDashboard();

  const {
    onMouseMove: handleGaugeMouseMove,
    onMouseLeave: handleGaugeMouseLeave,
    style: gaugeCardStyle,
  } = use3DTilt(4);

  return (
    <AppLayout excludeMeshGradient>
      <div className="bg-background min-h-screen relative w-full overflow-x-hidden">

        {/* Ambient Orbs */}
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

          {/* ── Hero Header ── */}
          <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 fl-stagger-up">
            <div className="max-w-4xl">
              <span className="inline-block text-brand font-bold tracking-[0.4em] uppercase text-xs mb-4">
                Career Intelligence v3.0
              </span>
              <h1 className="text-7xl md:text-[9rem] font-black freelancer-avant-heading freelancer-hero-text mb-6 uppercase">
                FREELANCER
              </h1>
              <p className="text-xl md:text-2xl text-text-secondary max-w-2xl leading-relaxed">
                Welcome back, <span className="font-black text-text-primary">{userName}</span>.{' '}
                {isLoading ? (
                  <span className="opacity-50 animate-pulse">Loading your stats…</span>
                ) : (
                  <>
                    Your profile strength is{' '}
                    <span className="text-brand font-bold underline decoration-4 underline-offset-8">{profileStrength}%</span>.
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 shrink-0">
              <button
                className="group glass-card h-16 px-8 rounded-2xl flex items-center gap-3 hover:!border-brand hover:text-brand transition-all duration-300 shadow-sm"
                onClick={() => navigate('/jobs/browse')}
              >
                <span className="font-bold text-xs uppercase tracking-widest">Browse Jobs</span>
                <Zap size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </section>

          {/* ── Main Content: Asymmetric 12-col Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

            {/* ── Left Column (8 cols) ── */}
            <div className="lg:col-span-8 space-y-10">

              {/* Top Row: Profile Strength Gauge + Earnings Chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                {/* Profile Strength Gauge */}
                <div
                  className="relative h-[360px] flex items-center justify-between p-8 overflow-hidden rounded-3xl glass-card group cursor-pointer transition-all duration-500"
                  onMouseMove={handleGaugeMouseMove}
                  onMouseLeave={handleGaugeMouseLeave}
                  style={gaugeCardStyle}
                  onClick={() => navigate('/profile/freelancer/' + (user?.id || '') + '/edit')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

                  {/* Left: Radial Gauge */}
                  <div className="relative flex-1 flex flex-col items-center justify-center z-10 text-center">
                    <span className="font-label-md text-brand font-black uppercase tracking-[0.2em] text-[10px] block mb-4">
                      Profile Strength
                    </span>
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="88" cy="88" r={gaugeR} className="stroke-surface-muted fill-none" strokeWidth="8" />
                        <circle
                          cx="88" cy="88" r={gaugeR}
                          className="stroke-brand fill-none freelancer-dash-gauge-ring"
                          strokeWidth="8"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={gaugeOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-5xl font-black text-text-primary tracking-tighter">{profileStrength}%</span>
                        <span className="block text-[8px] font-bold text-text-muted uppercase mt-0.5">Completion</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-48 bg-border hidden sm:block" />

                  {/* Right: Breakdown */}
                  <div className="flex-1 pl-6 space-y-5 z-10 hidden sm:block">
                    <h4 className="text-[10px] font-black tracking-widest text-text-muted uppercase">Strength Breakdown</h4>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Portfolio Quality</span>
                        <span className="text-text-primary">96.0%</span>
                      </div>
                      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full w-[96%]" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Skills Coverage</span>
                        <span className="text-text-primary">88.0%</span>
                      </div>
                      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-info rounded-full w-[88%]" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Review Score</span>
                        <span className="text-text-primary">{rating}/5.0</span>
                      </div>
                      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${(rating / 5) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings Chart */}
                <div className="glass-card p-6 rounded-3xl flex flex-col justify-between h-[360px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-text-primary font-bold text-base">Monthly Earnings</h2>
                      <p className="text-xs text-text-secondary opacity-75">Income overview</p>
                    </div>
                    <div className="fl-chart-header-tabs flex">
                      <button
                        className={`fl-chart-tab-btn ${chartPeriod === 'monthly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('monthly')}
                      >M</button>
                      <button
                        className={`fl-chart-tab-btn ${chartPeriod === 'yearly' ? 'active' : ''}`}
                        onClick={() => setChartPeriod('yearly')}
                      >Y</button>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
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
                        <YAxis tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{
                            background: theme === 'black' ? 'rgba(13,14,25,0.95)' : 'rgba(255,255,255,0.95)',
                            border: theme === 'black' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(73,75,231,0.2)',
                            borderRadius: 12,
                            color: theme === 'black' ? '#f5f6f8' : '#19191b',
                          }}
                          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Earned']}
                        />
                        <Area type="monotone" dataKey="earned" stroke="url(#flEarningsLineGrad)" strokeWidth={3} fill="url(#flEarningsAreaGrad)" isAnimationActive />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="block text-[8px] uppercase text-text-muted tracking-wider font-semibold">This Month</span>
                      <span className="text-2xl font-black text-text-primary tracking-tight">
                        {isLoading ? '—' : '8,200 G-coin'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-success">↑ 10.8% vs last month</span>
                  </div>
                </div>
              </div>

              {/* Bento Stat Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Earnings', value: '142.5K G-coin', icon: <GCoinIcon size={18} />, change: '+8.2K G-coin this month', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
                  { label: 'Completed Projects', value: '87', icon: <Briefcase size={18} />, change: '+3 this month', color: 'text-brand', bg: 'bg-brand/10', border: 'border-brand/20' },
                  { label: 'Active Proposals', value: isLoading ? '—' : String(pendingProposalsCount), icon: <FileText size={18} />, change: '2 shortlisted', color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
                  { label: 'Success Rate', value: '96.4%', icon: <TrendingUp size={18} />, change: 'Top 5% globally', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
                ].map((stat, i) => (
                  <div key={i} className={`glass-card freelancer-bento-stat p-6 rounded-3xl border ${stat.border}`}>
                    <div className={`w-10 h-10 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                      {stat.icon}
                    </div>
                    <span className="block text-4xl font-black text-text-primary tracking-tight leading-none mb-2">{stat.value}</span>
                    <span className="block text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">{stat.label}</span>
                    <span className={`text-[10px] font-bold ${stat.color}`}>↑ {stat.change}</span>
                  </div>
                ))}
              </div>

              {/* Recommended Jobs — Elite Style */}
              <div className="relative pt-4">
                <div className="flex items-center justify-between mb-6 pl-2">
                  <h3 className="text-3xl font-black tracking-tight uppercase">
                    <Zap size={22} className="inline mr-2 text-brand" />AI Matches
                  </h3>
                  <button
                    className="flex items-center gap-1 text-xs font-black uppercase tracking-widest freelancer-dash-jobs-link"
                    onClick={() => navigate('/jobs/browse')}
                  >
                    Browse All <ArrowUpRight size={14} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-card p-8 rounded-3xl animate-pulse h-24 opacity-40" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {recommendedJobs.map(job => {
                      const score = job.aiMatchScore || 90;
                      const radius = 16;
                      const circumference = 2 * Math.PI * radius;
                      const offset = circumference - (score / 100) * circumference;
                      return (
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
                                  ${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()} · Fixed Price · Remote
                                </p>
                              </div>
                              {/* Radial Match Score */}
                              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                                <svg className="match-score-ring-svg w-12 h-12">
                                  <circle className="match-score-ring-bg" cx="24" cy="24" r={radius} />
                                  <circle
                                    className="match-score-ring-bar"
                                    cx="24" cy="24" r={radius}
                                    style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
                                  />
                                </svg>
                                <span className="absolute text-[10px] font-black text-brand">{score}%</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                              {job.skills.slice(0, 4).map((s, idx) => (
                                <span key={idx} className="bg-brand/5 text-brand text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-brand/10">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            className="w-14 h-14 rounded-full border border-border hover:bg-text-primary hover:border-text-primary hover:text-background transition-all flex items-center justify-center shrink-0 shadow-sm"
                            onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column (4 cols) ── */}
            <div className="lg:col-span-4 space-y-10">

              {/* Activity Signals */}
              <div className="glass-card rounded-[2.5rem] p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black tracking-tight uppercase">Signals</h3>
                  <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                </div>
                <div className="space-y-8 relative">
                  <div className="absolute left-3 top-2 bottom-2 w-[1px] bg-border" />
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="relative pl-10 freelancer-signals-item cursor-pointer hover:translate-x-1 transition-transform">
                      <div className={`freelancer-signals-dot border-4 ${activity.color}`} />
                      <p className="text-xs font-black text-text-primary leading-tight mb-1">{activity.text}</p>
                      <p className="text-[10px] text-text-secondary opacity-75">Event trigger recorded</p>
                      <span className="text-[9px] font-black text-text-muted uppercase mt-2 block">{activity.time}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full mt-10 py-5 rounded-2xl border border-dashed border-border text-[10px] font-black uppercase tracking-widest hover:border-brand hover:text-brand transition-all bg-transparent"
                  onClick={() => navigate('/notifications')}
                >
                  View Activity Log
                </button>
              </div>

              {/* Active Projects / Current Work */}
              {activeProjects > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-black tracking-tight px-4 uppercase">Active Work</h3>
                  {projects.slice(0, 2).map((proj: any) => {
                    const activeMilestone = proj.milestones?.find((m: any) => m.status === 'in_progress') || proj.milestones?.[0];
                    return (
                      <div key={proj.id} className="glass-card rounded-[2.25rem] p-8 border border-brand/10 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <span className="text-[9px] font-black bg-success/10 text-success px-3 py-1.5 rounded-lg tracking-widest uppercase border border-success/20">
                            {proj.status?.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-text-muted">{proj.progress}%</span>
                        </div>
                        <h4 className="text-lg font-black mb-1 text-text-primary relative z-10">{proj.title}</h4>
                        <p className="text-text-secondary text-xs mb-4 font-medium relative z-10">
                          Next: {activeMilestone?.title || 'Milestone'} — ${activeMilestone?.amount?.toLocaleString()}
                        </p>
                        <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden mb-4">
                          <div
                            className="h-full bg-success rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(22,163,74,0.4)]"
                            style={{ width: `${proj.progress}%` }}
                          />
                        </div>
                        <button
                          className="w-full py-3 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-widest uppercase rounded-2xl transition-colors relative z-10"
                          onClick={() => navigate(`/workspace/${proj.id}`)}
                        >
                          Enter Workspace
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Profile Quick Stats */}
              <div className="glass-card rounded-[2.25rem] p-8 border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                    <Star size={18} fill="currentColor" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-text-muted uppercase tracking-widest">Your Rating</span>
                    <span className="text-2xl font-black text-text-primary">{rating}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-secondary">Preferred Pricing</span>
                    <span className="text-text-primary">Fixed Price</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-secondary">Market Average</span>
                    <span className="text-success font-bold">$4.8K/project ↑</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-secondary">Active Title</span>
                    <span className="text-text-primary truncate max-w-[120px]">{profileTitle}</span>
                  </div>
                </div>
                <button
                  className="w-full mt-6 py-4 rounded-2xl border border-brand/30 text-brand text-[10px] font-black uppercase tracking-widest hover:bg-brand-soft transition-all"
                  onClick={() => navigate('/profile/freelancer/' + (user?.id || '') + '/edit')}
                >
                  Edit Profile
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
