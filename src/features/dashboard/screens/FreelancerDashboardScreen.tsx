import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Bot, TrendingUp, DollarSign, Star, Zap, ChevronRight, FileText, Briefcase, Activity, ArrowUpRight } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { StatCard } from '../../../shared/components/GlassCard';
import { useApp } from '../../../app/providers/AppProvider';
import { DB, SEED_JOBS } from '../../../mock_backend';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/freelancer-dashboard-screen.css';

const EARNINGS_DATA = [
  { id: 'freelancer-oct', month: 'Oct', earned: 3200 },
  { id: 'freelancer-nov', month: 'Nov', earned: 4100 },
  { id: 'freelancer-dec', month: 'Dec', earned: 3800 },
  { id: 'freelancer-jan', month: 'Jan', earned: 5200 },
  { id: 'freelancer-feb', month: 'Feb', earned: 6100 },
  { id: 'freelancer-mar', month: 'Mar', earned: 7400 },
  { id: 'freelancer-apr', month: 'Apr', earned: 8200 },
] as const;

const AI_INSIGHTS = [
  { text: 'Your React proposal win rate is 73% – above average by 28%', type: 'strength', icon: '💪' },
  { text: 'Add "Next.js 15" to your skills to unlock 12% more job matches', type: 'tip', icon: '💡' },
  { text: 'Best time to submit proposals: Tuesday 9–11 AM (68% open rate)', type: 'insight', icon: '⏰' },
];

export default function FreelancerDashboardScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  
  const profile = DB.getFreelancerProfile(user?.id || 'demo_freelancer_001');
  const proposals = DB.getProposalsByFreelancer(user?.id || 'demo_freelancer_001');
  const projects = DB.getProjectsByFreelancer(user?.id || 'demo_freelancer_001');
  const recommendedJobs = SEED_JOBS.filter(j => j.isAiRecommended).slice(0, 3);

  const profileStrength = profile?.profile_completion_score || 94;
  
  // Generate avatar from user's name
  const userName = user?.full_name || user?.first_name || 'Demo';
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="glass-card p-6 mb-8 freelancer-dash-header-bg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <img src={avatarUrl} alt={userName}
              className="w-16 h-16 rounded-2xl avatar-glow flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm mb-0.5 freelancer-dash-greeting">Welcome back,</p>
              <h1 className="text-3xl font-black text-primary">{userName} 👋</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star size={14} fill="#F59E0B" className="freelancer-dash-star-icon" />
                  <span className="text-primary font-semibold text-sm">{profile?.rating || 4.9}</span>
                  <span className="text-xs freelancer-dash-review-count">(87 reviews)</span>
                </div>
                <span className="badge-green">✓ Available</span>
                <span className="badge-cyan">{profile?.title?.split(' ').slice(0, 2).join(' ') || 'Developer'}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-purple px-4 py-2 text-sm flex items-center gap-2"
                onClick={() => navigate('/ai-assistant')}>
                <Bot size={16} />
                AI Proposal Generator
              </button>
              <button className="btn-ghost-cyan px-4 py-2 text-sm"
                onClick={() => navigate('/jobs/browse')}>
                Browse Jobs
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Earnings" value={`$${(142500 / 1000).toFixed(1)}K`}
            icon={<DollarSign size={16} />} accentColor="green" change="+$8.2K this month" changeType="up" />
          <StatCard label="Completed Projects" value={87}
            icon={<Briefcase size={16} />} accentColor="cyan" change="+3 this month" changeType="up" />
          <StatCard label="Active Proposals" value={proposals.filter(p => p.status === 'pending').length}
            icon={<FileText size={16} />} accentColor="purple" change="2 shortlisted" changeType="up" />
          <StatCard label="Success Rate" value="96.4%" icon={<TrendingUp size={16} />} accentColor="amber"
            change="Top 5% freelancers" changeType="up" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Earnings Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-primary font-semibold">Earnings Overview</h2>
                <p className="text-xs mt-1 freelancer-dash-chart-desc">Monthly earnings breakdown</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">$8,200</p>
                <p className="text-xs freelancer-dash-chart-growth">↑ 10.8% vs last month</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={EARNINGS_DATA}>
                <defs>
                  <linearGradient id="freelancerEarningsGrad2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9F4BFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9F4BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis key="freelancer-xaxis" dataKey="month" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis key="freelancer-yaxis" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip key="freelancer-tooltip" contentStyle={{ background: '#0D1526', border: '1px solid rgba(159,75,255,0.3)', borderRadius: 10, color: 'white' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Earned']} />
                <Area key="freelancer-area" type="monotone" dataKey="earned" stroke="#9F4BFF" strokeWidth={2} fill="url(#freelancerEarningsGrad2026)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            {/* Preferred Pricing */}
            <div className="glass-card neon-border-green p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs mb-1 freelancer-dash-rate-label">Preferred Pricing</p>
                  <p className="text-2xl font-black text-primary">Fixed<span className="text-sm opacity-50"> price</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs mb-1 freelancer-dash-rate-label">Market Avg.</p>
                  <p className="text-sm font-semibold freelancer-dash-market-avg">$4.8K/project ↑</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-6 mb-8 freelancer-dash-ai-bg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center animate-orb freelancer-dash-ai-icon-bg">
              <Bot size={14} className="freelancer-dash-ai-icon" />
            </div>
            <h2 className="text-primary font-semibold">AI Career Insights</h2>
            <span className="badge-purple text-xs ml-auto">Personalized for You</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {AI_INSIGHTS.map((insight, i) => (
              <div key={i} className="p-4 rounded-xl freelancer-dash-ai-insight-card">
                <span className="text-xl mb-2 block">{insight.icon}</span>
                <p className="text-sm text-primary leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Jobs */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap size={18} className="freelancer-dash-jobs-icon" />
              <h2 className="text-primary font-semibold">AI-Recommended Jobs</h2>
            </div>
            <button className="text-sm flex items-center gap-1 freelancer-dash-jobs-link"
              onClick={() => navigate('/jobs/browse')}>
              Browse All <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recommendedJobs.map(job => (
              <div key={job.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl cursor-pointer transition-all freelancer-dash-job-card"
                onClick={() => navigate(`/jobs/${job.id}`)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-primary font-medium text-sm">{job.title}</h3>
                        {job.isAiRecommended && <span className="badge-cyan text-[10px]">⚡ AI Pick</span>}
                      </div>
                      <p className="text-xs mb-2 freelancer-dash-job-meta">
                        ${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()} · Fixed Price · Remote
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 4).map((s, idx) => <span key={`${job.id}-skill-${idx}`} className="tag-pill">{s}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {job.aiMatchScore && (
                    <div className="text-center">
                      <div className={`match-score ${job.aiMatchScore >= 90 ? 'high' : job.aiMatchScore >= 70 ? 'medium' : 'low'}`}>
                        {job.aiMatchScore}% Match
                      </div>
                    </div>
                  )}
                  <button className="btn-ghost-cyan px-3 py-1.5 text-xs">Apply Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
