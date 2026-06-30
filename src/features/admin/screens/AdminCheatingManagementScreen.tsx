import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCcw, 
  Search, 
  ShieldAlert, 
  XCircle, 
  X, 
  Clipboard, 
  ArrowRightLeft, 
  Monitor, 
  Focus, 
  Maximize2, 
  Info,
  Calendar,
  User,
  Shield,
  ExternalLink,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import type { 
  AdminCheatingEventDto, 
  AdminCheatingViolationDto, 
  AdminCheatingViolationDetailDto 
} from '../../../types/models/Cheating';
import '../styles/admin-cheating-management-screen.css';

type ReviewedFilter = 'all' | 'reviewed' | 'unreviewed';
type EventTypeFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5';
type SortField = 'date' | 'events' | 'violationNumber';
type ActiveTab = 'violations' | 'events';

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
  switch (eventType) {
    case 0: return 'badge-copy';
    case 1: return 'badge-paste';
    case 2: return 'badge-tab text-purple-500 border-purple-500/30';
    case 3: return 'badge-screenshot text-pink-500 border-pink-500/30';
    case 4: return 'badge-focus text-blue-500 border-blue-500/30';
    case 5: return 'badge-fullscreen text-red-500 border-red-500/30';
    default: return 'badge-outline';
  }
};

const eventIcon = (eventType: number) => {
  switch (eventType) {
    case 0: return <Clipboard size={14} className="text-amber-500" />;
    case 1: return <Clipboard size={14} className="text-orange-500" />;
    case 2: return <ArrowRightLeft size={14} className="text-purple-500" />;
    case 3: return <Monitor size={14} className="text-pink-500" />;
    case 4: return <Focus size={14} className="text-blue-500" />;
    case 5: return <Maximize2 size={14} className="text-red-500" />;
    default: return <Info size={14} className="text-gray-500" />;
  }
};

