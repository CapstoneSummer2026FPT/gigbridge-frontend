import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Users, Briefcase, DollarSign, TrendingUp, Shield, AlertCircle, CheckCircle, XCircle, BarChart2, Activity, Bot, Flag, FileText, Terminal, MessageSquare, HelpCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import { DB } from '../../../mock_backend';
import type { AdminUserDto } from '../../../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const REVENUE_DATA = [
  { id: 'admin-oct', month: 'Oct', revenue: 124000, users: 3200 },
  { id: 'admin-nov', month: 'Nov', revenue: 178000, users: 4100 },
  { id: 'admin-dec', month: 'Dec', revenue: 145000, users: 3800 },
  { id: 'admin-jan', month: 'Jan', revenue: 234000, users: 5200 },
  { id: 'admin-feb', month: 'Feb', revenue: 289000, users: 6100 },
  { id: 'admin-mar', month: 'Mar', revenue: 342000, users: 7400 },
  { id: 'admin-apr', month: 'Apr', revenue: 398000, users: 8200 },
] as const;

const categoryData = [
  { name: 'Web Dev', value: 35, color: '#0077FF' },
  { name: 'Design', value: 25, color: '#9F4BFF' },
  { name: 'Data Science', value: 20, color: '#22C55E' },
  { name: 'Writing', value: 12, color: '#F59E0B' },
  { name: 'Other', value: 8, color: '#8892A4' },
];

const PENDING_MODERATION = [
  { id: 1, type: 'Job Post', title: 'Senior Developer Position', user: 'TechCorp Inc.', flagReason: 'Suspicious budget range', risk: 'Low' },
  { id: 2, type: 'Profile', title: 'Marcus Rivera – Data Scientist', user: 'u_freelancer_3', flagReason: 'Unverified credentials', risk: 'Medium' },
  { id: 3, type: 'Proposal', title: 'Content Writing Proposal', user: 'Jane D.', flagReason: 'Potential spam', risk: 'High' },
];

const HEATMAP_SKILLS = [
  ['React', '#0077FF', 95], ['Python', '#22C55E', 91], ['AI/ML', '#9F4BFF', 88], ['TypeScript', '#0077FF', 85],
  ['Node.js', '#22C55E', 82], ['Figma', '#9F4BFF', 79], ['AWS', '#F59E0B', 76], ['Docker', '#0077FF', 72],
  ['Vue.js', '#22C55E', 68], ['Flutter', '#9F4BFF', 65], ['SQL', '#F59E0B', 62], ['Go', '#0077FF', 58],
];

