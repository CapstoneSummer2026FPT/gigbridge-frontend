import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, MessageSquare, Bot, DollarSign, CheckCircle, Briefcase, Star, Trash2, AlertTriangle, FileText, CalendarDays } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { useUserNotifications } from '../hooks/useUserNotifications';
import type { ReactNode } from 'react';
import '../styles/notifications-screen.css';

const NOTIF_ICONS: Record<string, ReactNode> = {
  job: <Briefcase size={16} className="text-cyan" />,
  proposal: <Briefcase size={16} className="text-cyan" />,
  contract: <FileText size={16} className="text-cyan" />,
  message: <MessageSquare size={16} className="text-purple" />,
  milestone: <CheckCircle size={16} className="text-green" />,
  payment: <DollarSign size={16} className="text-green" />,
  review: <Star size={16} className="text-amber" />,
  dispute: <AlertTriangle size={16} className="text-red" />,
  ai_suggestion: <Bot size={16} className="text-purple" />,
  system: <Bell size={16} className="text-secondary" />,
  schedule: <CalendarDays size={16} className="text-cyan" />,
};

const CONVERSATIONS = [
  { id: 'conv_1', name: 'Jordan Mitchell', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=jordan&backgroundColor=b6e3f4', lastMsg: 'Excellent work! Milestone approved. Working on payment...', time: '2h ago', unread: 1, project: 'E-commerce Platform' },
  { id: 'conv_2', name: 'Anika Sharma', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=anika&backgroundColor=ffdfbf', lastMsg: 'Hi, I\'d love to discuss the fintech project further!', time: '1d ago', unread: 0, project: 'Fintech App Design' },
  { id: 'conv_3', name: 'GigBridge AI', avatar: '', lastMsg: '🤖 New job match: React Developer at StartupXYZ (92% match)', time: '3h ago', unread: 1, project: 'AI Suggestion', isAI: true },
];

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'messages'>('all');
  const { notifications: allNotifs, unreadCount, isLoading, markAsRead, markAllAsRead } = useUserNotifications(user, {
    pageSize: 20,
    pollMs: 45000,
  });
  const displayNotifs = activeTab === 'unread' ? allNotifs.filter(n => !n.isRead) : allNotifs;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <AppLayout>
      <div className="notifications-screen max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
              Notification <span className="text-blue-600 black:text-blue-400 italic font-light">Inbox</span>
            </h1>
            <p className="text-secondary">
              {unreadCount > 0 ? (
                <><span className="text-cyan font-semibold">{unreadCount} unread</span> notifications</>
              ) : 'All caught up!'}
            </p>
          </div>
          <button
            className="text-sm transition-all text-secondary disabled:opacity-50"
            disabled={unreadCount === 0}
            onClick={() => void markAllAsRead()}
          >
            Mark all as read
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all', label: 'All Notifications', count: allNotifs.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'messages', label: 'Messages', count: CONVERSATIONS.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: activeTab === tab.id ? '1px solid rgba(0,240,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: activeTab === tab.id ? '#0077FF' : '#8892A4',
              }}>
              {tab.label}
              {tab.count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: activeTab === tab.id ? 'rgba(0,240,255,0.2)' : 'rgba(255,255,255,0.08)', color: activeTab === tab.id ? '#0077FF' : '#8892A4' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications List */}
          <div className="lg:col-span-2 space-y-2">
            {(activeTab === 'all' || activeTab === 'unread') && (
              <>
                {displayNotifs.map(notif => (
                  <div key={notif.id}
                    className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all group"
                    style={{
                      background: notif.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(0,240,255,0.04)',
                      border: notif.isRead ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,240,255,0.12)',
                    }}
                    onClick={() => {
                      void markAsRead(notif.id);
                      navigate(notif.actionUrl || '/notifications');
                    }}>
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {NOTIF_ICONS[notif.type] || <Bell size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-primary font-medium text-sm">{notif.title}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-secondary">{timeAgo(notif.createdAt)}</span>
                          {!notif.isRead && <div className="notif-dot" />}
                        </div>
                      </div>
                      <p className="text-sm mt-1 leading-relaxed text-secondary">{notif.body}</p>
                      {notif.schedule && <div className="mt-2 rounded-lg bg-cyan/5 border border-cyan/10 p-2 text-xs"><strong>{notif.schedule.title}</strong><span className="block text-secondary">{new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notif.schedule.scheduledAtUtc))} Vietnam Time (ICT) · {notif.schedule.actorName}</span></div>}
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-1 transition-all text-secondary">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {displayNotifs.length === 0 && (
                  <div className="text-center py-16">
                    <Bell size={40} className="mx-auto mb-3 opacity-20 text-secondary" />
                    <p className="text-primary font-medium">
                      {isLoading ? 'Loading notifications...' : 'No notifications'}
                    </p>
                    <p className="text-sm mt-1 text-secondary">
                      {isLoading ? 'Checking your inbox.' : "You're all caught up!"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="space-y-2">
                {CONVERSATIONS.map(conv => (
                  <div key={conv.id}
                    className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: conv.unread > 0 ? 'rgba(0,240,255,0.04)' : 'rgba(255,255,255,0.02)',
                      border: conv.unread > 0 ? '1px solid rgba(0,240,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                    onClick={() => navigate('/workspace/proj_1')}>
                    <div className="relative flex-shrink-0">
                      {conv.isAI ? (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
                          <Bot size={18} style={{ color: '#0A0F1C' }} />
                        </div>
                      ) : (
                        <img src={conv.avatar} alt={conv.name} className="w-11 h-11 rounded-xl" />
                      )}
                      {conv.unread > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: '#0077FF', color: '#0A0F1C' }}>
                          {conv.unread}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-primary font-semibold text-sm">{conv.name}</p>
                        <span className="text-xs text-secondary">{conv.time}</span>
                      </div>
                      <p className="text-xs mb-1 text-secondary">Re: {conv.project}</p>
                      <p className="text-sm truncate" style={{ color: conv.unread > 0 ? 'white' : '#8892A4' }}>
                        {conv.lastMsg}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            {/* AI Suggestion Highlight */}
            <div className="glass-card p-5"
              style={{ background: 'linear-gradient(135deg, rgba(159,75,255,0.08), rgba(0,240,255,0.04))', border: '1px solid rgba(159,75,255,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center animate-orb"
                  style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
                  <Bot size={14} style={{ color: '#0A0F1C' }} />
                </div>
                <p className="text-primary font-semibold text-sm">AI Suggestions</p>
              </div>
              <div className="space-y-3">
                {[
                  'Your React Developer post has 14 proposals. AI recommends reviewing Alex Johnson\'s first (96% match).',
                  '3 new job openings match your profile at 90%+ this week.',
                  'Your proposal response time is 4.2 hours. Responding within 1 hour increases win rate by 40%.',
                ].map((suggestion, i) => (
                  <div key={i} className="p-3 rounded-xl text-xs leading-relaxed"
                    style={{ background: 'rgba(255,255,255,0.03)', color: '#8892A4' }}>
                    💡 {suggestion}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Summary */}
            <div className="glass-card p-5">
              <h2 className="text-primary font-semibold mb-4 text-sm">Today's Summary</h2>
              <div className="space-y-3">
                {[
                  { label: 'New Proposals', value: '2', color: '#0077FF' },
                  { label: 'Messages', value: '5', color: '#9F4BFF' },
                  { label: 'AI Matches', value: '3', color: '#22C55E' },
                  { label: 'Payments', value: '$1,500', color: '#22C55E' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="text-xs text-secondary">{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
