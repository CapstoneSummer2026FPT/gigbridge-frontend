import { useRef, useState } from 'react';
import { AlertCircle, Bell, CheckCircle, Send, Users } from 'lucide-react';
import { adminAPI } from '../../../api/adminAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';
import '../styles/admin-users-screen.css';

type AdminBroadcastTarget = 0 | 1 | 2 | 3 | 4;
type BroadcastAudience = Exclude<AdminBroadcastTarget, 4>;
type AdminNotificationType =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;
type DeliveryTargetMode = 'all' | 'specific';
type StatusMessage = { type: 'success' | 'error'; message: string };

interface ResolvedTarget {
  email: string;
  userId: string;
}

const ADMIN_NOTIFICATION_TYPES: { value: AdminNotificationType; label: string }[] = [
  { value: 10, label: 'System Alert' },
  { value: 0, label: 'New Job' },
  { value: 1, label: 'Proposal Received' },
  { value: 2, label: 'Proposal Status Changed' },
  { value: 3, label: 'Contract Started' },
  { value: 4, label: 'Milestone Updated' },
  { value: 5, label: 'Payment Proof Uploaded' },
  { value: 6, label: 'Payment Confirmed' },
  { value: 7, label: 'Chat Message' },
  { value: 8, label: 'Dispute Update' },
  { value: 9, label: 'Review Received' },
  { value: 11, label: 'AI Interview Invite' },
  { value: 12, label: 'Subscription Expiring' },
  { value: 13, label: 'Schedule' },
  { value: 14, label: 'Subscription Activated' },
  { value: 15, label: 'Subscription Cancelled' },
  { value: 16, label: 'Promotion Activated' },
  { value: 17, label: 'Promotion Expired' },
  { value: 18, label: 'Rank Protection Activated' },
  { value: 19, label: 'Rank Protection Expired' },
  { value: 20, label: 'Report Updated' },
];

const ADMIN_BROADCAST_TARGETS: { value: BroadcastAudience; label: string }[] = [
  { value: 0, label: 'All Users' },
  { value: 1, label: 'Clients' },
  { value: 2, label: 'Freelancers' },
  { value: 3, label: 'Admins' },
];

const getThrownErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const isResolvedTarget = (
  target: { email: string; userId: string | undefined },
): target is ResolvedTarget => typeof target.userId === 'string';

