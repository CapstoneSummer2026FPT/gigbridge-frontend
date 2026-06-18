import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PlusCircle, FileText, TrendingUp, DollarSign, Clock, ChevronRight, Bot, Briefcase, Star, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { StatCard } from '../../../shared/components/GlassCard';
import { useApp } from '../../../app/providers/AppProvider';
import { DB } from '../../../mock_backend';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/client-dashboard-screen.css';

const SPEND_DATA = [
  { id: 'client-oct', month: 'Oct', spend: 8200 },
  { id: 'client-nov', month: 'Nov', spend: 12400 },
  { id: 'client-dec', month: 'Dec', spend: 9800 },
  { id: 'client-jan', month: 'Jan', spend: 15600 },
  { id: 'client-feb', month: 'Feb', spend: 18200 },
  { id: 'client-mar', month: 'Mar', spend: 22800 },
  { id: 'client-apr', month: 'Apr', spend: 14200 },
] as const;

const AI_SUGGESTIONS = [
  { title: 'Senior React Developer', match: '96%', budget: '$5,000–$8,000', skills: ['React', 'TypeScript', 'Next.js'], urgency: 'High demand' },
  { title: 'DevOps Engineer', match: '88%', budget: '$4,000–$7,000', skills: ['Kubernetes', 'AWS', 'Docker'], urgency: 'Trending' },
];

