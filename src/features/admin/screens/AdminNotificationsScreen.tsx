import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Bell, Send, Users, User, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, Plus, Eye, Trash2, Edit, Ban } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { AdminNotification, NotificationType, NotificationPriority, NotificationStatus, NotificationTarget } from '../../../types/models/Notification';
import { adminAPI } from '../../../api/adminAPI';
import '../styles/admin-users-screen.css';

type TabType = 'all' | 'scheduled' | 'sent' | 'failed';
type StatusFilter = 'all' | 'scheduled' | 'sent' | 'failed' | 'cancelled';
type AdminBroadcastTarget = 0 | 1 | 2 | 3 | 4;
type AdminNotificationType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const ADMIN_NOTIFICATION_TYPES: { value: AdminNotificationType; label: string }[] = [
  { value: 10, label: 'System Alert' },
  { value: 0, label: 'New Job' },
  { value: 1, label: 'Proposal Received' },
  { value: 2, label: 'Proposal Status Changed' },
  { value: 3, label: 'Contract Started' },
  { value: 4, label: 'Milestone Updated' },
  { value: 6, label: 'Payment Confirmed' },
  { value: 7, label: 'Chat Message' },
  { value: 8, label: 'Dispute Update' },
  { value: 9, label: 'Review Received' },
  { value: 11, label: 'AI Interview Invite' },
  { value: 12, label: 'Subscription Expiring' },
];

const ADMIN_BROADCAST_TARGETS: { value: AdminBroadcastTarget; label: string }[] = [
  { value: 0, label: 'All Users' },
  { value: 1, label: 'Clients' },
  { value: 2, label: 'Freelancers' },
  { value: 3, label: 'Admins' },
];

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Mock data
const MOCK_NOTIFICATIONS: AdminNotification[] = [
  {
    notif_NotificationId: 'notif_1',
    Type: NotificationType.System,
    Target: NotificationTarget.AllUsers,
    Title: 'System Maintenance Scheduled',
    Message: 'GigBridge will undergo scheduled maintenance on May 20th from 2:00 AM to 4:00 AM UTC. Services may be temporarily unavailable.',
    Priority: NotificationPriority.High,
    Status: NotificationStatus.Scheduled,
    ScheduledFor: '2026-05-20T02:00:00Z',
    CreatedBy: 'admin_1',
    CreatedAt: '2026-05-17T10:00:00Z',
    UpdatedAt: '2026-05-17T10:00:00Z',
  },
  {
    notif_NotificationId: 'notif_2',
    Type: NotificationType.Custom,
    Target: NotificationTarget.AllFreelancers,
    Title: 'New Pro Features Available',
    Message: 'Check out our new AI-powered proposal generator and interview prep tools available for Pro members.',
    Priority: NotificationPriority.Medium,
    Status: NotificationStatus.Sent,
    SentAt: '2026-05-16T14:30:00Z',
    ReadBy: ['user_1', 'user_2', 'user_5'],
    ActionUrl: '/ai-assistant',
    CreatedBy: 'admin_1',
    CreatedAt: '2026-05-16T14:00:00Z',
    UpdatedAt: '2026-05-16T14:30:00Z',
  },
  {
    notif_NotificationId: 'notif_3',
    Type: NotificationType.AccountUpdate,
    Target: NotificationTarget.Individual,
    TargetUserId: 'user_client_1',
    Title: 'Account Verification Required',
    Message: 'Please verify your email address to continue using premium features.',
    Priority: NotificationPriority.Urgent,
    Status: NotificationStatus.Sent,
    SentAt: '2026-05-15T09:15:00Z',
    ReadBy: [],
    ActionUrl: '/settings',
    CreatedBy: 'admin_2',
    CreatedAt: '2026-05-15T09:10:00Z',
    UpdatedAt: '2026-05-15T09:15:00Z',
  },
  {
    notif_NotificationId: 'notif_4',
    Type: NotificationType.PaymentUpdate,
    Target: NotificationTarget.AllClients,
    Title: 'New Payment Methods Available',
    Message: 'We now support PayPal and Stripe for faster, more secure payments.',
    Priority: NotificationPriority.Low,
    Status: NotificationStatus.Sent,
    SentAt: '2026-05-14T11:00:00Z',
    ReadBy: ['user_1', 'user_3', 'user_4', 'user_6', 'user_7'],
    CreatedBy: 'admin_1',
    CreatedAt: '2026-05-14T10:45:00Z',
    UpdatedAt: '2026-05-14T11:00:00Z',
  },
  {
    notif_NotificationId: 'notif_5',
    Type: NotificationType.System,
    Target: NotificationTarget.AllUsers,
    Title: 'Platform Update v2.5',
    Message: 'New features: Enhanced search, improved messaging, and better project tracking.',
    Priority: NotificationPriority.Medium,
    Status: NotificationStatus.Failed,
    CreatedBy: 'admin_1',
    CreatedAt: '2026-05-13T08:00:00Z',
    UpdatedAt: '2026-05-13T08:05:00Z',
  },
];

