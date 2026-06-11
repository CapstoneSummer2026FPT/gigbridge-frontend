import { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, BarChart2, ArrowUpRight, Bot, Globe, Zap } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { MARKET_INSIGHTS } from '../../../mock_backend';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const RADAR_DATA = [
  { category: 'React', demand: 88, rate: 95 }, { category: 'Python', demand: 91, rate: 100 },
  { category: 'AI/ML', demand: 95, rate: 125 }, { category: 'Design', demand: 76, rate: 82 },
  { category: 'DevOps', demand: 78, rate: 110 }, { category: 'Flutter', demand: 80, rate: 85 },
];

export default function MarketInsightsScreen() {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const { averageRatesBySkill, monthlyEarnings, trendingCategories, platformStats } = MARKET_INSIGHTS;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot size={16} className="text-cyan" />
              <span className="badge-cyan text-xs">AI-Powered Data</span>
            </div>
            <h1 className="text-3xl font-black text-primary">Market Insights</h1>
            <p className="mt-1 text-secondary">Real-time freelance market intelligence — updated daily</p>
          </div>
          <div className="live-indicator flex items-center gap-2">
            <div className="notif-dot" />
            <span className="text-sm text-cyan">Live Data · Last updated 2m ago</span>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Freelancers', value: platformStats.totalFreelancers.toLocaleString(), icon: <Globe size={16} />, iconClass: 'stat-icon-cyan icon-cyan', change: '+2,847 this month' },
            { label: 'Completed Projects', value: platformStats.totalProjects.toLocaleString(), icon: <BarChart2 size={16} />, iconClass: 'stat-icon-purple icon-purple', change: '+1,284 this week' },
            { label: 'Total Paid Out', value: `$${(platformStats.totalPaid / 1000000).toFixed(1)}M`, icon: <DollarSign size={16} />, iconClass: 'stat-icon-green icon-green', change: '+$1.2M this month' },
            { label: 'Platform Success Rate', value: `${platformStats.successRate}%`, icon: <TrendingUp size={16} />, iconClass: 'stat-icon-amber icon-amber', change: '+0.8% vs last month' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className={stat.iconClass}>{stat.icon}</span>
                <ArrowUpRight size={14} className="text-green" />
              </div>
              <p className="text-2xl font-black text-primary mb-1">{stat.value}</p>
              <p className="text-xs mb-0.5 text-secondary">{stat.label}</p>
              <p className="text-xs font-medium text-green">↑ {stat.change}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Average Project Budgets by Skill */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-primary font-semibold">Average Project Budgets</h2>
              <span className="badge-cyan text-xs">$/project</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={averageRatesBySkill} layout="vertical">
                <defs>
                  <linearGradient id="marketBarGrad2026" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#9F4BFF" />
                    <stop offset="100%" stopColor="#0077FF" />
                  </linearGradient>
                </defs>
                <XAxis key="market-rates-xaxis" type="number" tick={{ fill: '#8892A4', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis key="market-rates-yaxis" type="category" dataKey="skill" tick={{ fill: '#8892A4', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip key="market-rates-tooltip" contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 10, color: 'white' }} formatter={(v: number) => [`$${v}k/project`, 'Budget']} />
                <Bar key="market-rates-bar" dataKey="rate" radius={[0, 4, 4, 0]} fill="url(#marketBarGrad2026)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Earnings Trend */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-primary font-semibold">Earnings Trend</h2>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="legend-dot legend-dot-cyan" />
                  <span className="text-xs text-secondary">Freelancers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="legend-dot legend-dot-purple" />
                  <span className="text-xs text-secondary">Clients</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyEarnings}>
                <defs>
                  <linearGradient id="marketFlGrad2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0077FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0077FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="marketClGrad2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9F4BFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#9F4BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis key="market-earnings-xaxis" dataKey="month" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis key="market-earnings-yaxis" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip key="market-earnings-tooltip" contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 10, color: 'white' }} />
                <Area key="market-earnings-freelancer" type="monotone" dataKey="freelancer" stroke="#0077FF" strokeWidth={2} fill="url(#marketFlGrad2026)" isAnimationActive={false} />
                <Area key="market-earnings-client" type="monotone" dataKey="client" stroke="#9F4BFF" strokeWidth={2} fill="url(#marketClGrad2026)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trending Categories */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber" />
              <h2 className="text-primary font-semibold">Trending Categories</h2>
            </div>
            <span className="badge-amber text-xs">↑ Growing Fast</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingCategories.map((cat, i) => (
              <div key={i} className="p-4 rounded-xl cursor-pointer group transition-all bg-secondary border-primary hover:border-cyan">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-medium text-green border-green">
                    {cat.growth}
                  </span>
                </div>
                <h3 className="text-primary font-semibold mb-1">{cat.name}</h3>
                <p className="text-xs text-secondary">{cat.jobs.toLocaleString()} open positions</p>
                <div className="progress-bar-gb mt-3">
                  <div className="progress-bar-gb-fill" style={{ width: `${Math.min((cat.jobs / 10000) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demand vs Budget Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h2 className="text-primary font-semibold mb-4">Skills: Demand vs Budget Radar</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid key="radar-grid" stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis key="radar-angle" dataKey="category" tick={{ fill: '#8892A4', fontSize: 11 }} />
                <PolarRadiusAxis key="radar-radius" tick={false} axisLine={false} />
                <Radar key="radar-demand" name="Demand" dataKey="demand" stroke="#0077FF" fill="#0077FF" fillOpacity={0.15} />
                <Radar key="radar-rate" name="Budget Index" dataKey="rate" stroke="#9F4BFF" fill="#9F4BFF" fillOpacity={0.15} />
                <Tooltip key="radar-tooltip" contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 10, color: 'white' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Report Card */}
          <div className="glass-card p-6 bg-purple-subtle border-purple">
            <div className="flex items-center gap-2 mb-5">
              <Bot size={18} className="text-purple" />
              <h2 className="text-primary font-semibold">AI Market Intelligence Report</h2>
              <span className="badge-purple text-xs ml-auto">Q2 2026</span>
            </div>
            <div className="space-y-4">
              {[
                { title: '🚀 Hottest Skill: AI/ML Integration', body: 'Demand surged 142% YoY. Average project budget index reached $12.5K. Expected to grow another 60% by Q4 2026.', borderClass: 'border-purple' },
                { title: '📈 Fastest Growing: React + AI Skills', body: 'Developers combining React with AI integration command 35% higher project budgets than React-only developers.', borderClass: 'border-cyan' },
                { title: '💡 Career Advice', body: 'Top earners in 2026 combine core programming skills with domain expertise in AI, fintech, or healthcare.', borderClass: 'border-green' },
                { title: '⚠️ Market Watch', body: 'Pure frontend roles declining 8% as AI tools automate routine UI tasks. Focus on architecture and AI integration.', borderClass: 'border-amber' },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-xl bg-secondary ${item.borderClass}`}>
                  <p className="text-primary text-sm font-semibold mb-1">{item.title}</p>
                  <p className="text-xs leading-relaxed text-secondary">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