export default function AdminNotificationsScreen() {
  const broadcastTitleRef = useRef<HTMLInputElement>(null);
  const testTitleRef = useRef<HTMLInputElement>(null);
  const targetEmailsRef = useRef<HTMLTextAreaElement>(null);
  const [broadcastForm, setBroadcastForm] = useState({
    target: 0 as BroadcastAudience,
    type: 10 as AdminNotificationType,
    title: '',
    content: '',
    referenceId: '',
    referenceType: '',
    sendEmail: false,
  });
  const [testForm, setTestForm] = useState({
    targetMode: 'all' as DeliveryTargetMode,
    targetEmails: '',
    type: 10 as AdminNotificationType,
    title: 'Test notification',
    content: 'This is a test notification from GigBridge admin.',
  });
  const [broadcastStatus, setBroadcastStatus] = useState<StatusMessage | null>(null);
  const [testStatus, setTestStatus] = useState<StatusMessage | null>(null);
  const [isBroadcastSending, setIsBroadcastSending] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);

  const sendAdminNotification = (payload: {
    target: AdminBroadcastTarget;
    targetUserId?: string | null;
    type: AdminNotificationType;
    title: string;
    content: string;
    referenceId?: string | null;
    referenceType?: string | null;
    sendEmail?: boolean;
  }) =>
    adminAPI.broadcastNotification({
      target: payload.target,
      targetUserId: payload.targetUserId ?? null,
      type: payload.type,
      title: payload.title.trim(),
      content: payload.content.trim(),
      referenceId: payload.referenceId ?? null,
      referenceType: payload.referenceType?.trim() || null,
      sendEmail: payload.sendEmail ?? false,
    });

  const handleSendBroadcast = async () => {
    if (!broadcastForm.title.trim()) {
      showValidationToast('Title is required.', { fallback: 'Title is required.' });
      broadcastTitleRef.current?.focus();
      return;
    }

    setIsBroadcastSending(true);
    setBroadcastStatus(null);

    try {
      const response = await sendAdminNotification({
        target: broadcastForm.target,
        type: broadcastForm.type,
        title: broadcastForm.title,
        content: broadcastForm.content,
        referenceId: broadcastForm.referenceId.trim() || null,
        referenceType: broadcastForm.referenceType,
        sendEmail: broadcastForm.sendEmail,
      });

      if (!response.success) {
        if (isValidationResponse(response)) {
          showValidationToast(response, { fallback: response.message || 'Failed to send broadcast.' });
          return;
        }
        setBroadcastStatus({
          type: 'error',
          message: response.message || 'Failed to send broadcast.',
        });
        return;
      }

      setBroadcastStatus({
        type: 'success',
        message: response.message || 'Broadcast sent successfully.',
      });
      setBroadcastForm(previous => ({
        ...previous,
        title: '',
        content: '',
        referenceId: '',
        referenceType: '',
        sendEmail: false,
      }));
    } catch (error: unknown) {
      setBroadcastStatus({
        type: 'error',
        message: getThrownErrorMessage(error, 'Failed to send broadcast.'),
      });
    } finally {
      setIsBroadcastSending(false);
    }
  };

  const parseTargetEmails = (value: string): string[] =>
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
        return { email, userId: user?.userId };
      }),
    );

    return {
      resolvedUsers: results.filter(isResolvedTarget),
      missingEmails: results.filter(result => !result.userId).map(result => result.email),
    };
  };

  const handleSendTestNotification = async () => {
    const targetEmails = parseTargetEmails(testForm.targetEmails);
    const validationMessages: string[] = [];
    if (!testForm.title.trim()) validationMessages.push('Title is required.');
    if (testForm.targetMode === 'specific' && targetEmails.length === 0) {
      validationMessages.push('Add at least one target user email.');
    }
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: 'Complete the required fields.' });
      if (!testForm.title.trim()) testTitleRef.current?.focus();
      else targetEmailsRef.current?.focus();
      return;
    }

    setIsTestSending(true);
    setTestStatus(null);

    try {
      if (testForm.targetMode === 'all') {
        const response = await sendAdminNotification({
          target: 0,
          type: testForm.type,
          title: testForm.title,
          content: testForm.content,
        });
        setTestStatus({
          type: response.success ? 'success' : 'error',
          message:
            response.message ||
            (response.success
              ? 'Test notification sent to all users.'
              : 'Failed to send test notification.'),
        });
        return;
      }

      const { resolvedUsers, missingEmails } = await resolveTargetEmails(targetEmails);
      if (resolvedUsers.length === 0) {
        showValidationToast(
          missingEmails.length > 0
            ? `No users found for: ${missingEmails.join(', ')}`
            : 'No users found for those emails.',
          { fallback: 'No users found for those emails.' },
        );
        targetEmailsRef.current?.focus();
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
          }),
        ),
      );
      const failedCount = responses.filter(response => !response.success).length;
      const missingText =
        missingEmails.length > 0 ? ` Missing: ${missingEmails.join(', ')}.` : '';

      setTestStatus({
        type: failedCount === 0 && missingEmails.length === 0 ? 'success' : 'error',
        message:
          failedCount === 0
            ? `Test notification sent to ${resolvedUsers.length} user${resolvedUsers.length === 1 ? '' : 's'}.${missingText}`
            : `${failedCount} of ${resolvedUsers.length} test notifications failed.${missingText}`,
      });
    } catch (error: unknown) {
      setTestStatus({
        type: 'error',
        message: getThrownErrorMessage(error, 'Failed to send test notification.'),
      });
    } finally {
      setIsTestSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={20} className="text-purple" />
              <span className="badge-purple text-xs">Notification Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary">Notifications</h1>
            <p className="text-sm text-secondary mt-1">
              Send notifications through the connected admin broadcast endpoint.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6 sm:mb-8">
            <section className="glass-card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Send size={16} className="text-purple" />
                    <h2 className="text-sm font-bold text-primary">Broadcast</h2>
                  </div>
                  <p className="text-xs text-secondary">
                    Send one notification to a platform audience.
                  </p>
                </div>
                <span className="badge-purple text-xs">Live API</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <label className="text-xs text-muted">
                  Audience
                  <select
                    value={broadcastForm.target}
                    onChange={event =>
                      setBroadcastForm({
                        ...broadcastForm,
                        target: Number(event.target.value) as BroadcastAudience,
                      })
                    }
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer mt-1"
                  >
                    {ADMIN_BROADCAST_TARGETS.map(target => (
                      <option key={target.value} value={target.value}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-muted">
                  Type
                  <select
                    value={broadcastForm.type}
                    onChange={event =>
                      setBroadcastForm({
                        ...broadcastForm,
                        type: Number(event.target.value) as AdminNotificationType,
                      })
                    }
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer mt-1"
                  >
                    {ADMIN_NOTIFICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                <input
                  ref={broadcastTitleRef}
                  value={broadcastForm.title}
                  onChange={event =>
                    setBroadcastForm({ ...broadcastForm, title: event.target.value })
                  }
                  placeholder="Notification title"
                  aria-invalid={!broadcastForm.title.trim()}
                  className="input-gb w-full px-3 py-2 text-sm"
                />
                <textarea
                  value={broadcastForm.content}
                  onChange={event =>
                    setBroadcastForm({ ...broadcastForm, content: event.target.value })
                  }
                  placeholder="Notification message"
                  rows={4}
                  className="input-gb w-full px-3 py-2 text-sm resize-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={broadcastForm.referenceId}
                    onChange={event =>
                      setBroadcastForm({ ...broadcastForm, referenceId: event.target.value })
                    }
                    placeholder="Reference ID (optional)"
                    className="input-gb w-full px-3 py-2 text-sm"
                  />
                  <input
                    value={broadcastForm.referenceType}
                    onChange={event =>
                      setBroadcastForm({ ...broadcastForm, referenceType: event.target.value })
                    }
                    placeholder="Reference type (optional)"
                    className="input-gb w-full px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-secondary">
                  <input
                    type="checkbox"
                    checked={broadcastForm.sendEmail}
                    onChange={event =>
                      setBroadcastForm({ ...broadcastForm, sendEmail: event.target.checked })
                    }
                  />
                  Also send by email
                </label>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => void handleSendBroadcast()}
                  disabled={isBroadcastSending}
                  className="btn-cyan px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  {isBroadcastSending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
              {broadcastStatus && (
                <p
                  role="status"
                  className={`text-xs mt-3 ${broadcastStatus.type === 'success' ? 'text-green' : 'text-red'}`}
                >
                  {broadcastStatus.message}
                </p>
              )}
            </section>

            <section className="glass-card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={16} className="text-cyan" />
                    <h2 className="text-sm font-bold text-primary">Test Delivery</h2>
                  </div>
                  <p className="text-xs text-secondary">
                    Verify delivery for all users or selected accounts.
                  </p>
                </div>
                <span className="badge-cyan text-xs">Live API</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <label className="text-xs text-muted">
                  Recipients
                  <select
                    value={testForm.targetMode}
                    onChange={event =>
                      setTestForm({
                        ...testForm,
                        targetMode: event.target.value as DeliveryTargetMode,
                      })
                    }
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer mt-1"
                  >
                    <option value="all">All users</option>
                    <option value="specific">Specific users</option>
                  </select>
                </label>
                <label className="text-xs text-muted">
                  Type
                  <select
                    value={testForm.type}
                    onChange={event =>
                      setTestForm({
                        ...testForm,
                        type: Number(event.target.value) as AdminNotificationType,
                      })
                    }
                    className="input-gb w-full px-3 py-2 text-sm cursor-pointer mt-1"
                  >
                    {ADMIN_NOTIFICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {testForm.targetMode === 'specific' && (
                <textarea
                  ref={targetEmailsRef}
                  value={testForm.targetEmails}
                  onChange={event =>
                    setTestForm({ ...testForm, targetEmails: event.target.value })
                  }
                  placeholder="User emails separated by commas, spaces, or new lines"
                  rows={2}
                  className="input-gb w-full px-3 py-2 text-sm resize-none mb-3"
                />
              )}

              <div className="space-y-3">
                <input
                  ref={testTitleRef}
                  value={testForm.title}
                  onChange={event => setTestForm({ ...testForm, title: event.target.value })}
                  placeholder="Test title"
                  aria-invalid={!testForm.title.trim()}
                  className="input-gb w-full px-3 py-2 text-sm"
                />
                <textarea
                  value={testForm.content}
                  onChange={event => setTestForm({ ...testForm, content: event.target.value })}
                  placeholder="Test message"
                  rows={4}
                  className="input-gb w-full px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => void handleSendTestNotification()}
                  disabled={isTestSending}
                  className="btn-cyan px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  {isTestSending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              {testStatus && (
                <p
                  role="status"
                  className={`text-xs mt-3 ${testStatus.type === 'success' ? 'text-green' : 'text-red'}`}
                >
                  {testStatus.message}
                </p>
              )}
            </section>
          </div>

          <section className="glass-card p-8 text-center">
            <AlertCircle size={42} className="mx-auto mb-3 text-amber" />
            <h2 className="text-lg font-semibold text-primary mb-2">
              Notification history unavailable
            </h2>
            <p className="text-sm text-secondary max-w-2xl mx-auto">
              The backend currently exposes notification sending but no admin history endpoint.
              Delivery statistics, scheduling, cancellation, and deletion are hidden until those
              operations are backed by persisted data.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted">
              <CheckCircle size={14} className="text-green" />
              Broadcast and test delivery remain available above.
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
