import { useClientDashboard } from '../hooks/useClientDashboard';
import { use3DTilt } from '../hooks/use3DTilt';
import { useApp } from '../../../app/providers/AppProvider';
import {
  PlusCircle, FileText, TrendingUp, DollarSign, ChevronRight,
  Bot, Briefcase, Star, CheckCircle, Activity, Wallet
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/client-dashboard-screen.css';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';

export default function ClientDashboardScreen() {
  const {
    user,
    greeting,
    t,
    navigate,
    chartPeriod,
    setChartPeriod,
    myJobs,
    pendingProposals,
    projects,
    spendChartData,
    recentActivity,
    aiSuggestions,
    eliteMatches,
  } = useClientDashboard();
  const { theme } = useApp();

  // Dynamic Pipeline and Funnel calculations
  const appliedCount = pendingProposals.length;
  const screenedCount = myJobs.length + 2;
  const interviewsCount = eliteMatches.length;
  const hiredCount = projects.length;

  // 3D tilt hooks for cards
  const {
    onMouseMove: handleWalletMouseMove,
    onMouseLeave: handleWalletMouseLeave,
    style: walletCardStyle
  } = use3DTilt(10); // Rotate max 10 degrees

  const {
    onMouseMove: handleBlobMouseMove,
    onMouseLeave: handleBlobMouseLeave,
    style: blobCardStyle
  } = use3DTilt(4); // Rotate max 4 degrees for centerpiece

  // Map icon strings to Lucide elements
  const activityIconMap: Record<string, React.ReactNode> = {
    CheckCircle: <CheckCircle size={14} className="client-dash-activity-icon-milestone" />,
    FileText: <FileText size={14} className="client-dash-activity-icon-proposal" />,
    Bot: <Bot size={14} className="client-dash-activity-icon-ai" />,
    DollarSign: <DollarSign size={14} className="client-dash-activity-icon-payment" />,
  };

  return (
    <AppLayout excludeMeshGradient>
      <div className="bg-background min-h-screen relative w-full overflow-x-hidden">

        {/* Structural Typography & Ambient Orbs in Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          {/* Ambient Glowing Orbs */}
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

          {/* Header Section: Experimental Avant-Garde Layout */}
          <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 stagger-up">
            <div className="max-w-4xl">
              <span className="inline-block text-primary font-bold tracking-[0.4em] uppercase text-xs mb-4">
                Hiring Intelligence v3.0
              </span>
              <h1 className="font-display-lg text-7xl md:text-[9rem] font-black avant-garde-heading hero-text-overlay mb-6 uppercase">
                CLIENT
              </h1>
              <p className="font-body-lg text-xl md:text-2xl text-text-secondary max-w-2xl leading-relaxed">
                {greeting} <span className="font-black text-primary">{user?.full_name || 'Jordan Mitchell'}</span>.
                Your recruitment velocity is currently <span className="text-primary font-bold underline decoration-4 underline-offset-8">18%</span> above quarterly target.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 shrink-0">
              <button className="group glass-card h-16 px-8 rounded-2xl flex items-center gap-3 hover:!border-brand hover:text-brand transition-all duration-300 shadow-sm"
                onClick={() => navigate('/market-insights')}>
                <span className="font-bold text-xs uppercase tracking-widest">{t('nav.marketInsights', 'Market Insights')}</span>
                <TrendingUp size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button className="group glass-card !border-brand text-brand hover:!border-brand-hover hover:text-brand-hover hover:bg-brand-soft h-16 px-10 rounded-2xl font-bold transition-all duration-300 shadow-sm flex items-center gap-3"
                onClick={() => navigate('/jobs/post')}>
                <span className="text-xs uppercase tracking-widest">{t('jobs.postJob', 'Open New Role')}</span>
                <PlusCircle size={18} className="transition-transform group-hover:scale-110" />
              </button>
            </div>
          </section>

          {/* Main Content Area: Asymmetric Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

            {/* Left Column: Primary Metrics, Charts & Talent Lists */}
            <div className="lg:col-span-8 space-y-10">

              {/* Top row: Centerpiece interactive morphing blob card and Monthly Spend Chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                {/* Hiring Success Gauge centerpiece card */}
                <div
                  className="relative h-[360px] flex items-center justify-between p-8 overflow-hidden rounded-3xl glass-card group cursor-pointer transition-all duration-500"
                  onMouseMove={handleBlobMouseMove}
                  onMouseLeave={handleBlobMouseLeave}
                  style={blobCardStyle}
                >
                  {/* Background ambient lighting */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

                  {/* Left Side: Radial Gauge */}
                  <div className="relative flex-1 flex flex-col items-center justify-center z-10 text-center">
                    <span className="font-label-md text-brand font-black uppercase tracking-[0.2em] text-[10px] block mb-4">
                      Hiring Success
                    </span>

                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        {/* Outer track */}
                        <circle cx="88" cy="88" r="76" className="stroke-surface-muted fill-none" strokeWidth="8" />
                        {/* Progress bar */}
                        <circle cx="88" cy="88" r="76" className="stroke-brand fill-none client-dash-success-ring" strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 76}
                          strokeDashoffset={2 * Math.PI * 76 * (1 - 0.88)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-5xl font-black text-text-primary tracking-tighter">88%</span>
                        <span className="block text-[8px] font-bold text-text-muted uppercase mt-0.5">Optimal Score</span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div className="w-[1px] h-48 bg-border hidden sm:block" />

                  {/* Right Side: Key Metrics Breakdown */}
                  <div className="flex-1 pl-6 space-y-5 z-10 hidden sm:block">
                    <h4 className="text-[10px] font-black tracking-widest text-text-muted uppercase">Score Breakdown</h4>

                    {/* Quality of Match */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Quality-of-Match</span>
                        <span className="text-text-primary">94.2%</span>
                      </div>
                      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full w-[94.2%]" />
                      </div>
                    </div>

                    {/* Time to Hire */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Avg. Time-to-Hire</span>
                        <span className="text-text-primary">12 Days</span>
                      </div>
                      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-info rounded-full w-[75%]" />
                      </div>
                    </div>

                    {/* Interview Pipeline */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Conversion Rate</span>
                        <span className="text-text-primary">85.0%</span>
                      </div>
                      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full w-[85%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spend chart */}
                <div className="glass-card p-6 rounded-3xl flex flex-col justify-between h-[360px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-text-primary font-bold text-base">{t('dashboard.monthlySpend', 'Monthly Spend')}</h2>
                      <p className="text-xs text-text-secondary opacity-75">{t('dashboard.investmentDesc', 'Hiring investment')}</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                  </div>

                  <div className="w-full flex-1 flex items-center justify-center">
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
                        <XAxis key="client-xaxis" dataKey="month" tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis key="client-yaxis" tick={{ fill: '#8892A4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          key="client-tooltip"
                          contentStyle={{
                            background: theme === 'black' ? 'rgba(13, 14, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            border: theme === 'black' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(73, 75, 231, 0.2)',
                            borderRadius: 12,
                            color: theme === 'black' ? '#f5f6f8' : '#19191b'
                          }}
                          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Investment']}
                        />
                        <Area key="client-area" type="monotone" dataKey="spend" stroke="url(#clientSpendLineGrad)" strokeWidth={3} fill="url(#clientSpendGrad2026)" isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Middle row: Asymmetric Spend/Wallet Card and Job Progress Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                {/* Wallet Card */}
                <div className="client-dash-wallet-card-container">
                  <div
                    className="glass-card cursor-pointer select-none p-8 rounded-3xl h-80 flex flex-col justify-between group transition-all duration-500 border-brand/20 relative overflow-hidden"
                    onMouseMove={handleWalletMouseMove}
                    onMouseLeave={handleWalletMouseLeave}
                    style={walletCardStyle}
                    onClick={() => navigate('/wallet/deposit')}
                  >
                    {/* Glowing background light */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/10 blur-3xl rounded-full pointer-events-none group-hover:scale-125 transition-transform" />

                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="block text-[8px] font-black text-brand uppercase tracking-widest">Account Escrow</span>
                        <h4 className="text-sm font-black text-text-primary mt-1">GigBridge Pay</h4>
                      </div>
                      <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                        <Wallet size={20} />
                      </div>
                    </div>

                    <div className="my-4 relative z-10">
                      <span className="block text-[9px] uppercase text-text-muted tracking-wider font-semibold mb-1">Available Funds</span>
                      <span className="text-5xl font-black tracking-tight text-text-primary">$12,450</span>
                    </div>

                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <span className="block text-[8px] uppercase text-text-muted tracking-wider font-semibold">Account Holder</span>
                        <span className="text-xs font-bold text-text-secondary">{user?.full_name || 'Jordan Mitchell'}</span>
                      </div>
                      <button className="py-2.5 px-5 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-wider uppercase rounded-xl transition-colors shadow-md border border-transparent">
                        Deposit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hiring Funnel Card */}
                <div className="glass-card p-8 rounded-3xl h-80 flex flex-col justify-between group">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center text-brand shadow-sm">
                      <Briefcase size={22} />
                    </div>
                    <div className="text-right">
                      <span className="block text-5xl font-black text-text-primary">{myJobs.filter(j => j.status === 'open').length}</span>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Active Roles</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Hiring Pipeline Status</span>

                    {/* Connected visual funnel flow */}
                    <div className="grid grid-cols-4 gap-3">

                      {/* Applied */}
                      <div className="relative group/step cursor-pointer text-center bg-surface-muted hover:bg-brand-soft p-3 rounded-2xl border border-border transition-all duration-300">
                        <span className="block text-2xl font-black text-text-primary leading-none">{appliedCount}</span>
                        <span className="text-[8px] text-text-muted font-black uppercase tracking-wider block mt-2">Applied</span>
                        <span className="text-[7px] text-brand font-bold uppercase mt-1 block opacity-0 group-hover/step:opacity-100 transition-opacity">
                          {appliedCount > 0 ? `${appliedCount} New` : 'Empty'}
                        </span>
                      </div>

                      {/* Screened */}
                      <div className="relative group/step cursor-pointer text-center bg-info/5 hover:bg-info/10 p-3 rounded-2xl border border-info/10 transition-all duration-300 text-info">
                        <span className="block text-2xl font-black leading-none">{screenedCount}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider block mt-2">Screened</span>
                        <span className="text-[7px] font-bold uppercase mt-1 block opacity-0 group-hover/step:opacity-100 transition-opacity text-info">
                          Vetted
                        </span>
                      </div>

                      {/* Interviewing */}
                      <div className="relative group/step cursor-pointer text-center bg-primary/5 hover:bg-primary/10 p-3 rounded-2xl border border-primary/10 transition-all duration-300 text-brand">
                        <span className="block text-2xl font-black leading-none">{interviewsCount}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider block mt-2">Interviews</span>
                        <span className="text-[7px] font-bold uppercase mt-1 block opacity-0 group-hover/step:opacity-100 transition-opacity text-brand">
                          Scheduled
                        </span>
                      </div>

                      {/* Hired */}
                      <div className="relative group/step cursor-pointer text-center bg-success/5 hover:bg-success/10 p-3 rounded-2xl border border-success/10 transition-all duration-300 text-success">
                        <span className="block text-2xl font-black leading-none">{hiredCount}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider block mt-2">Hired</span>
                        <span className="text-[7px] font-bold uppercase mt-1 block opacity-0 group-hover/step:opacity-100 transition-opacity text-success">
                          Active
                        </span>
                      </div>

                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom section: Elite Matches Candidate List */}
              <div className="relative pt-10">
                <h3 className="font-display-lg text-3xl font-black mb-6 pl-2 tracking-tight">ELITE MATCHES</h3>
                <div className="grid grid-cols-1 gap-6">
                  {eliteMatches.map((candidate) => {
                    const scoreNum = parseInt(candidate.match.replace('%', ''), 10) || 90;
                    const radius = 16;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference - (scoreNum / 100) * circumference;

                    return (
                      <div key={candidate.id} className="glass-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 hover:translate-x-4 hover:border-primary/30 dark:hover:border-primary/45 transition-transform duration-500">
                        <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center shrink-0 shadow-md overflow-hidden border border-border">
                          <img alt={candidate.name} className="w-full h-full object-cover" src={candidate.image} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-3 gap-4">
                            <div>
                              <h4 className="text-xl font-black tracking-tight text-text-primary">{candidate.name}</h4>
                              <p className="text-xs text-text-secondary font-medium">{candidate.title} • {candidate.details}</p>
                            </div>

                            {/* Radial Match Score Progress Meter */}
                            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                              <svg className="match-score-ring-svg w-12 h-12">
                                <circle className="match-score-ring-bg" cx="24" cy="24" r={radius} />
                                <circle className="match-score-ring-bar" cx="24" cy="24" r={radius}
                                  style={{
                                    strokeDasharray: circumference,
                                    strokeDashoffset: offset
                                  }}
                                />
                              </svg>
                              <span className="absolute text-[10px] font-black text-primary">{candidate.match}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            {candidate.tags.map((tag) => (
                              <span key={tag} className="bg-primary/5 text-primary text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-primary/10">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button className="w-14 h-14 rounded-full border border-border hover:bg-text-primary hover:border-text-primary hover:text-background transition-all flex items-center justify-center shrink-0 shadow-sm"
                          onClick={() => navigate('/talent-matching')}>
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Activity Signals & Auto Sourcing Sidebar */}
            <div className="lg:col-span-4 space-y-10">

              {/* Signals Timeline Activity */}
              <div className="glass-card rounded-[2.5rem] p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-display-lg text-xl font-black tracking-tight uppercase">Signals</h3>
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,89,187,0.7)]"></div>
                </div>
                <div className="space-y-8 relative">
                  <div className="absolute left-3 top-2 bottom-2 w-[1px] bg-border"></div>

                  {recentActivity.map((activity) => {
                    let badgeColor = 'border-primary';
                    if (activity.iconType === 'Bot') badgeColor = 'border-primary';
                    if (activity.iconType === 'DollarSign') badgeColor = 'border-success';

                    return (
                      <div key={activity.id} className="relative pl-10 group cursor-pointer hover:translate-x-1 transition-transform">
                        <div className={`absolute left-0 top-0.5 w-6.5 h-6.5 rounded-full bg-background border-4 ${badgeColor} group-hover:scale-110 transition-transform shadow-sm`}></div>
                        <p className="text-xs font-black text-text-primary leading-tight mb-1">{activity.text}</p>
                        <p className="text-[10px] text-text-secondary opacity-75">Event trigger recorded</p>
                        <span className="text-[9px] font-black text-text-muted uppercase mt-2 block">{activity.time}</span>
                      </div>
                    );
                  })}
                </div>
                <button className="w-full mt-10 py-5 rounded-2xl border border-dashed border-border text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all bg-transparent"
                  onClick={() => navigate('/notifications')}>
                  View Activity Log
                </button>
              </div>

              {/* Project Tracker Column */}
              <div className="space-y-6">
                <h3 className="font-display-lg text-xl font-black tracking-tight px-4 uppercase">Project Tracker</h3>

                {/* Active Projects List */}
                {projects.length > 0 ? (
                  projects.map((proj) => {
                    const activeMilestone = proj.milestones.find(m => m.status === 'in_progress') || proj.milestones[0];
                    return (
                      <div key={proj.id} className="glass-card rounded-[2.25rem] p-8 border border-brand/10 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <span className="text-[9px] font-black bg-success/10 text-success px-3 py-1.5 rounded-lg tracking-widest uppercase border border-success/20">
                            {proj.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-text-muted">
                            Progress: {proj.progress}%
                          </span>
                        </div>

                        <h4 className="text-xl font-black mb-1 text-text-primary">{proj.title}</h4>
                        <p className="text-text-secondary text-xs mb-6 font-medium">Freelancer: Alex Johnson</p>

                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-text-secondary">Next: {activeMilestone?.title || 'Milestone'}</span>
                            <span className="text-text-primary"><GigCoinAmount amount={activeMilestone?.amount} /></span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(22,163,74,0.4)]"
                              style={{ width: `${proj.progress}%` }}
                            />
                          </div>
                        </div>

                        <button className="w-full py-4.5 bg-brand text-primary-foreground hover:bg-brand-hover font-bold text-xs tracking-widest uppercase rounded-2xl transition-colors"
                          onClick={() => navigate(`/workspace/${proj.id}`)}>
                          Enter Workspace
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="glass-card rounded-[2.25rem] p-8 border border-border text-center text-text-muted text-sm">
                    No active projects.
                  </div>
                )}

                {/* Action Center - Milestone Approval */}
                <div className="glass-card rounded-[2.25rem] p-8 border border-border">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-warning">Review Required</span>
                    <div className="px-3 py-1 bg-warning/10 rounded text-[9px] font-bold text-warning">1 PENDING</div>
                  </div>
                  <h4 className="text-lg font-black mb-2 text-text-primary">Milestone Submission</h4>
                  <p className="text-text-secondary text-xs mb-6 leading-relaxed">
                    Alex Johnson has submitted **Milestone 2 (Core Frontend)** for your review. Please verify deliverables before releasing funds ($2,500).
                  </p>
                  <button className="w-full py-4.5 bg-text-primary text-background font-bold text-xs tracking-widest uppercase rounded-2xl hover:bg-brand hover:text-primary-foreground transition-colors"
                    onClick={() => navigate('/workspace/proj_1')}>
                    Review Deliverables
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* AI Job Auto-Generator Scanner Container */}
          <div className="glass-card p-6 md:p-8 rounded-[2.5rem] client-dash-ai-bg relative overflow-hidden">
            {/* Radar sweeping graphics */}
            <div className="ai-radar-graphic">
              <div className="ai-radar-circle-1" />
              <div className="ai-radar-circle-2" />
              <div className="ai-radar-sweep-line" />
              <div className="ai-radar-pulse" />
            </div>

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <Bot size={20} className="client-dash-ai-icon animate-bounce" />
                <h2 className="text-text-primary font-bold text-lg">{t('dashboard.aiSuggestions', 'AI Automated Job Generator')}</h2>
              </div>
              <span className="badge-purple text-xs font-semibold py-1 px-3 shadow-sm rounded-full">
                Auto-Draft
              </span>
            </div>
            <p className="text-sm mb-6 client-dash-ai-desc relative z-10 text-text-secondary">
              {t('dashboard.aiSuggestionsDesc', 'Instantly generate optimized job posts automatically using our AI model matching current market demand:')}
            </p>

            <div className="grid md:grid-cols-2 gap-6 relative z-10">
              {aiSuggestions.map((s, i) => {
                const scoreNum = parseInt(s.match.replace('%', ''), 10) || 90;
                const radius = 16;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (scoreNum / 100) * circumference;

                return (
                  <div key={i} className="p-5 rounded-xl cursor-pointer transition-all client-dash-ai-card flex flex-col justify-between h-48"
                    onClick={() => navigate('/jobs/post')}>
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-text-primary font-black text-sm leading-snug">{s.title}</h3>

                        {/* Radial score */}
                        <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                          <svg className="match-score-ring-svg w-10 h-10">
                            <circle className="match-score-ring-bg" cx="20" cy="20" r={radius} />
                            <circle className="match-score-ring-bar" cx="20" cy="20" r={radius}
                              style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: offset
                              }}
                            />
                          </svg>
                          <span className="absolute text-[9px] font-black text-primary">{s.match}</span>
                        </div>
                      </div>

                      <p className="text-xs mb-3 client-dash-ai-budget font-medium">Budget: <span className="text-text-primary font-bold">{s.budget}</span></p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.skills.map(sk => (
                          <span key={sk} className="badge-purple text-[9px] py-0.5 px-2 font-bold rounded-full">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-auto">
                      <span className="text-[10px] font-bold client-dash-ai-urgency flex items-center gap-1">
                        <TrendingUp size={12} />
                        {s.urgency}
                      </span>
                      <button className="client-dash-ai-post-btn py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 shrink-0">
                        {t('dashboard.postSimilar', 'Auto-Generate Job')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
