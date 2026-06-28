import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCcw, Search, ShieldAlert, XCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import type { AdminCheatingEventDto, AdminCheatingViolationDto } from '../../../types/models/Cheating';

type ReviewedFilter = 'all' | 'reviewed' | 'unreviewed';
type EventTypeFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5';

const actionLabel = (action: number): string => {
  if (action === 2) return 'Temporary suspension';
  if (action === 1) return 'Elo penalty';
  return 'Warning';
};

const eventLabel = (eventType: number): string => {
  if (eventType === 0) return 'Copy';
  if (eventType === 1) return 'Paste';
  if (eventType === 2) return 'Tab switch';
  if (eventType === 3) return 'Screenshot attempt';
  if (eventType === 4) return 'Focus loss';
  if (eventType === 5) return 'Fullscreen exit';
  return 'Unknown';
};

const eventBadgeClass = (eventType: number): string => {
  if (eventType === 2) return 'badge-purple text-xs';
  if (eventType >= 3) return 'badge-red text-xs';
  return 'badge-amber text-xs';
};

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

export default function AdminCheatingManagementScreen() {
  const [violations, setViolations] = useState<AdminCheatingViolationDto[]>([]);
  const [events, setEvents] = useState<AdminCheatingEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');
  const [error, setError] = useState('');

  const loadViolations = useCallback(async () => {
    setLoading(true);
    setError('');

    const [violationsResponse, eventsResponse] = await Promise.all([
      adminAPI.getCheatingViolations({
        Page: 1,
        PageSize: 100,
        Search: search.trim() || undefined,
        IsReviewed: reviewedFilter === 'all' ? undefined : reviewedFilter === 'reviewed',
      }),
      adminAPI.getCheatingEvents({
        Page: 1,
        PageSize: 50,
        Search: search.trim() || undefined,
        EventType: eventTypeFilter === 'all' ? undefined : Number(eventTypeFilter),
      }),
    ]);

    if (violationsResponse.success && violationsResponse.data) {
      setViolations(violationsResponse.data.items);
    } else {
      setViolations([]);
      setError(violationsResponse.message || 'Cheating violations could not be loaded.');
    }

    if (eventsResponse.success && eventsResponse.data) {
      setEvents(eventsResponse.data.items);
    } else {
      setEvents([]);
    }

    setLoading(false);
  }, [eventTypeFilter, reviewedFilter, search]);

  useEffect(() => {
    void loadViolations();
  }, [loadViolations]);

  const stats = useMemo(() => {
    const total = violations.length;
    const unreviewed = violations.filter(violation => !violation.isReviewed).length;
    const suspended = violations.filter(violation => violation.suspendedUntil).length;
    const events = violations.reduce((sum, violation) => sum + violation.totalEventCount, 0);
    return { total, unreviewed, suspended, events };
  }, [violations]);

  const handleToggleReviewed = async (violation: AdminCheatingViolationDto) => {
    const response = await adminAPI.reviewCheatingViolation(violation.freelancerCheatingViolationId, {
      isReviewed: !violation.isReviewed,
      adminNote: violation.isReviewed ? null : 'Reviewed from admin cheating management.',
    });

    if (response.success) {
      await loadViolations();
    } else {
      setError(response.message || 'Review status could not be updated.');
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setReviewedFilter(event.target.value as ReviewedFilter);
  };

  const handleEventTypeFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setEventTypeFilter(event.target.value as EventTypeFilter);
  };

  const handleRefresh = () => {
    void loadViolations();
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <ShieldAlert size={20} className="text-red-500" />
              <span className="badge-red text-xs">Cheating Control</span>
            </div>
            <h1 className="text-3xl font-black text-primary">Cheating Management</h1>
            <p className="mt-1 text-sm text-secondary">Monitor interview answer violations and penalty outcomes.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-ghost-cyan flex items-center gap-2 px-4 py-2 text-sm"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Violations', value: stats.total, icon: <AlertTriangle size={16} />, className: 'badge-red' },
            { label: 'Unreviewed', value: stats.unreviewed, icon: <XCircle size={16} />, className: 'badge-amber' },
            { label: 'Suspensions', value: stats.suspended, icon: <ShieldAlert size={16} />, className: 'badge-purple' },
            { label: 'Logged Events', value: stats.events, icon: <CheckCircle size={16} />, className: 'badge-cyan' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-secondary">{stat.label}</p>
                <span className={`${stat.className} text-[10px] px-1.5 py-0`}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="glass-card mb-6 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={handleSearchChange}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                placeholder="Search freelancer, email, or job title"
              />
            </div>
            <select
              value={reviewedFilter}
              onChange={handleFilterChange}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
            >
              <option value="all">All review states</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="reviewed">Reviewed</option>
            </select>
            <select
              value={eventTypeFilter}
              onChange={handleEventTypeFilterChange}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
            >
              <option value="all">All event types</option>
              <option value="0">Copy</option>
              <option value="1">Paste</option>
              <option value="2">Tab switch</option>
              <option value="3">Screenshot attempt</option>
              <option value="4">Focus loss</option>
              <option value="5">Fullscreen exit</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Freelancer</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Penalty</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading violations...</td>
                  </tr>
                ) : violations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No cheating violations found.</td>
                  </tr>
                ) : (
                  violations.map(violation => (
                    <tr key={violation.freelancerCheatingViolationId} className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">{violation.freelancerName}</p>
                        <p className="text-xs text-secondary">{violation.freelancerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs truncate text-primary">{violation.jobTitle}</p>
                        <p className="text-xs text-secondary">Proposal #{violation.proposalId.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">{violation.totalEventCount} events</p>
                        <p className="text-xs text-secondary">
                          C:{violation.copyCount} P:{violation.pasteCount} T:{violation.tabSwitchCount}
                          {' '}S:{violation.screenshotAttemptCount} F:{violation.focusLossCount} X:{violation.fullscreenExitCount}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={violation.action === 2 ? 'badge-red text-xs' : 'badge-amber text-xs'}>
                          {actionLabel(violation.action)}
                        </span>
                        <p className="mt-1 text-xs text-secondary">{violation.eloDelta} Elo</p>
                        {violation.suspendedUntil && (
                          <p className="text-xs text-red-500">Until {formatDate(violation.suspendedUntil)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-secondary">{formatDate(violation.createdAt)}</td>
                      <td className="px-4 py-3">
                        {violation.isReviewed ? (
                          <span className="badge-green text-xs">Reviewed</span>
                        ) : (
                          <span className="badge-red text-xs">Needs review</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleToggleReviewed(violation)}
                          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/20"
                        >
                          {violation.isReviewed ? 'Mark unreviewed' : 'Mark reviewed'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card mt-6 overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg font-bold text-primary">Recent Cheating Event Logs</h2>
            <p className="text-xs text-secondary">Raw interview anti-cheat events captured during draft answers.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Freelancer</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Proposal</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Occurred</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading event logs...</td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No cheating event logs found.</td>
                  </tr>
                ) : (
                  events.map(event => (
                    <tr key={event.proposalCheatingEventId} className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <span className={eventBadgeClass(event.eventType)}>
                          {eventLabel(event.eventType)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">{event.freelancerName}</p>
                        <p className="text-xs text-secondary">{event.freelancerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs truncate text-primary">{event.jobTitle}</p>
                        {event.jobPostQuestionId && (
                          <p className="text-xs text-secondary">Question #{event.jobPostQuestionId.slice(0, 8)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-secondary">#{event.proposalId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-secondary">{event.ipAddress || '-'}</td>
                      <td className="px-4 py-3 text-secondary">{formatDate(event.occurredAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