export default function AdminNotificationsScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewNotification, setViewNotification] = useState<AdminNotification | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    target: 0 as Exclude<AdminBroadcastTarget, 4>,
    type: 10 as AdminNotificationType,
    title: '',
    content: '',
    referenceId: '',
    referenceType: '',
    sendEmail: false,
  });
  const [testForm, setTestForm] = useState({
    targetMode: 'all' as 'all' | 'specific',
    targetEmails: '',
    type: 10 as AdminNotificationType,
    title: 'Test notification',
    content: 'This is a test notification from GigBridge admin.',
  });
  const [broadcastStatus, setBroadcastStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isBroadcastSending, setIsBroadcastSending] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [createForm, setCreateForm] = useState({
    type: NotificationType.Custom,
    target: NotificationTarget.AllUsers,
    targetUserId: '',
    title: '',
    message: '',
    priority: NotificationPriority.Medium,
    actionUrl: '',
    scheduleDate: '',
    scheduleTime: '',
  });
  const [notifications, setNotifications] = useState<AdminNotification[]>(MOCK_NOTIFICATIONS);

  const stats = useMemo(() => {
    const total = notifications.length;
    const scheduled = notifications.filter(n => n.Status === NotificationStatus.Scheduled).length;
    const sent = notifications.filter(n => n.Status === NotificationStatus.Sent).length;
    const failed = notifications.filter(n => n.Status === NotificationStatus.Failed).length;
    const totalReads = notifications.reduce((sum, n) => sum + (n.ReadBy?.length || 0), 0);
    const avgReadRate = sent > 0 ? Math.round((totalReads / (sent * 10)) * 100) : 0; // Assuming ~10 users per notification

    return { total, scheduled, sent, failed, totalReads, avgReadRate };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      const matchesSearch = searchQuery === '' ||
        notif.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.Message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || notif.Status === statusFilter;

      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'scheduled' && notif.Status === NotificationStatus.Scheduled) ||
        (activeTab === 'sent' && notif.Status === NotificationStatus.Sent) ||
        (activeTab === 'failed' && notif.Status === NotificationStatus.Failed);

      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [notifications, searchQuery, statusFilter, activeTab]);

  const getStatusBadge = (status: NotificationStatus) => {
    if (status === NotificationStatus.Sent) return <span className="badge-green text-xs">Sent</span>;
    if (status === NotificationStatus.Scheduled) return <span className="badge-cyan text-xs">Scheduled</span>;
    if (status === NotificationStatus.Failed) return <span className="badge-red text-xs">Failed</span>;
    return <span className="badge-gray text-xs">Cancelled</span>;
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    if (priority === NotificationPriority.Urgent) return <span className="badge-red text-xs">Urgent</span>;
    if (priority === NotificationPriority.High) return <span className="badge-amber text-xs">High</span>;
    if (priority === NotificationPriority.Medium) return <span className="badge-cyan text-xs">Medium</span>;
    return <span className="badge-gray text-xs">Low</span>;
  };

  const getTargetBadge = (target: NotificationTarget) => {
    if (target === NotificationTarget.AllUsers) return <span className="badge-purple text-xs">All Users</span>;
    if (target === NotificationTarget.AllClients) return <span className="badge-green text-xs">All Clients</span>;
    if (target === NotificationTarget.AllFreelancers) return <span className="badge-cyan text-xs">All Freelancers</span>;
    if (target === NotificationTarget.Individual) return <span className="badge-amber text-xs">Individual</span>;
    return <span className="badge-gray text-xs">Custom</span>;
  };

  const getTypeIcon = (type: NotificationType) => {
    if (type === NotificationType.System) return <Bell size={16} className="text-purple" />;
    if (type === NotificationType.PaymentUpdate) return <CheckCircle size={16} className="text-green" />;
    if (type === NotificationType.AccountUpdate) return <User size={16} className="text-cyan" />;
    return <AlertCircle size={16} className="text-amber" />;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateNotification = () => {
    console.log('Creating notification:', createForm);
    // Here you would make API call to backend
    setShowCreateModal(false);
    setCreateForm({
      type: NotificationType.Custom,
      target: NotificationTarget.AllUsers,
      targetUserId: '',
      title: '',
      message: '',
      priority: NotificationPriority.Medium,
      actionUrl: '',
      scheduleDate: '',
      scheduleTime: '',
    });
  };

  const sendAdminNotification = async (payload: {
    target: AdminBroadcastTarget;
    targetUserId?: string | null;
    type: AdminNotificationType;
    title: string;
    content: string;
    referenceId?: string | null;
    referenceType?: string | null;
    sendEmail?: boolean;
  }) => {
    return adminAPI.broadcastNotification({
      target: payload.target,
      targetUserId: payload.targetUserId || null,
      type: payload.type,
      title: payload.title.trim(),
      content: payload.content.trim(),
      referenceId: payload.referenceId || null,
      referenceType: payload.referenceType?.trim() || null,
      sendEmail: Boolean(payload.sendEmail),
    });
  };

  const handleSendBroadcast = async () => {
    if (!broadcastForm.title.trim()) {
      setBroadcastStatus({ type: 'error', message: 'Title is required.' });
      return;
    }

    setIsBroadcastSending(true);
    setBroadcastStatus(null);

    const response = await sendAdminNotification({
      target: broadcastForm.target,
      type: broadcastForm.type,
      title: broadcastForm.title,
      content: broadcastForm.content,
      referenceId: broadcastForm.referenceId.trim() || null,
      referenceType: broadcastForm.referenceType,
      sendEmail: broadcastForm.sendEmail,
    });

    if (response.success) {
      setBroadcastStatus({ type: 'success', message: response.message || 'Broadcast sent successfully.' });
      setBroadcastForm(prev => ({ ...prev, title: '', content: '', referenceId: '', referenceType: '', sendEmail: false }));
    } else {
      setBroadcastStatus({ type: 'error', message: response.message || 'Failed to send broadcast.' });
    }

    setIsBroadcastSending(false);
  };

  const parseTargetEmails = (value: string) =>
    value
      .split(/[\s,;]+/)
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);

  const resolveTargetEmails = async (emails: string[]) => {
    const uniqueEmails = Array.from(new Set(emails));
    const results = await Promise.all(
      uniqueEmails.map(async email => {
        const response = await adminAPI.getAllUsers(email);
        const user = response.data?.items?.find(item => item.email.toLowerCase() === email);

        return {
          email,
          userId: user?.userId,
        };
      })
    );

    return {
      resolvedUsers: results.filter(result => result.userId) as { email: string; userId: string }[],
      missingEmails: results.filter(result => !result.userId).map(result => result.email),
    };
  };

  const handleSendTestNotification = async () => {
    if (!testForm.title.trim()) {
      setTestStatus({ type: 'error', message: 'Title is required.' });
      return;
    }

    const targetEmails = parseTargetEmails(testForm.targetEmails);

    if (testForm.targetMode === 'specific' && targetEmails.length === 0) {
      setTestStatus({ type: 'error', message: 'Add at least one target user email.' });
      return;
    }

    setIsTestSending(true);
    setTestStatus(null);

    if (testForm.targetMode === 'all') {
      const response = await sendAdminNotification({
        target: 0,
        type: testForm.type,
        title: testForm.title,
        content: testForm.content,
      });

      setTestStatus({
        type: response.success ? 'success' : 'error',
        message: response.message || (response.success ? 'Test notification sent to all users.' : 'Failed to send test notification.'),
      });
      setIsTestSending(false);
      return;
    }

    const { resolvedUsers, missingEmails } = await resolveTargetEmails(targetEmails);

    if (resolvedUsers.length === 0) {
      setTestStatus({
        type: 'error',
        message: missingEmails.length > 0
          ? `No users found for: ${missingEmails.join(', ')}`
          : 'No users found for those emails.',
      });
      setIsTestSending(false);
      return;
    }

    const responses = await Promise.all(
      resolvedUsers.map(user =>
        sendAdminNotification({
          target: 4,
          targetUserId: user.userId,
          type: testForm.type,
          title: testForm.title,
          content: testForm.content,
        })
      )
    );

    const failedCount = responses.filter(response => !response.success).length;
    const missingText = missingEmails.length > 0 ? ` Missing: ${missingEmails.join(', ')}.` : '';
    setTestStatus({
      type: failedCount === 0 && missingEmails.length === 0 ? 'success' : 'error',
      message: failedCount === 0
        ? `Test notification sent to ${resolvedUsers.length} user${resolvedUsers.length === 1 ? '' : 's'}.${missingText}`
        : `${failedCount} of ${resolvedUsers.length} test notifications failed.${missingText}`,
    });
    setIsTestSending(false);
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Delete this notification?')) {
      return;
    }

    if (!GUID_PATTERN.test(id)) {
      setNotifications(prev => prev.filter(notification => notification.notif_NotificationId !== id));
      setViewNotification(prev => prev?.notif_NotificationId === id ? null : prev);
      return;
    }

    const response = await adminAPI.deleteNotification(id);

    if (response.success) {
      setNotifications(prev => prev.filter(notification => notification.notif_NotificationId !== id));
      setViewNotification(prev => prev?.notif_NotificationId === id ? null : prev);
      return;
    }

    alert(response.message || 'Failed to delete notification.');
  };

  const handleCancelScheduled = (id: string) => {
    console.log('Cancelling scheduled notification:', id);
    // Here you would make API call to backend
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bell size={20} className="text-purple" />
                <span className="badge-purple text-xs">Notification Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Notifications</h1>
              <p className="text-sm text-secondary mt-1">Send and manage system notifications</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-cyan px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Create Notification
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: 'Total', value: stats.total.toString(), icon: <Bell size={16} />, color: 'purple' },
              { label: 'Scheduled', value: stats.scheduled.toString(), icon: <Calendar size={16} />, color: 'cyan' },
              { label: 'Sent', value: stats.sent.toString(), icon: <CheckCircle size={16} />, color: 'green' },
              { label: 'Failed', value: stats.failed.toString(), icon: <XCircle size={16} />, color: 'red' },
              { label: 'Total Reads', value: stats.totalReads.toString(), icon: <Eye size={16} />, color: 'amber' },
              { label: 'Read Rate', value: `${stats.avgReadRate}%`, icon: <Users size={16} />, color: 'green' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Broadcast and Test Send */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6 sm:mb-8">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Send size={16} className="text-purple" />
                    <p className="text-sm font-bold text-primary">Broadcast</p>
                  </div>
                  <p className="text-xs text-secondary">Send one notification to a platform audience.</p>
                </div>
                <span className="badge-purple text-xs">Live</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Audience</label>
                  <select
                    value={broadcastForm.target}
                    onChange={e => setBroadcastForm({ ...broadcastForm, target: Number(e.target.value) as Exclude<AdminBroadcastTarget, 4> })}
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer"
                  >
                    {ADMIN_BROADCAST_TARGETS.map(target => (
                      <option key={target.value} value={target.value}>{target.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Type</label>
                  <select
                    value={broadcastForm.type}
                    onChange={e => setBroadcastForm({ ...broadcastForm, type: Number(e.target.value) as AdminNotificationType })}
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer"
                  >
                    {ADMIN_NOTIFICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="Broadcast title"
                  className="input-gb w-full px-3 py-2 text-sm"
                />
                <textarea
                  value={broadcastForm.content}
                  onChange={e => setBroadcastForm({ ...broadcastForm, content: e.target.value })}
                  placeholder="Broadcast message"
                  rows={3}
                  className="input-gb w-full px-3 py-2 text-sm resize-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={broadcastForm.referenceId}
                    onChange={e => setBroadcastForm({ ...broadcastForm, referenceId: e.target.value })}
                    placeholder="Reference ID (optional)"
                    className="input-gb w-full px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={broadcastForm.referenceType}
                    onChange={e => setBroadcastForm({ ...broadcastForm, referenceType: e.target.value })}
                    placeholder="Reference type (optional)"
                    className="input-gb w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={broadcastForm.sendEmail}
                    onChange={e => setBroadcastForm({ ...broadcastForm, sendEmail: e.target.checked })}
                    className="accent-cyan"
                  />
                  Also send email
                </label>
                <button
                  onClick={handleSendBroadcast}
                  disabled={isBroadcastSending || !broadcastForm.title.trim()}
                  className="btn-purple px-4 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  {isBroadcastSending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>

              {broadcastStatus && (
                <p className={`text-xs mt-3 ${broadcastStatus.type === 'success' ? 'text-green' : 'text-red'}`}>
                  {broadcastStatus.message}
                </p>
              )}
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bell size={16} className="text-cyan" />
                    <p className="text-sm font-bold text-primary">Test Notification</p>
                  </div>
                  <p className="text-xs text-secondary">Send a quick test to all users or selected user emails.</p>
                </div>
                <span className="badge-cyan text-xs">Test</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Target</label>
                  <select
                    value={testForm.targetMode}
                    onChange={e => setTestForm({ ...testForm, targetMode: e.target.value as 'all' | 'specific' })}
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer"
                  >
                    <option value="all">All Users</option>
                    <option value="specific">Specific Users</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Type</label>
                  <select
                    value={testForm.type}
                    onChange={e => setTestForm({ ...testForm, type: Number(e.target.value) as AdminNotificationType })}
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer"
                  >
                    {ADMIN_NOTIFICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {testForm.targetMode === 'specific' && (
                <textarea
                  value={testForm.targetEmails}
                  onChange={e => setTestForm({ ...testForm, targetEmails: e.target.value })}
                  placeholder="Paste user emails separated by commas, spaces, or new lines"
                  rows={2}
                  className="input-gb w-full px-3 py-2 text-sm resize-none mb-3"
                />
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  value={testForm.title}
                  onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="Test title"
                  className="input-gb w-full px-3 py-2 text-sm"
                />
                <textarea
                  value={testForm.content}
                  onChange={e => setTestForm({ ...testForm, content: e.target.value })}
                  placeholder="Test message"
                  rows={3}
                  className="input-gb w-full px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleSendTestNotification}
                  disabled={isTestSending || !testForm.title.trim()}
                  className="btn-cyan px-4 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  {isTestSending ? 'Sending...' : 'Send Test'}
                </button>
              </div>

              {testStatus && (
                <p className={`text-xs mt-3 ${testStatus.type === 'success' ? 'text-green' : 'text-red'}`}>
                  {testStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All', icon: <Bell size={14} />, count: MOCK_NOTIFICATIONS.length },
              { id: 'scheduled', label: 'Scheduled', icon: <Calendar size={14} />, count: stats.scheduled },
              { id: 'sent', label: 'Sent', icon: <CheckCircle size={14} />, count: stats.sent },
              { id: 'failed', label: 'Failed', icon: <XCircle size={14} />, count: stats.failed },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple/20 text-purple border border-purple'
                    : 'glass-button text-secondary hover:text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className="text-xs opacity-60">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.map(notif => (
              <div key={notif.notif_NotificationId} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getTypeIcon(notif.Type)}
                      <p className="text-sm font-bold text-primary">{notif.Title}</p>
                      {getStatusBadge(notif.Status)}
                      {getPriorityBadge(notif.Priority)}
                      {getTargetBadge(notif.Target)}
                    </div>
                    <p className="text-sm text-secondary mb-2 line-clamp-2">{notif.Message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>ID: {notif.notif_NotificationId}</span>
                      {notif.ReadBy && notif.ReadBy.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {notif.ReadBy.length} reads
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 mb-3 border-t border-white/5">
                  <div>
                    <p className="text-muted mb-1">Created</p>
                    <p className="text-primary">{formatDate(notif.CreatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">
                      {notif.Status === NotificationStatus.Scheduled ? 'Scheduled For' :
                       notif.Status === NotificationStatus.Sent ? 'Sent At' : 'Updated'}
                    </p>
                    <p className="text-primary">
                      {formatDate(notif.ScheduledFor || notif.SentAt || notif.UpdatedAt)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-white/5">
                  <button
                    onClick={() => setViewNotification(notif)}
                    className="btn-ghost-cyan px-3 py-1.5 text-xs flex items-center gap-1.5 flex-1"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  {notif.Status === NotificationStatus.Scheduled && (
                    <button
                      onClick={() => handleCancelScheduled(notif.notif_NotificationId)}
                      className="btn-ghost-red px-3 py-1.5 text-xs flex items-center gap-1.5 flex-1"
                    >
                      <Ban size={14} />
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => void handleDeleteNotification(notif.notif_NotificationId)}
                    className="btn-ghost-red px-3 py-1.5 text-xs flex items-center gap-1.5 flex-1"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="glass-card p-12 text-center">
                <Bell size={48} className="mx-auto mb-4 text-muted" />
                <p className="text-lg font-semibold text-primary mb-2">No notifications found</p>
                <p className="text-sm text-secondary">Try adjusting your filters or create a new notification</p>
              </div>
            )}
          </div>

          {/* View Notification Modal */}
          {viewNotification && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewNotification(null)}>
              <div className="glass-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">Notification Details</h2>
                  <button
                    onClick={() => setViewNotification(null)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {getTypeIcon(viewNotification.Type)}
                      {getStatusBadge(viewNotification.Status)}
                      {getPriorityBadge(viewNotification.Priority)}
                      {getTargetBadge(viewNotification.Target)}
                    </div>

                    <h3 className="text-xl font-bold text-primary mb-3">{viewNotification.Title}</h3>
                    <p className="text-sm text-secondary mb-4">{viewNotification.Message}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-white/5">
                      <div>
                        <p className="text-muted mb-1">Notification ID</p>
                        <p className="text-primary font-mono text-xs">{viewNotification.notif_NotificationId}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Type</p>
                        <p className="text-primary capitalize">{viewNotification.Type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Target</p>
                        <p className="text-primary capitalize">{viewNotification.Target.replace('_', ' ')}</p>
                      </div>
                      {viewNotification.TargetUserId && (
                        <div>
                          <p className="text-muted mb-1">Target User ID</p>
                          <p className="text-primary font-mono text-xs">{viewNotification.TargetUserId}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted mb-1">Priority</p>
                        <p className="text-primary capitalize">{viewNotification.Priority}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Status</p>
                        <p className="text-primary capitalize">{viewNotification.Status.replace('_', ' ')}</p>
                      </div>
                      {viewNotification.ActionUrl && (
                        <div className="col-span-2">
                          <p className="text-muted mb-1">Action URL</p>
                          <p className="text-cyan text-xs break-all">{viewNotification.ActionUrl}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted mb-1">Created By</p>
                        <p className="text-primary font-mono text-xs">{viewNotification.CreatedBy}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Created At</p>
                        <p className="text-primary">{formatDate(viewNotification.CreatedAt)}</p>
                      </div>
                      {viewNotification.ScheduledFor && (
                        <div>
                          <p className="text-muted mb-1">Scheduled For</p>
                          <p className="text-primary">{formatDate(viewNotification.ScheduledFor)}</p>
                        </div>
                      )}
                      {viewNotification.SentAt && (
                        <div>
                          <p className="text-muted mb-1">Sent At</p>
                          <p className="text-primary">{formatDate(viewNotification.SentAt)}</p>
                        </div>
                      )}
                      {viewNotification.ReadBy && viewNotification.ReadBy.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-muted mb-1">Read By ({viewNotification.ReadBy.length} users)</p>
                          <p className="text-primary text-xs font-mono">{viewNotification.ReadBy.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setViewNotification(null)}
                    className="btn-ghost-cyan px-6 py-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Notification Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
              <div className="glass-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple/20 flex items-center justify-center">
                      <Plus size={24} className="text-purple" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-primary">Create Notification</h2>
                      <p className="text-xs text-muted">Send notification to users</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">Type</label>
                      <select
                        value={createForm.type}
                        onChange={e => setCreateForm({ ...createForm, type: e.target.value as NotificationType })}
                        className="input-gb w-full px-4 py-3 text-sm cursor-pointer"
                      >
                        <option value={NotificationType.System}>System</option>
                        <option value={NotificationType.Custom}>Custom</option>
                        <option value={NotificationType.AccountUpdate}>Account Update</option>
                        <option value={NotificationType.PaymentUpdate}>Payment Update</option>
                        <option value={NotificationType.JobUpdate}>Job Update</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">Priority</label>
                      <select
                        value={createForm.priority}
                        onChange={e => setCreateForm({ ...createForm, priority: e.target.value as NotificationPriority })}
                        className="input-gb w-full px-4 py-3 text-sm cursor-pointer"
                      >
                        <option value={NotificationPriority.Low}>Low</option>
                        <option value={NotificationPriority.Medium}>Medium</option>
                        <option value={NotificationPriority.High}>High</option>
                        <option value={NotificationPriority.Urgent}>Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">Target Audience</label>
                    <select
                      value={createForm.target}
                      onChange={e => setCreateForm({ ...createForm, target: e.target.value as NotificationTarget })}
                      className="input-gb w-full px-4 py-3 text-sm cursor-pointer"
                    >
                      <option value={NotificationTarget.AllUsers}>All Users</option>
                      <option value={NotificationTarget.AllClients}>All Clients</option>
                      <option value={NotificationTarget.AllFreelancers}>All Freelancers</option>
                      <option value={NotificationTarget.Individual}>Individual User</option>
                    </select>
                  </div>

                  {createForm.target === NotificationTarget.Individual && (
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">Target User ID</label>
                      <input
                        type="text"
                        value={createForm.targetUserId}
                        onChange={e => setCreateForm({ ...createForm, targetUserId: e.target.value })}
                        placeholder="user_12345"
                        className="input-gb w-full px-4 py-3 text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">Title</label>
                    <input
                      type="text"
                      value={createForm.title}
                      onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                      placeholder="Notification title"
                      className="input-gb w-full px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">Message</label>
                    <textarea
                      value={createForm.message}
                      onChange={e => setCreateForm({ ...createForm, message: e.target.value })}
                      placeholder="Notification message..."
                      rows={4}
                      className="input-gb w-full px-4 py-3 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">Action URL (Optional)</label>
                    <input
                      type="text"
                      value={createForm.actionUrl}
                      onChange={e => setCreateForm({ ...createForm, actionUrl: e.target.value })}
                      placeholder="/path/to/action"
                      className="input-gb w-full px-4 py-3 text-sm"
                    />
                  </div>

                  <div className="bg-cyan/10 border border-cyan/20 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Calendar size={20} className="text-cyan flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-primary mb-1">Schedule Notification</p>
                        <p className="text-xs text-secondary mb-3">
                          Leave empty to send immediately, or set a date and time to schedule for later
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted mb-1">Date</label>
                        <input
                          type="date"
                          value={createForm.scheduleDate}
                          onChange={e => setCreateForm({ ...createForm, scheduleDate: e.target.value })}
                          className="input-gb w-full px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Time</label>
                        <input
                          type="time"
                          value={createForm.scheduleTime}
                          onChange={e => setCreateForm({ ...createForm, scheduleTime: e.target.value })}
                          className="input-gb w-full px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn-ghost-cyan px-6 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNotification}
                    className="btn-purple px-6 py-2 flex items-center gap-2"
                    disabled={!createForm.title || !createForm.message}
                  >
                    <Send size={16} />
                    {createForm.scheduleDate && createForm.scheduleTime ? 'Schedule' : 'Send'} Notification
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