const eventItemClass = (eventType: number): string => {
  switch (eventType) {
    case 0: return 'event-copy';
    case 1: return 'event-paste';
    case 2: return 'event-tab';
    case 3: return 'event-screenshot';
    case 4: return 'event-focus';
    case 5: return 'event-fullscreen';
    default: return '';
  }
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
  const [sortField, setSortField] = useState<SortField>('date');
  const [error, setError] = useState('');

  // Active Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('violations');

  // Violations Pagination state
  const [violationsPage, setViolationsPage] = useState(1);
  const [violationsPageSize, setViolationsPageSize] = useState(10);
  const [violationsTotal, setViolationsTotal] = useState(0);
  const [violationsTotalPages, setViolationsTotalPages] = useState(0);

  // Events Pagination state
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSize] = useState(10);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsTotalPages, setEventsTotalPages] = useState(0);

  // Stats summary state
  const [stats, setStats] = useState({ total: 0, unreviewed: 0, suspended: 0, events: 0 });

  // Selected violation detail & modal state
  const [selectedViolationDetail, setSelectedViolationDetail] = useState<AdminCheatingViolationDetailDto | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState('');

  // Timeline Pagination / Limit states inside Modal
  const [eventsLimit, setEventsLimit] = useState(5);
  const [eventsIncrement, setEventsIncrement] = useState(5);

  const loadStats = useCallback(async () => {
    try {
      const response = await adminAPI.getCheatingViolations({ Page: 1, PageSize: 1000 });
      if (response.success && response.data) {
        const items = response.data.items || [];
        const total = response.data.totalItems || items.length;
        const unreviewed = items.filter(v => !v.isReviewed).length;
        const suspended = items.filter(v => v.suspendedUntil).length;
        const eventsCount = items.reduce((sum, v) => sum + v.totalEventCount, 0);
        setStats({ total, unreviewed, suspended, events: eventsCount });
      }
    } catch (err) {
      console.error('Failed to load cheating stats:', err);
    }
  }, []);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getCheatingViolations({
        Page: violationsPage,
        PageSize: violationsPageSize,
        Search: search.trim() || undefined,
        IsReviewed: reviewedFilter === 'all' ? undefined : reviewedFilter === 'reviewed',
      });

      if (response.success && response.data) {
        setViolations(response.data.items || []);
        setViolationsTotal(response.data.totalItems || 0);
        setViolationsTotalPages(response.data.totalPages || 0);
      } else {
        setViolations([]);
        setError(response.message || 'Cheating violations could not be loaded.'); // MSG124
        toast.error(response.message || 'Cheating violations could not be loaded.');
      }
    } catch (err: any) {
      setError(err.message || 'Cheating violations could not be loaded.'); // MSG124
      toast.error('Cheating violations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [violationsPage, violationsPageSize, search, reviewedFilter]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getCheatingEvents({
        Page: eventsPage,
        PageSize: eventsPageSize,
        Search: search.trim() || undefined,
        EventType: eventTypeFilter === 'all' ? undefined : Number(eventTypeFilter),
      });

      if (response.success && response.data) {
        setEvents(response.data.items || []);
        setEventsTotal(response.data.totalItems || 0);
        setEventsTotalPages(response.data.totalPages || 0);
      } else {
        setEvents([]);
        setError(response.message || 'Cheating events could not be loaded.'); // MSG123
        toast.error(response.message || 'Cheating events could not be loaded.');
      }
    } catch (err: any) {
      setError(err.message || 'Cheating events could not be loaded.'); // MSG123
      toast.error('Cheating events could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [eventsPage, eventsPageSize, search, eventTypeFilter]);

  useEffect(() => {
    if (activeTab === 'violations') {
      void fetchViolations();
    } else {
      void fetchEvents();
    }
  }, [activeTab, fetchViolations, fetchEvents]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Handle detailed review lookup
  const handleViewDetails = async (violationId: string) => {
    setModalLoading(true);
    try {
      const res = await adminAPI.getCheatingViolationDetail(violationId);
      if (res.success && res.data) {
        setSelectedViolationDetail(res.data);
        setAdminNoteInput(res.data.adminNote || '');
        setEventsLimit(5);
        setEventsIncrement(5);
      } else {
        toast.error(res.message || 'Could not load violation details.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while loading details.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateReview = async (isReviewed: boolean) => {
    if (!selectedViolationDetail) return;
    
    // BR-130 Note Length Validation
    if (adminNoteInput.length > 1000) {
      toast.error("Review note cannot exceed 1000 characters."); // MSG125
      return;
    }

    try {
      const response = await adminAPI.reviewCheatingViolation(
        selectedViolationDetail.freelancerCheatingViolationId, 
        {
          isReviewed,
          adminNote: adminNoteInput.trim() || null
        }
      );
      if (response.success) {
        toast.success("Review updated successfully."); // MSG129
        setSelectedViolationDetail(null);
        void loadStats();
        if (activeTab === 'violations') {
          void fetchViolations();
        }
      } else {
        toast.error(response.message || "Failed to update review."); // MSG126
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update review."); // MSG126
    }
  };

  const handleSaveNote = async () => {
    if (!selectedViolationDetail) return;

    if (adminNoteInput.length > 1000) {
      toast.error("Review note cannot exceed 1000 characters."); // MSG125
      return;
    }

    try {
      const response = await adminAPI.reviewCheatingViolation(
        selectedViolationDetail.freelancerCheatingViolationId,
        {
          isReviewed: selectedViolationDetail.isReviewed,
          adminNote: adminNoteInput.trim() || null
        }
      );
      if (response.success) {
        toast.success("Note saved successfully.");
      } else {
        toast.error(response.message || "Failed to save note.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setViolationsPage(1);
    setEventsPage(1);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setReviewedFilter(event.target.value as ReviewedFilter);
    setViolationsPage(1);
  };

  const handleEventTypeFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setEventTypeFilter(event.target.value as EventTypeFilter);
    setEventsPage(1);
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortField(event.target.value as SortField);
  };

  const handleRefresh = () => {
    void loadStats();
    if (activeTab === 'violations') {
      void fetchViolations();
    } else {
      void fetchEvents();
    }
  };

  const sortedViolations = useMemo(() => {
    const list = [...violations];
    if (sortField === 'events') {
      return list.sort((a, b) => b.totalEventCount - a.totalEventCount);
    }
    if (sortField === 'violationNumber') {
      return list.sort((a, b) => b.violationNumber - a.violationNumber);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [violations, sortField]);

  const renderMetadata = (metadataStr?: string | null) => {
    if (!metadataStr) return null;
    try {
      const meta = JSON.parse(metadataStr);
      return (
        <div className="metadata-code-box">
          {Object.entries(meta).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="font-semibold text-primary">{key}:</span>
              <span>{String(val)}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return <div className="metadata-code-box">{metadataStr}</div>;
    }
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    pageSize: number,
    totalItems: number,
    onPageChange: (page: number) => void,
    onPageSizeChange: (size: number) => void
  ) => {
    if (totalItems === 0) return null;
    return (
      <div className="cheating-pagination-container">
        <div className="pagination-info">
          Showing <span className="font-bold text-primary">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
          <span className="font-bold text-primary">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
          <span className="font-bold text-primary">{totalItems}</span> records
        </div>
        <div className="pagination-controls">
          <div className="page-size-selector">
            <span className="text-xs text-secondary">Items per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)]"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 rounded border border-border bg-background text-xs font-semibold text-foreground disabled:opacity-40 hover:bg-muted/10"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-secondary text-xs">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold ${
                      currentPage === p
                        ? 'bg-[var(--gb-cyan)] text-white'
                        : 'border border-border bg-background text-foreground hover:bg-muted/10'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 rounded border border-border bg-background text-xs font-semibold text-foreground disabled:opacity-40 hover:bg-muted/10"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <ShieldAlert size={20} className="text-red-500 animate-pulse" />
              <span className="badge-red text-xs font-semibold">Anti-Cheat System</span>
            </div>
            <h1 className="text-3xl font-black text-primary tracking-tight">Cheating Management</h1>
            <p className="mt-1 text-sm text-secondary">Monitor copy/paste, tab switches, and exit behaviors in freelancer answers.</p>
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

        {/* Stats Grid */}
        <div className="cheating-stats-grid">
          {[
            { label: 'Total Violations', value: stats.total, icon: <AlertTriangle size={18} />, className: 'card-violations' },
            { label: 'Pending Review', value: stats.unreviewed, icon: <XCircle size={18} />, className: 'card-unreviewed' },
            { label: 'User Suspensions', value: stats.suspended, icon: <ShieldAlert size={18} />, className: 'card-suspensions' },
            { label: 'Suspicious Events', value: stats.events, icon: <CheckCircle size={18} />, className: 'card-events' },
          ].map(stat => (
            <div key={stat.label} className={`cheating-stat-card ${stat.className}`}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-secondary font-medium uppercase tracking-wider">{stat.label}</p>
                <span className="text-secondary">{stat.icon}</span>
              </div>
              <p className="text-3xl font-black text-primary">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="cheating-tabs-header mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('violations');
              setSearch('');
            }}
            className={`cheating-tab-btn ${activeTab === 'violations' ? 'active' : ''}`}
          >
            <AlertTriangle size={16} />
            <span>Freelancer Violations</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('events');
              setSearch('');
            }}
            className={`cheating-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          >
            <Shield size={16} />
            <span>Recent Suspicious Event Log</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="cheating-filters-bar mb-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={handleSearchChange}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                placeholder={activeTab === 'violations' ? "Search freelancer name, email, or job title" : "Search freelancer name, email, or keyword"}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTab === 'violations' && (
                <>
                  <select
                    value={reviewedFilter}
                    onChange={handleFilterChange}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="unreviewed">Needs Review</option>
                    <option value="reviewed">Reviewed</option>
                  </select>
                  <select
                    value={sortField}
                    onChange={handleSortChange}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="events">Sort by Event Count</option>
                    <option value="violationNumber">Sort by Violation No.</option>
                  </select>
                </>
              )}
              {activeTab === 'events' && (
                <select
                  value={eventTypeFilter}
                  onChange={handleEventTypeFilterChange}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]"
                >
                  <option value="all">All Cheat Types</option>
                  <option value="0">Copy blocked</option>
                  <option value="1">Paste blocked</option>
                  <option value="2">Tab switch</option>
                  <option value="3">Screenshot attempt</option>
                  <option value="4">Focus loss</option>
                  <option value="5">Fullscreen exit</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Violations Table */}
        {activeTab === 'violations' && (
          <div className="glass-card overflow-hidden mb-8">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Freelancer Violations</h2>
              <span className="text-xs text-secondary font-medium">{violationsTotal} records found</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">Freelancer</th>
                    <th className="px-6 py-4">Job Title & Proposal</th>
                    <th className="px-6 py-4">Violation Number</th>
                    <th className="px-6 py-4">Event Breakdown</th>
                    <th className="px-6 py-4">Penalty Applied</th>
                    <th className="px-6 py-4">Review Status</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCcw size={16} className="animate-spin text-[var(--gb-cyan)]" />
                          <span>Loading anti-cheat violations...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedViolations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        No anti-cheat violations matched your search filters.
                      </td>
                    </tr>
                  ) : (
                    sortedViolations.map(violation => (
                      <tr 
                        key={violation.freelancerCheatingViolationId} 
                        className="clickable-row border-b border-border/40"
                        onClick={() => void handleViewDetails(violation.freelancerCheatingViolationId)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-white text-xs">
                              {violation.freelancerName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-primary">{violation.freelancerName}</p>
                              <p className="text-xs text-secondary">{violation.freelancerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="max-w-[200px] truncate font-medium text-primary">{violation.jobTitle}</p>
                          <p className="text-xs text-secondary">Proposal #{violation.proposalId.slice(0, 8)}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-primary text-base">
                          #{violation.violationNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-primary mr-1">{violation.totalEventCount} Total</span>
                            {violation.copyCount > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-semibold">C:{violation.copyCount}</span>}
                            {violation.pasteCount > 0 && <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded font-semibold">P:{violation.pasteCount}</span>}
                            {violation.tabSwitchCount > 0 && <span className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded font-semibold">T:{violation.tabSwitchCount}</span>}
                            {violation.screenshotAttemptCount > 0 && <span className="text-[10px] bg-pink-500/10 text-pink-500 px-1.5 py-0.5 rounded font-semibold">S:{violation.screenshotAttemptCount}</span>}
                            {violation.focusLossCount > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-semibold">F:{violation.focusLossCount}</span>}
                            {violation.fullscreenExitCount > 0 && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-semibold">X:{violation.fullscreenExitCount}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`badge text-xs font-semibold px-2 py-0.5 rounded max-w-fit ${
                              violation.action === 2 ? 'badge-outline-danger' : 'badge-amber'
                            }`}>
                              {actionLabel(violation.action)}
                            </span>
                            <span className="elo-delta-badge negative max-w-fit mt-0.5">
                              <TrendingDown size={10} />
                              {violation.eloDelta} Elo
                            </span>
                            {violation.suspendedUntil && (
                              <span className="text-xs text-red-500 font-medium">Until {formatDate(violation.suspendedUntil)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {violation.isReviewed ? (
                            <span className="badge-green text-xs font-semibold px-2 py-0.5 rounded">Reviewed</span>
                          ) : (
                            <span className="badge-red text-xs font-semibold px-2 py-0.5 rounded">Needs review</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="text-[var(--gb-cyan)] hover:text-blue-500 font-bold text-xs inline-flex items-center gap-1"
                          >
                            Review <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(
              violationsPage,
              violationsTotalPages,
              violationsPageSize,
              violationsTotal,
              setViolationsPage,
              setViolationsPageSize
            )}
          </div>
        )}

        {/* Tab 2: Cheating Events Table */}
        {activeTab === 'events' && (
          <div className="glass-card overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Recent Suspicious Event Log</h2>
              <span className="text-xs text-secondary font-medium">{eventsTotal} records found</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">Event Type</th>
                    <th className="px-6 py-4">Freelancer</th>
                    <th className="px-6 py-4">Job Title</th>
                    <th className="px-6 py-4">Proposal</th>
                    <th className="px-6 py-4">Network Info</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCcw size={16} className="animate-spin text-[var(--gb-cyan)]" />
                          <span>Loading event logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No cheating event logs captured.</td>
                    </tr>
                  ) : (
                    events.map(event => (
                      <tr key={event.proposalCheatingEventId} className="border-b border-border/40 text-secondary">
                        <td className="px-6 py-4">
                          <span className={`event-count-badge ${eventBadgeClass(event.eventType)}`}>
                            {eventIcon(event.eventType)}
                            {eventLabel(event.eventType)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-primary">{event.freelancerName}</p>
                          <p className="text-xs text-secondary">{event.freelancerEmail}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="max-w-[220px] truncate text-primary font-medium">{event.jobTitle}</p>
                          {event.jobPostQuestionId && (
                            <p className="text-xs text-secondary">Question #{event.jobPostQuestionId.slice(0, 8)}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">#{event.proposalId.slice(0, 8)}</td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-semibold text-primary">{event.ipAddress || 'Unknown IP'}</p>
                          <p className="text-[10px] max-w-[200px] truncate" title={event.userAgent || ''}>
                            {event.userAgent || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium">{formatDate(event.occurredAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(
              eventsPage,
              eventsTotalPages,
              eventsPageSize,
              eventsTotal,
              setEventsPage,
              setEventsPageSize
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedViolationDetail && (
        <div className="cheating-modal-overlay">
          <div className="cheating-modal-container">
            {/* Modal Header */}
            <div className="cheating-modal-header">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-red-500 animate-pulse" size={20} />
                <h2 className="text-lg font-black text-primary tracking-tight">Review Violation Details</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedViolationDetail(null)} 
                className="text-secondary hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content — Two-Column Layout */}
            <div className="cheating-modal-content">
              <div className="modal-two-col-layout">

                {/* LEFT COLUMN: info panels + audit notes */}
                <div className="modal-left-col">
                  {/* Summary Cards */}
                  <div className="cheating-details-summary">
                    {/* Freelancer block */}
                    <div className="summary-block">
                      <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User size={12} /> Freelancer Information
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-white text-sm">
                          {selectedViolationDetail.freelancerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-primary">{selectedViolationDetail.freelancerName}</p>
                          <p className="text-xs text-secondary">{selectedViolationDetail.freelancerEmail}</p>
                        </div>
                      </div>
                    </div>

                    {/* Job block */}
                    <div className="summary-block">
                      <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Shield size={12} /> Job & Interview Scope
                      </h3>
                      <div>
                        <p className="font-bold text-primary max-w-full truncate">{selectedViolationDetail.jobTitle}</p>
                        <p className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                          Proposal: <span className="font-mono">#{selectedViolationDetail.proposalId.slice(0, 8)}</span>
                          <a
                            href={`/proposals/${selectedViolationDetail.proposalId}/answers`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--gb-cyan)] hover:underline inline-flex items-center gap-0.5 ml-1 font-bold text-xs"
                          >
                            View Answers <ExternalLink size={10} />
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Breakdown */}
                  <div className="mb-5">
                    <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Logged Event Count Breakdown</h4>
                    <div className="event-breakdown-container">
                      <span className="event-count-badge badge-copy">Copy: {selectedViolationDetail.copyCount}</span>
                      <span className="event-count-badge badge-paste">Paste: {selectedViolationDetail.pasteCount}</span>
                      <span className="event-count-badge badge-tab">Tab Switch: {selectedViolationDetail.tabSwitchCount}</span>
                      <span className="event-count-badge badge-screenshot">Screenshot: {selectedViolationDetail.screenshotAttemptCount}</span>
                      <span className="event-count-badge badge-focus">Focus Loss: {selectedViolationDetail.focusLossCount}</span>
                      <span className="event-count-badge badge-fullscreen">Fullscreen Exit: {selectedViolationDetail.fullscreenExitCount}</span>
                    </div>
                  </div>

                  {/* Penalty Card */}
                  <div className="summary-block mb-5 border border-red-500/20 bg-red-500/5">
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Imposed Anti-Cheat System Penalty
                    </h4>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-primary">
                        Violation <span className="text-red-500 font-bold">#{selectedViolationDetail.violationNumber}</span>
                        <span className="text-xs font-normal text-secondary ml-1">(Threshold: 3 for Suspension)</span>
                      </p>
                      <p className="text-xs text-secondary">
                        {selectedViolationDetail.action === 2
                          ? 'Suspended from using the platform services for 7 days.'
                          : 'Warning issued alongside ELO penalty points deduction.'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="elo-delta-badge negative text-sm py-1 px-2.5">
                          <TrendingDown size={12} />
                          {selectedViolationDetail.eloDelta} Elo Score
                        </span>
                        {selectedViolationDetail.suspendedUntil && (
                          <span className="text-xs text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            Suspended Until {formatDate(selectedViolationDetail.suspendedUntil)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audit & Decisions */}
                  <div className="border-t border-border/60 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Review Status & Auditor Notes</h4>
                      <span className={`text-xs font-semibold ${adminNoteInput.length > 1000 ? 'text-red-500' : 'text-secondary'}`}>
                        {adminNoteInput.length}/1000
                      </span>
                    </div>
                    {selectedViolationDetail.isReviewed && (
                      <div className="mb-3 text-xs text-green bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                        <CheckCircle size={14} />
                        <span>
                          Reviewed by {selectedViolationDetail.reviewedByAdminName || 'Admin'} on {formatDate(selectedViolationDetail.reviewedAt)}
                        </span>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label text-xs text-secondary mb-1.5 block">Auditor Assessment / Remediation Note</label>
                      <textarea
                        rows={4}
                        value={adminNoteInput}
                        onChange={(e) => setAdminNoteInput(e.target.value)}
                        className={`w-full rounded-lg border p-3 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)] resize-none ${
                          adminNoteInput.length > 1000 ? 'border-red-500 focus:ring-red-500' : 'border-border'
                        }`}
                        placeholder="Enter review notes, assessment details, or override logs..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => setSelectedViolationDetail(null)}
                        className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveNote()}
                        disabled={adminNoteInput.length > 1000}
                        className="rounded-lg border border-[var(--gb-cyan)] text-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/10 px-4 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save Note
                      </button>
                      {selectedViolationDetail.isReviewed ? (
                        <button
                          type="button"
                          onClick={() => void handleUpdateReview(false)}
                          className="rounded-lg bg-yellow-500 hover:bg-yellow-600 px-4 py-2 text-sm font-semibold text-white flex items-center gap-1.5 transition-colors"
                        >
                          Mark Unreviewed
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleUpdateReview(true)}
                          className="rounded-lg bg-green hover:bg-green/90 px-4 py-2 text-sm font-semibold text-white flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle size={14} />
                          Approve & Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Chronological Session Log */}
                <div className="modal-right-col">
                  <div className="timeline-section-wrapper">
                    <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                      <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                        Chronological Session Log
                        <span className="ml-1.5 text-[var(--gb-cyan)]">({selectedViolationDetail.events.length})</span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-secondary">Show:</span>
                        <select
                          value={eventsIncrement}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEventsIncrement(val);
                            setEventsLimit(val);
                          }}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)]"
                        >
                          {[5, 10, 20, 50].map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedViolationDetail.events.length === 0 ? (
                      <p className="text-sm text-secondary italic">No chronological events found.</p>
                    ) : (
                      <div className="timeline-scroll-area">
                        <div className="cheating-timeline">
                          {selectedViolationDetail.events.slice(0, eventsLimit).map((event, idx) => (
                            <div key={event.proposalCheatingEventId || idx} className={`timeline-item ${eventItemClass(event.eventType)}`}>
                              <div className="timeline-badge" />
                              <div className="timeline-body">
                                <div className="flex flex-col gap-1 mb-1.5">
                                  <span className={`event-count-badge ${eventBadgeClass(event.eventType)}`}>
                                    {eventIcon(event.eventType)}
                                    {eventLabel(event.eventType)}
                                  </span>
                                  <span className="text-[10px] text-muted font-mono">{formatDate(event.occurredAt)}</span>
                                </div>
                                {event.jobPostQuestionId && (
                                  <p className="text-xs text-secondary font-medium font-mono">Q: {event.jobPostQuestionId}</p>
                                )}
                                <p className="text-[10px] text-muted mt-1 break-all">IP: {event.ipAddress || 'N/A'}</p>
                                {renderMetadata(event.metadata)}
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedViolationDetail.events.length > eventsLimit && (
                          <div className="flex justify-center mt-4 pb-2">
                            <button
                              type="button"
                              onClick={() => setEventsLimit(prev => prev + eventsIncrement)}
                              className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted/10 text-xs font-semibold text-[var(--gb-cyan)] flex items-center gap-1.5 transition-colors"
                            >
                              View More ({selectedViolationDetail.events.length - eventsLimit} remaining)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
