import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Briefcase, Search, Plus, Eye, Users, Calendar,
  CheckCircle, Ban, XCircle, LayoutGrid, AlignJustify, FileText,
  HelpCircle, Send, Lock, Globe, UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import {
  JobPostStatus,
  JobPostVisibility,
  type GetMyJobPostDto,
} from '../../../types/models/Job';
import '../styles/my-jobs-screen.css';

type StatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled' | 'unknown';

const STATUS_FILTERS: { key: StatusFilter; label: string; activeClass: string }[] = [
  { key: 'all', label: 'All Jobs', activeClass: 'active-cyan' },
  { key: 'draft', label: 'Draft', activeClass: 'active-gray' },
  { key: 'open', label: 'Open', activeClass: 'active-green' },
  { key: 'closed', label: 'Closed', activeClass: 'active-gray' },
  { key: 'cancelled', label: 'Cancelled', activeClass: 'active-red' },
  { key: 'unknown', label: 'Unknown', activeClass: 'active-amber' },
];

const statusToFilter = (status?: number | null): StatusFilter => {
  if (status === JobPostStatus.Draft) return 'draft';
  if (status === JobPostStatus.Open) return 'open';
  if (status === JobPostStatus.Closed) return 'closed';
  if (status === JobPostStatus.Cancelled) return 'cancelled';
  return 'unknown';
};

const statusLabel = (status?: number | null) => {
  if (status === JobPostStatus.Draft) return 'Draft';
  if (status === JobPostStatus.Open) return 'Open';
  if (status === JobPostStatus.Closed) return 'Closed';
  if (status === JobPostStatus.Cancelled) return 'Cancelled';
  return 'Unknown';
};

const statusBadgeClass = (status?: number | null) => {
  if (status === JobPostStatus.Draft) return 'mj-badge-closed';
  if (status === JobPostStatus.Open) return 'mj-badge-open';
  if (status === JobPostStatus.Closed) return 'mj-badge-closed';
  if (status === JobPostStatus.Cancelled) return 'mj-badge-cancelled';
  return 'mj-badge-progress';
};

const visibilityLabel = (visibility?: number | null) => {
  if (visibility === JobPostVisibility.Public) return 'Public';
  if (visibility === JobPostVisibility.Private) return 'Private';
  if (visibility === JobPostVisibility.InviteOnly) return 'Invite Only';
  return 'Unknown';
};