export default function ClientDashboardScreen() {
  const navigate = useNavigate();
  const { user } = useApp();

  const myJobs = DB.getJobsByClient(user?.id || 'u_client_1');
  const notifications = DB.getNotificationsByUser(user?.id || 'u_client_1');
  const unread = notifications.filter(n => !n.isRead);
  const proposals = DB.getProposals().filter(p => p.clientId === (user?.id || 'u_client_1'));
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const projects = DB.getProjectsByClient(user?.id || 'u_client_1');

  const recentActivity = [
    { text: 'Alex Johnson submitted Milestone 2', time: '2h ago', type: 'milestone', icon: <CheckCircle size={14} className="client-dash-activity-icon-milestone" /> },
    { text: 'New proposal from Marcus Rivera', time: '5h ago', type: 'proposal', icon: <FileText size={14} className="client-dash-activity-icon-proposal" /> },
    { text: 'AI found 3 new talent matches', time: '8h ago', type: 'ai', icon: <Bot size={14} className="client-dash-activity-icon-ai" /> },
    { text: 'Payment of $1,500 sent to Alex J.', time: '1d ago', type: 'payment', icon: <DollarSign size={14} className="client-dash-activity-icon-payment" /> },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm mb-1 client-dash-greeting">Good morning,</p>
            <h1 className="text-3xl font-black text-primary">{user?.name || 'Jordan'} 👋</h1>
            <p className="mt-1 client-dash-greeting">You have <span className="client-dash-highlight font-semibold">{pendingProposals.length} new proposals</span> to review</p>
          </div>
          <button className="btn-cyan px-5 py-3 flex items-center gap-2 text-sm self-start md:self-auto"
            onClick={() => navigate('/jobs/post')}>
            <PlusCircle size={18} />
            Post a New Job
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Jobs" value={myJobs.filter(j => j.status === 'open').length} icon={<Briefcase size={16} />} accentColor="cyan"
            change="2 closing soon" changeType="neutral" />
          <StatCard label="Pending Proposals" value={pendingProposals.length} icon={<FileText size={16} />} accentColor="purple"
            change={`+${pendingProposals.length} this week`} changeType="up" />
          <StatCard label="Active Projects" value={projects.length} icon={<Activity size={16} />} accentColor="green"
            change="On track" changeType="up" />
          <StatCard label="Total Spent" value="$284K" icon={<DollarSign size={16} />} accentColor="amber"
            change="+12% this month" changeType="up" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Spending Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-primary font-semibold">Monthly Spend</h2>
                <p className="text-xs mt-1 client-dash-chart-desc">Total hiring investment over time</p>
              </div>
              <span className="badge-green text-xs">↑ 32% vs last month</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={SPEND_DATA}>
                <defs>
                  <linearGradient id="clientSpendGrad2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0077FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0077FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis key="client-xaxis" dataKey="month" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis key="client-yaxis" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip key="client-tooltip" contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 10, color: 'white' }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Spend']} />
                <Area key="client-area" type="monotone" dataKey="spend" stroke="#0077FF" strokeWidth={2} fill="url(#clientSpendGrad2026)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Wallet & Quick Actions */}
          <div className="space-y-4">
            <div className="glass-card neon-border-cyan p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium client-dash-wallet-label">Wallet Balance</p>
                <DollarSign size={18} className="client-dash-wallet-icon" />
              </div>
              <p className="text-3xl font-black text-primary mb-1">$12,450</p>
              <p className="text-xs mb-4 client-dash-wallet-desc">Available to spend</p>
              <button className="btn-cyan w-full py-2 text-sm">Add Funds</button>
            </div>

            <div className="glass-card p-5">
              <p className="text-primary font-semibold mb-3 text-sm">Quick Actions</p>
              <div className="space-y-2">
                {[
                  { label: 'Review Proposals', path: '/proposals', badge: `${pendingProposals.length} new`, icon: <FileText size={14} /> },
                  { label: 'View Projects', path: '/workspace/proj_1', badge: `${projects.length} active`, icon: <Activity size={14} /> },
                  { label: 'Smart Talent Matching', path: '/talent-matching', badge: 'PRO', icon: <Star size={14} /> },
                  { label: 'Financial Overview', path: '/financial-overview', badge: 'VND', icon: <DollarSign size={14} /> },
                  { label: 'AI Assistant', path: '/ai-assistant', badge: 'New', icon: <Bot size={14} /> },
                ].map(action => (
                  <button key={action.label} onClick={() => {
                    if (action.path === '/ai-assistant') {
                      window.dispatchEvent(new CustomEvent('toggle-ai-assistant', { detail: { open: true } }));
                    } else {
                      navigate(action.path);
                    }
                  }}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-all client-dash-action-btn">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <span className="client-dash-action-icon">{action.icon}</span>
                      {action.label}
                    </div>
                    <span className="badge-cyan text-xs">{action.badge}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Active Jobs */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-primary font-semibold">Active Job Postings</h2>
              <button className="text-sm client-dash-link-cyan" onClick={() => navigate('/jobs/my-jobs')}>View All</button>
            </div>
            <div className="space-y-3">
              {myJobs.slice(0, 3).map(job => (
                <div key={job.id} className="p-4 rounded-xl flex items-start justify-between gap-4 cursor-pointer transition-all client-dash-job-card"
                  onClick={() => navigate(`/jobs/${job.id}`)}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-primary font-medium text-sm truncate">{job.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs client-dash-job-meta">{job.proposalCount} proposals</span>
                      <span className="text-xs client-dash-job-meta">·</span>
                      <span className="text-xs client-dash-job-meta">{job.viewCount} views</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {job.skills.slice(0, 3).map((s, idx) => (
                        <span key={`${job.id}-skill-${idx}`} className="badge-cyan text-[10px]">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-primary text-sm font-semibold">${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}</p>
                    <span className="badge-green text-[10px] mt-1 block">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h2 className="text-primary font-semibold mb-5">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 client-dash-activity-icon-bg">
                    {a.icon}
                  </div>
                  <div>
                    <p className="text-primary text-xs font-medium leading-snug">{a.text}</p>
                    <p className="text-xs mt-0.5 client-dash-activity-time">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="glass-card p-6 client-dash-ai-bg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Bot size={18} className="client-dash-ai-icon" />
              <h2 className="text-primary font-semibold">AI Job Suggestions</h2>
            </div>
            <span className="badge-purple text-xs">AI-Powered</span>
          </div>
          <p className="text-sm mb-4 client-dash-ai-desc">Based on your hiring patterns, our AI recommends these next hires:</p>
          <div className="grid md:grid-cols-2 gap-4">
            {AI_SUGGESTIONS.map((s, i) => (
              <div key={i} className="p-4 rounded-xl cursor-pointer transition-all client-dash-ai-card"
                onClick={() => navigate('/jobs/post')}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-primary font-medium text-sm">{s.title}</h3>
                  <span className="match-score high text-[10px]">⚡ {s.match}</span>
                </div>
                <p className="text-xs mb-2 client-dash-ai-budget">Budget: {s.budget}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {s.skills.map(sk => (
                      <span key={sk} className="badge-purple text-[10px]">{sk}</span>
                    ))}
                  </div>
                  <span className="text-xs font-medium client-dash-ai-urgency">📈 {s.urgency}</span>
                </div>
                <button className="w-full mt-3 py-2 rounded-lg text-xs font-medium transition-all client-dash-ai-post-btn">
                  Post This Job
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