export default function AdminDashboardScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'moderation' | 'revenue'>('overview');
  const [adminUsers, setAdminUsers] = useState<AdminUserDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const allJobs = DB.getJobs();

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);

      const response = await adminAPI.getAllUsers();

      if (!isMounted) return;

      if (response.success && response.data) {
        setAdminUsers(response.data.items);
      } else {
        setAdminUsers([]);
        setUsersError(response.message || 'Failed to load users.');
      }

      setUsersLoading(false);
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const userStats = useMemo(() => {
    const total = adminUsers.length;
    const active = adminUsers.filter(user => user.isActive).length;

    return {
      total,
      active,
      change: total > 0 ? `${active.toLocaleString()} active` : 'No users loaded',
    };
  }, [adminUsers]);

  const getUserInitials = (fullName: string) => {
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'U';
  };

  const getRoleLabel = (role: number) => {
    if (role === 0) return 'client';
    if (role === 1) return 'freelancer';
    if (role === 2) return 'admin';
    return 'unknown';
  };

  const getRoleBadgeClass = (role: number) => {
    if (role === 2) return 'badge-purple';
    if (role === 0) return 'badge-cyan';
    if (role === 1) return 'badge-green';
    return 'badge-gray';
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-purple" />
              <span className="badge-purple text-xs">Admin Panel</span>
            </div>
            <h1 className="text-3xl font-black text-primary">GigBridge Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            {PENDING_MODERATION.length > 0 && (
              <div className="alert-amber flex items-center gap-2">
                <AlertCircle size={14} />
                <span className="text-sm font-medium">{PENDING_MODERATION.length} items need review</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/users')}
            className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={20} className="text-cyan" />
                  <h3 className="text-lg font-bold text-primary">Manage Users</h3>
                </div>
                <p className="text-sm text-secondary">View and manage all platform users</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={20} className="text-cyan" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/jobs')}
            className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={20} className="text-purple" />
                  <h3 className="text-lg font-bold text-primary">Manage Jobs</h3>
                </div>
                <p className="text-sm text-secondary">View and manage all job postings</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase size={20} className="text-purple" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/contracts')}
            className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={20} className="text-green" />
                  <h3 className="text-lg font-bold text-primary">Manage Contracts</h3>
                </div>
                <p className="text-sm text-secondary">View and manage all contracts</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText size={20} className="text-green" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/faq-management')}
            className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle size={20} className="text-cyan" />
                  <h3 className="text-lg font-bold text-primary">FAQ Management</h3>
                </div>
                <p className="text-sm text-secondary">Manage public FAQ articles and categories</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HelpCircle size={20} className="text-cyan" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/system-tracking')}
            className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={20} className="text-amber" />
                  <h3 className="text-lg font-bold text-primary">System Tracking</h3>
                </div>
                <p className="text-sm text-secondary">Monitor system health & logs</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity size={20} className="text-amber" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/feedback')}
            className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={20} className="text-pink-500" />
                  <h3 className="text-lg font-bold text-primary">User Feedback</h3>
                </div>
                <p className="text-sm text-secondary">Manage reviews & violations</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare size={20} className="text-pink-500" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/revenue')}
            className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={20} className="text-green" />
                  <h3 className="text-lg font-bold text-primary">Revenue</h3>
                </div>
                <p className="text-sm text-secondary">Financial analytics</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign size={20} className="text-green" />
              </div>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: usersLoading ? '...' : userStats.total.toLocaleString(), change: userStats.change, icon: <Users size={16} />, iconClass: 'stat-icon-cyan icon-cyan' },
            { label: 'Active Jobs', value: allJobs.filter(j => j.status === 'open').length.toString(), change: '+42 today', icon: <Briefcase size={16} />, iconClass: 'stat-icon-purple icon-purple' },
            { label: 'Platform Revenue', value: '$398K', change: '+16.4% MoM', icon: <DollarSign size={16} />, iconClass: 'stat-icon-green icon-green' },
            { label: 'Success Rate', value: '96.4%', change: '+0.8% this month', icon: <TrendingUp size={16} />, iconClass: 'stat-icon-amber icon-amber' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-secondary">{stat.label}</p>
                <span className={stat.iconClass}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">{stat.value}</p>
              <p className="text-xs text-green">↑ {stat.change}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['overview', 'users', 'moderation', 'revenue'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)}
              className={`tab-btn ${activeTab === t ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-primary font-semibold">Platform Revenue</h2>
                  <span className="badge-green text-xs">↑ 16.4% MoM</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="adminRevGrad2026" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9F4BFF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#9F4BFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis key="admin-revenue-xaxis" dataKey="month" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis key="admin-revenue-yaxis" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip key="admin-revenue-tooltip" contentStyle={{ background: '#0D1526', border: '1px solid rgba(159,75,255,0.3)', borderRadius: 10, color: 'white' }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                    <Area key="admin-revenue-area" type="monotone" dataKey="revenue" stroke="#9F4BFF" strokeWidth={2} fill="url(#adminRevGrad2026)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6">
                <h2 className="text-primary font-semibold mb-4">Category Distribution</h2>
                <div className="flex justify-center mb-4">
                  <PieChart width={180} height={150}>
                    <Pie key="admin-category-pie" data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                      {categoryData.map((entry, i) => (
                        <Cell key={`cell-${entry.name || i}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-2">
                  {categoryData.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                        <span className="text-xs text-primary">{cat.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-primary">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trending Skills Heatmap */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-primary font-semibold">Trending Skills Heatmap</h2>
                <span className="badge-cyan text-xs">Real-time Data</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {HEATMAP_SKILLS.map(([skill, color, demand]) => (
                  <div key={skill as string} className="heatmap-cell p-3 rounded-xl text-center cursor-pointer"
                    style={{ background: `${color as string}${Math.round((demand as number / 100) * 30).toString(16).padStart(2, '0')}`, border: `1px solid ${color as string}30` }}>
                    <p className="text-xs font-semibold text-primary">{skill as string}</p>
                    <div className="progress-bar-gb mt-1">
                      <div className="progress-bar-gb-fill" style={{ width: `${demand as number}%`, background: color as string }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: color as string }}>{demand as number}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-primary">
              <h2 className="text-primary font-semibold">User Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary">
                    {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-secondary">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-secondary">
                        Loading users...
                      </td>
                    </tr>
                  ) : usersError ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-red">
                        {usersError}
                      </td>
                    </tr>
                  ) : adminUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-secondary">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    adminUsers.map(user => (
                      <tr key={user.userId} className="border-b border-primary transition-all hover:bg-hover">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.fullName} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center text-xs font-bold">
                                {getUserInitials(user.fullName)}
                              </div>
                            )}
                            <div>
                              <p className="text-primary text-sm font-medium">{user.fullName}</p>
                              <p className="text-xs text-secondary">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`${getRoleBadgeClass(user.role)} capitalize text-xs`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-medium' : 'bg-red-medium'}`} />
                            <span className={`text-xs ${user.isActive ? 'text-green' : 'text-red'}`}>
                              {user.isActive ? (user.isEmailVerified ? 'Verified' : 'Unverified') : 'Banned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-secondary">
                          {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/admin/users')} className="action-btn action-btn-view">View</button>
                            <button onClick={() => navigate('/admin/users')} className="action-btn action-btn-ban">
                              {user.isActive ? 'Ban' : 'Unban'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flag size={16} className="text-amber" />
                <h2 className="text-primary font-semibold">Moderation Queue</h2>
                <span className="badge-amber text-xs ml-auto">{PENDING_MODERATION.length} Pending</span>
              </div>
              <div className="space-y-3">
                {PENDING_MODERATION.map(item => (
                  <div key={item.id} className="flex items-start justify-between p-4 rounded-xl gap-4 bg-secondary border-primary">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge-${item.risk === 'High' ? 'amber' : item.risk === 'Medium' ? 'purple' : 'cyan'} text-xs`}>
                          {item.risk} Risk
                        </span>
                        <span className="text-xs font-medium text-primary">{item.type}</span>
                      </div>
                      <p className="text-primary font-medium text-sm">{item.title}</p>
                      <p className="text-xs mt-1 text-secondary">Flagged: {item.flagReason}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="p-2 rounded-lg transition-all bg-green-medium border-green text-green">
                        <CheckCircle size={14} />
                      </button>
                      <button className="p-2 rounded-lg transition-all bg-red-medium border-red text-red">
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispute Center */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-purple" />
                <h2 className="text-primary font-semibold">Dispute Center</h2>
                <span className="badge-green text-xs ml-auto">0 Active</span>
              </div>
              <div className="text-center py-8">
                <CheckCircle size={32} className="mx-auto mb-3 text-green" />
                <p className="text-primary font-medium">No active disputes</p>
                <p className="text-sm mt-1 text-secondary">All transactions are running smoothly</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="glass-card p-6">
            <h2 className="text-primary font-semibold mb-5">Revenue Analytics</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={REVENUE_DATA}>
                <XAxis key="admin-revenue-bar-xaxis" dataKey="month" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis key="admin-revenue-bar-yaxis" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip key="admin-revenue-bar-tooltip" contentStyle={{ background: '#0D1526', border: '1px solid rgba(159,75,255,0.3)', borderRadius: 10, color: 'white' }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar key="admin-revenue-bar" dataKey="revenue" fill="#9F4BFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