const visibilityIcon = (visibility?: number | null) => {
  if (visibility === JobPostVisibility.Public) return <Globe size={13} />;
  if (visibility === JobPostVisibility.Private) return <Lock size={13} />;
  if (visibility === JobPostVisibility.InviteOnly) return <UserRoundCheck size={13} />;
  return <HelpCircle size={13} />;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatBudget = (job: GetMyJobPostDto) => {
  const min = job.budgetMin ?? null;
  const max = job.budgetMax ?? null;

  if (min !== null && max !== null) return `$${min.toLocaleString()}-${max.toLocaleString()}`;
  if (min !== null) return `From $${min.toLocaleString()}`;
  if (max !== null) return `Up to $${max.toLocaleString()}`;
  return 'Not set';
};

export default function MyJobsScreen() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCompact, setIsCompact] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);

    const response = await jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 });
    if (!response.success || !response.data) {
      setError(response.message || 'Unable to load your job posts.');
      setJobs([]);
      setIsLoading(false);
      return;
    }

    setJobs(response.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const counts = useMemo(() => {
    const base = {
      all: jobs.length,
      draft: 0,
      open: 0,
      closed: 0,
      cancelled: 0,
      unknown: 0,
    };

    for (const job of jobs) {
      base[statusToFilter(job.status)] += 1;
    }

    return base;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return jobs.filter(job => {
      const matchesSearch = !query ||
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        (job.categoryName || '').toLowerCase().includes(query) ||
        (job.location || '').toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || statusToFilter(job.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  const updateLocalJob = (jobPostId: string, patch: Partial<GetMyJobPostDto>) => {
    setJobs(prev => prev.map(job => job.jobPostsId === jobPostId ? { ...job, ...patch } : job));
  };

  const patchStatus = async (job: GetMyJobPostDto, status: JobPostStatus, successMessage: string) => {
    setPendingJobId(job.jobPostsId);
    const response = await jobAPI.updateJobPostStatus(job.jobPostsId, { status });
    setPendingJobId(null);

    if (!response.success) {
      toast.error(response.message || 'Unable to update JobPost status.');
      return;
    }

    updateLocalJob(job.jobPostsId, { status });
    toast.success(successMessage);
  };

  const patchVisibility = async (job: GetMyJobPostDto, visibility: JobPostVisibility) => {
    setPendingJobId(job.jobPostsId);
    const response = await jobAPI.updateJobPostVisibility(job.jobPostsId, { visibility });
    setPendingJobId(null);

    if (!response.success) {
      toast.error(response.message || 'Unable to update JobPost visibility.');
      return;
    }

    updateLocalJob(job.jobPostsId, { visibility });
    toast.success('Visibility updated.');
  };

  const canPublish = (job: GetMyJobPostDto) => job.status === JobPostStatus.Draft;
  const canClose = (job: GetMyJobPostDto) => job.status === JobPostStatus.Open;
  const canCancel = (job: GetMyJobPostDto) => job.status === JobPostStatus.Open || job.status === JobPostStatus.Draft;
  const canChangeVisibility = (job: GetMyJobPostDto) => job.visibility !== undefined && job.visibility !== null;

  return (
    <AppLayout>
      <div className="mj-custom-scrollbar" style={{ padding: '32px 0 64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <header style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={18} className="mj-cyan" />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gb-cyan,#1782FC)' }}>
                  Job Management
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ margin: 0 }}>
                My <span className="text-blue-600 black:text-blue-400 italic font-light">Job Posts</span>
              </h1>
              <p style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>
                Manage your created JobPosts using the current backend data.
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => navigate('/jobs/post')}
                className="mj-action-btn mj-btn-primary"
                style={{ padding: '10px 22px', fontSize: 13 }}
              >
                <Plus size={16} />
                Post New Job
              </button>
            </div>
          </header>

          <div className="mj-stat-grid" style={{ marginBottom: 32 }}>
            {[
              { label: 'Total Jobs', value: counts.all, icon: <Briefcase size={18} />, bg: 'mj-bg-cyan', color: 'mj-cyan' },
              { label: 'Open', value: counts.open, icon: <CheckCircle size={18} />, bg: 'mj-bg-green', color: 'mj-green' },
              { label: 'Draft', value: counts.draft, icon: <FileText size={18} />, bg: 'mj-bg-amber', color: 'mj-amber' },
              { label: 'Closed', value: counts.closed, icon: <Ban size={18} />, bg: 'mj-bg-gray', color: 'mj-gray' },
              { label: 'Unknown', value: counts.unknown, icon: <HelpCircle size={18} />, bg: 'mj-bg-purple', color: 'mj-purple' },
            ].map(stat => (
              <div key={stat.label} className="mj-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className={`mj-stat-icon-wrap ${stat.bg}`}>
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                </div>
                <div>
                  <div className="mj-stat-value">{stat.value}</div>
                  <div className="mj-stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mj-card mj-filter-bar" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search jobs, skills..."
                  className="mj-input"
                />
              </div>

              <div className="mj-glass" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`mj-tab-pill ${statusFilter === tab.key ? tab.activeClass : 'inactive'}`}
                  >
                    {tab.label}
                    {tab.key !== 'all' && (
                      <span style={{
                        background: statusFilter === tab.key ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.08)',
                        borderRadius: 999,
                        padding: '1px 6px',
                        fontSize: 10,
                      }}>
                        {counts[tab.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mj-glass" style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 10 }}>
                <button
                  onClick={() => setIsCompact(false)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: !isCompact ? 'var(--gb-cyan,#1782FC)' : 'transparent', color: !isCompact ? '#fff' : '#6b7280', transition: 'all 0.2s' }}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setIsCompact(true)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isCompact ? 'var(--gb-cyan,#1782FC)' : 'transparent', color: isCompact ? '#fff' : '#6b7280', transition: 'all 0.2s' }}
                >
                  <AlignJustify size={16} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
              Showing <strong style={{ color: '#374151' }}>{filteredJobs.length}</strong> of {jobs.length} jobs
            </div>
          </div>

          {isLoading ? (
            <div className="mj-card mj-empty">
              <p style={{ fontSize: 14, color: '#6b7280' }}>Loading your job posts...</p>
            </div>
          ) : error ? (
            <div className="mj-card mj-empty">
              <XCircle size={36} className="mj-red" />
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f0f1a', marginBottom: 6 }} className="black:text-white">Unable to load jobs</p>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{error}</p>
              <button onClick={loadJobs} className="mj-action-btn mj-btn-primary">Retry</button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="mj-card mj-empty">
              <div className="mj-empty-icon-wrap">
                <Briefcase size={36} className="mj-cyan" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f0f1a', marginBottom: 6 }} className="black:text-white">
                No jobs found
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                {searchQuery ? 'Try adjusting your search or filter.' : 'Start by posting your first job.'}
              </p>
              <button onClick={() => navigate('/jobs/post')} className="mj-action-btn mj-btn-primary">
                <Plus size={16} /> Post a Job
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredJobs.map(job => {
                const isPending = pendingJobId === job.jobPostsId;
                const statusKnown = job.status !== undefined && job.status !== null;

                return (
                  <div key={job.jobPostsId} className="mj-card mj-job-card" style={isCompact ? { padding: '16px 20px' } : {}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                          <h3 className="mj-job-title">{job.title}</h3>
                          <span className={`mj-badge ${statusBadgeClass(job.status)}`}>{statusLabel(job.status)}</span>
                          <span className="mj-badge mj-badge-progress" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {visibilityIcon(job.visibility)} {visibilityLabel(job.visibility)}
                          </span>
                        </div>
                        {!isCompact && (
                          <p className="mj-job-desc" style={{ marginBottom: 12 }}>{job.description}</p>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {job.categoryName && <span className="mj-skill-tag">{job.categoryName}</span>}
                          {job.location && <span className="mj-skill-tag">{job.location}</span>}
                          {job.estimatedDuration && <span className="mj-skill-tag">{job.estimatedDuration}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="mj-budget-value">{formatBudget(job)}</div>
                        <div className="mj-budget-label">Budget</div>
                      </div>
                    </div>

                    {!isCompact && <hr className="mj-divider" style={{ marginBottom: 16 }} />}
                    <div className="mj-meta-grid" style={isCompact ? { marginTop: 10 } : {}}>
                      <div>
                        <div className="mj-meta-label">Proposals</div>
                        <div className="mj-meta-value mj-purple">
                          <Users size={13} /> {job.proposalCount}
                        </div>
                      </div>
                      <div>
                        <div className="mj-meta-label">Status</div>
                        <div className="mj-meta-value">
                          <CheckCircle size={13} /> {statusLabel(job.status)}
                        </div>
                      </div>
                      <div>
                        <div className="mj-meta-label">Posted</div>
                        <div className="mj-meta-value">
                          <Calendar size={13} /> {formatDate(job.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div className="mj-meta-label">Visibility</div>
                        <div className="mj-meta-value">
                          {visibilityIcon(job.visibility)} {visibilityLabel(job.visibility)}
                        </div>
                      </div>
                    </div>

                    <hr className="mj-divider" style={{ margin: '16px 0' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)} className="mj-action-btn mj-btn-cyan">
                        <Eye size={14} /> View Detail
                      </button>
                      <button onClick={() => navigate(`/client/job-posts/${job.jobPostsId}/questions`)} className="mj-action-btn mj-btn-cyan">
                        <HelpCircle size={14} /> Manage Questions
                      </button>
                      {canPublish(job) && (
                        <button
                          onClick={() => patchStatus(job, JobPostStatus.Open, 'JobPost published.')}
                          disabled={isPending}
                          className="mj-action-btn mj-btn-green"
                        >
                          <Send size={14} /> Publish
                        </button>
                      )}
                      {canClose(job) && (
                        <button
                          onClick={() => patchStatus(job, JobPostStatus.Closed, 'JobPost closed.')}
                          disabled={isPending}
                          className="mj-action-btn mj-btn-green"
                        >
                          <Ban size={14} /> Close
                        </button>
                      )}
                      {canCancel(job) && (
                        <button
                          onClick={() => patchStatus(job, JobPostStatus.Cancelled, 'JobPost cancelled.')}
                          disabled={isPending}
                          className="mj-action-btn mj-btn-red"
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      )}
                      {!statusKnown && (
                        <span className="text-xs text-muted-foreground">Status-specific actions are unavailable until the backend returns status.</span>
                      )}
                      {canChangeVisibility(job) ? (
                        <select
                          value={job.visibility ?? ''}
                          onChange={event => patchVisibility(job, Number(event.target.value) as JobPostVisibility)}
                          disabled={isPending}
                          className="mj-action-btn"
                          style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.04)', color: '#374151' }}
                        >
                          <option value={JobPostVisibility.Public}>Public</option>
                          <option value={JobPostVisibility.Private}>Private</option>
                          <option value={JobPostVisibility.InviteOnly}>Invite Only</option>
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Visibility update unavailable until the backend returns visibility.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
