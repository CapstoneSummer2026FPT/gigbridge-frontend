import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Ban,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Eye,
  HelpCircle,
  LayoutGrid,
  AlignJustify,
  Plus,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI, jobPutAPI } from '../../../api/jobAPI';
import {
  JobStatus,
  type JobPostSummaryDto,
} from '../../../types/models/Job';
import '../styles/my-jobs-screen.css';

type JobStatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled' | 'unknown';

interface MyJob {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: JobStatus | null;
  visibility: number | null;
  proposalsCount: number;
  viewsCount: number;
  createdAt: string;
  skills: string[];
}

const validStatusValues = new Set<number>([
  JobStatus.Draft,
  JobStatus.Open,
  JobStatus.Closed,
  JobStatus.Cancelled,
]);

const getKnownStatus = (status?: JobStatus | number | null): JobStatus | null => {
  if (typeof status !== 'number' || !validStatusValues.has(status)) {
    return null;
  }

  return status as JobStatus;
};

const getVisibility = (visibility?: number | null): number | null =>
  typeof visibility === 'number' ? visibility : null;

const getStatusFilterValue = (status: JobStatus | null): JobStatusFilter => {
  if (status === JobStatus.Draft) return 'draft';
  if (status === JobStatus.Open) return 'open';
  if (status === JobStatus.Closed) return 'closed';
  if (status === JobStatus.Cancelled) return 'cancelled';
  return 'unknown';
};

const getStatusLabel = (status: JobStatus | null) => {
  if (status === JobStatus.Draft) return 'Draft';
  if (status === JobStatus.Open) return 'Open';
  if (status === JobStatus.Closed) return 'Closed';
  if (status === JobStatus.Cancelled) return 'Cancelled';
  return 'Unknown';
};

const getVisibilityLabel = (visibility: number | null) => {
  if (visibility === 0) return 'Public';
  if (visibility === 1) return 'Private';
  if (visibility === 2) return 'InviteOnly';
  return 'Unknown';
};

const STATUS_BADGE: Record<string, string> = {
  draft:     'mj-badge-draft',
  open:      'mj-badge-open',
  closed:    'mj-badge-closed',
  cancelled: 'mj-badge-cancelled',
  unknown:   'mj-badge-unknown',
};

const mapSummaryToMyJob = (job: JobPostSummaryDto): MyJob => ({
  id: job.jobPostsId,
  title: job.title,
  description: job.descriptionPreview,
  budget: job.budgetMax || job.budgetMin || 0,
  status: getKnownStatus(job.status),
  visibility: getVisibility(job.visibility),
  proposalsCount: 0,
  viewsCount: 0,
  createdAt: job.createdAt || new Date().toISOString(),
  skills: job.skillNames || [],
});

const STATUS_TABS: { key: JobStatusFilter; label: string; activeClass: string }[] = [
  { key: 'all',       label: 'All Jobs',   activeClass: 'active-cyan'  },
  { key: 'draft',     label: 'Draft',      activeClass: 'active-amber' },
  { key: 'open',      label: 'Open',       activeClass: 'active-green' },
  { key: 'closed',    label: 'Closed',     activeClass: 'active-gray'  },
  { key: 'cancelled', label: 'Cancelled',  activeClass: 'active-red'   },
  { key: 'unknown',   label: 'Unknown',    activeClass: 'active-amber' },
];

export default function MyJobsScreen() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');
  const [isCompact, setIsCompact] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState<MyJob | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<MyJob | null>(null);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await jobGetAPI.getMyJobPosts();

      if (!response.success) {
        setError(response.message || 'Failed to load your job posts. Please try again.');
        return;
      }

      setJobs((response.data || []).map(mapSummaryToMyJob));
    } catch (fetchError) {
      console.error('Failed to fetch my jobs:', fetchError);
      setError('Failed to load your job posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const stats = useMemo(() => {
    const draft = jobs.filter(job => job.status === JobStatus.Draft).length;
    const open = jobs.filter(job => job.status === JobStatus.Open).length;
    const closed = jobs.filter(job => job.status === JobStatus.Closed).length;
    const cancelled = jobs.filter(job => job.status === JobStatus.Cancelled).length;
    const unknown = jobs.filter(job => job.status === null).length;
    const totalProposals = jobs.reduce((sum, job) => sum + job.proposalsCount, 0);
    const totalViews = jobs.reduce((sum, job) => sum + job.viewsCount, 0);

    return {
      draft,
      open,
      closed,
      cancelled,
      unknown,
      totalProposals,
      totalViews,
      total: jobs.length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const search = searchQuery.toLowerCase();

      const matchesSearch =
        searchQuery === '' ||
        job.title.toLowerCase().includes(search) ||
        job.description.toLowerCase().includes(search) ||
        job.skills.some(skill => skill.toLowerCase().includes(search));

      const matchesStatus =
        statusFilter === 'all' || getStatusFilterValue(job.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const updateJobStatus = async (
    jobId: string,
    status: JobStatus,
    successMessage: string
  ) => {
    try {
      setUpdatingJobId(jobId);
      setError('');

      const response = await jobPutAPI.updateJobPostStatus(jobId, { status });

      if (!response.success) {
        setError(response.message || 'Failed to update JobPost status.');
        return;
      }

      setJobs(prev =>
        prev.map(job => job.id === jobId ? { ...job, status } : job)
      );
      toast.success(successMessage);
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
      setError('Failed to update JobPost status. Please try again.');
    } finally {
      setUpdatingJobId(null);
      setShowCloseModal(null);
      setShowCancelModal(null);
    }
  };

  const updateJobVisibility = async (jobId: string, visibility: number) => {
    try {
      setUpdatingJobId(jobId);
      setError('');

      const response = await jobPutAPI.updateJobPostVisibility(jobId, { visibility });

      if (!response.success) {
        setError(response.message || 'Failed to update JobPost visibility.');
        return;
      }

      setJobs(prev =>
        prev.map(job => job.id === jobId ? { ...job, visibility } : job)
      );
      toast.success('JobPost visibility updated successfully.');
    } catch (updateError) {
      console.error('Failed to update job visibility:', updateError);
      setError('Failed to update JobPost visibility. Please try again.');
    } finally {
      setUpdatingJobId(null);
    }
  };

  const navigateToQuestions = (job: MyJob) => {
    navigate(`/client/job-posts/${job.id}/questions`, {
      state: {
        status: job.status,
        title: job.title,
      },
    });
  };

  const STAT_CARDS = [
    { label: 'Total Jobs',    value: stats.total,          icon: <Briefcase   size={18}/>, bg: 'mj-bg-cyan',   color: 'mj-cyan'   },
    { label: 'Draft',         value: stats.draft,          icon: <Clock       size={18}/>, bg: 'mj-bg-amber',  color: 'mj-amber'  },
    { label: 'Open',          value: stats.open,           icon: <CheckCircle size={18}/>, bg: 'mj-bg-green',  color: 'mj-green'  },
    { label: 'Closed',        value: stats.closed,         icon: <XCircle     size={18}/>, bg: 'mj-bg-gray',   color: 'mj-gray'   },
    { label: 'Unknown',       value: stats.unknown,        icon: <HelpCircle  size={18}/>, bg: 'mj-bg-amber',  color: 'mj-amber'  },
    { label: 'Proposals',     value: stats.totalProposals,  icon: <Users      size={18}/>, bg: 'mj-bg-purple', color: 'mj-purple' },
  ];

  return (
    <AppLayout>
      <div className="mj-custom-scrollbar" style={{ padding: '32px 0 64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

          {/* ── Page Header ── */}
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
                Manage, track, and analyse all your project listings in one place.
              </p>
            </div>

            {/* Post Job CTA */}
            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => navigate('/jobs/post/questions')}
                className="mj-action-btn mj-btn-primary"
                style={{ padding: '10px 22px', fontSize: 13 }}
              >
                <Plus size={16} />
                Post New Job
              </button>
            </div>
          </header>

          {/* ── Stat Cards ── */}
          <div className="mj-stat-grid" style={{ marginBottom: 32 }}>
            {STAT_CARDS.map(s => (
              <div key={s.label} className="mj-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className={`mj-stat-icon-wrap ${s.bg}`}>
                    <span className={s.color}>{s.icon}</span>
                  </div>
                </div>
                <div>
                  <div className="mj-stat-value">{s.value}</div>
                  <div className="mj-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter Bar ── */}
          <div className="mj-card mj-filter-bar" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search jobs, skills..."
                  className="mj-input"
                />
              </div>

              {/* Status Tabs */}
              <div className="mj-glass" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, flexWrap: 'wrap' }}>
                {STATUS_TABS.map(tab => (
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
                        {tab.key === 'draft' ? stats.draft
                          : tab.key === 'open' ? stats.open
                          : tab.key === 'closed' ? stats.closed
                          : tab.key === 'cancelled' ? stats.cancelled
                          : stats.unknown}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Layout Toggle */}
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

            {/* Results count */}
            <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
              Showing <strong style={{ color: '#374151' }}>{filteredJobs.length}</strong> of {jobs.length} jobs
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mj-card" style={{ padding: 16, marginBottom: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#ef4444', marginBottom: 12 }}>{error}</p>
              <button className="mj-action-btn mj-btn-cyan" onClick={fetchMyJobs}>
                Retry
              </button>
            </div>
          )}

          {/* ── Jobs List ── */}
          {loading ? (
            <div className="mj-card mj-empty">
              <div className="mj-empty-icon-wrap">
                <Briefcase size={36} className="mj-cyan" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f0f1a', marginBottom: 6 }} className="black:text-white">
                Loading jobs...
              </p>
              <p style={{ fontSize: 14, color: '#6b7280' }}>
                Please wait while we fetch your JobPosts.
              </p>
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
              <button onClick={() => navigate('/jobs/post/questions')} className="mj-action-btn mj-btn-primary">
                <Plus size={16} /> Post a Job
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredJobs.map(job => (
                <div key={job.id} className="mj-card mj-job-card" style={isCompact ? { padding: '16px 20px' } : {}}>

                  {/* Top row: title + badge + budget */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h3 className="mj-job-title">{job.title}</h3>
                        <span className={`mj-badge ${STATUS_BADGE[getStatusFilterValue(job.status)] || 'mj-badge-unknown'}`}>
                          {getStatusLabel(job.status)}
                        </span>
                        <span className="mj-badge mj-badge-cyan">
                          {getVisibilityLabel(job.visibility)}
                        </span>
                      </div>
                      {!isCompact && (
                        <p className="mj-job-desc" style={{ marginBottom: 12 }}>{job.description}</p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {job.skills.slice(0, 5).map(skill => (
                          <span key={skill} className="mj-skill-tag">{skill}</span>
                        ))}
                        {job.skills.length > 5 && (
                          <span className="mj-skill-tag" style={{ opacity: 0.6 }}>+{job.skills.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="mj-budget-value">${job.budget.toLocaleString()}</div>
                      <div className="mj-budget-label">Fixed Price</div>
                    </div>
                  </div>

                  {/* Meta row */}
                  {!isCompact && <hr className="mj-divider" style={{ marginBottom: 16 }} />}
                  <div className="mj-meta-grid" style={isCompact ? { marginTop: 10 } : {}}>
                    <div>
                      <div className="mj-meta-label">Proposals</div>
                      <div className="mj-meta-value mj-purple">
                        <Users size={13} /> {job.proposalsCount}
                      </div>
                    </div>
                    <div>
                      <div className="mj-meta-label">Views</div>
                      <div className="mj-meta-value mj-cyan">
                        <Eye size={13} /> {job.viewsCount}
                      </div>
                    </div>
                    <div>
                      <div className="mj-meta-label">Posted</div>
                      <div className="mj-meta-value">
                        <Calendar size={13} /> {formatDate(job.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div className="mj-meta-label">Status</div>
                      <div className="mj-meta-value">
                        {getStatusLabel(job.status)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <hr className="mj-divider" style={{ margin: '16px 0' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => navigate(`/jobs/${job.id}`)} className="mj-action-btn mj-btn-cyan">
                      <Eye size={14} /> View Details
                    </button>

                    <button onClick={() => navigateToQuestions(job)} className="mj-action-btn mj-btn-cyan">
                      <HelpCircle size={14} /> Manage Questions
                    </button>

                    <select
                      value={job.visibility ?? ''}
                      onChange={event => updateJobVisibility(job.id, Number(event.target.value))}
                      disabled={updatingJobId === job.id}
                      className="mj-input"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                      title="Update visibility"
                    >
                      <option value="" disabled>Visibility</option>
                      <option value="0">Public</option>
                      <option value="1">Private</option>
                      <option value="2">InviteOnly</option>
                    </select>

                    {job.status === JobStatus.Draft && (
                      <button
                        onClick={() => updateJobStatus(job.id, JobStatus.Open, 'JobPost published successfully.')}
                        disabled={updatingJobId === job.id}
                        className="mj-action-btn mj-btn-green"
                      >
                        <CheckCircle size={14} /> Publish
                      </button>
                    )}

                    {job.proposalsCount > 0 && (
                      <button onClick={() => navigate(`/proposals?job=${job.id}`)} className="mj-action-btn mj-btn-cyan">
                        <Users size={14} /> Proposals ({job.proposalsCount})
                      </button>
                    )}

                    {job.status === JobStatus.Open && (
                      <>
                        <button onClick={() => navigate(`/jobs/edit/${job.id}`)} className="mj-action-btn mj-btn-cyan">
                          <Edit size={14} /> Edit
                        </button>
                        <button onClick={() => setShowCloseModal(job)} className="mj-action-btn mj-btn-green">
                          <CheckCircle size={14} /> Mark Closed
                        </button>
                        <button onClick={() => setShowCancelModal(job)} className="mj-action-btn mj-btn-red">
                          <Ban size={14} /> Cancel
                        </button>
                      </>
                    )}

                    {/* Compact: show budget badge on the right */}
                    {isCompact && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontWeight: 700, fontSize: 14 }}>
                        <DollarSign size={14} /> ${job.budget.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Close Job Modal ── */}
      {showCloseModal && (
        <div className="mj-modal-overlay" onClick={() => setShowCloseModal(null)}>
          <div className="mj-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div className="mj-modal-icon-wrap mj-bg-green">
                <CheckCircle size={24} className="mj-green" />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f0f1a', margin: 0 }} className="black:text-white">Close Job Posting</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>Mark this job as successfully completed</p>
              </div>
            </div>

            <div className="mj-modal-info-box" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f0f1a', marginBottom: 4 }} className="black:text-white">{showCloseModal.title}</p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>ID: {showCloseModal.id}</p>
            </div>

            <div className="mj-modal-warn-green" style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 6 }}>Closing this job will:</p>
              <ul style={{ fontSize: 12, color: '#15803d', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                <li>Stop accepting new proposals</li>
                <li>Mark the job as successfully completed</li>
                <li>Hide it from job search results</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCloseModal(null)} className="mj-action-btn" style={{ flex: 1, justifyContent: 'center', padding: '11px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => updateJobStatus(
                  showCloseModal.id,
                  JobStatus.Closed,
                  'JobPost closed successfully.'
                )}
                disabled={updatingJobId === showCloseModal.id}
                className="mj-action-btn mj-btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '11px', fontSize: 14 }}
              >
                <CheckCircle size={16} /> Close Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Job Modal ── */}
      {showCancelModal && (
        <div className="mj-modal-overlay" onClick={() => setShowCancelModal(null)}>
          <div className="mj-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div className="mj-modal-icon-wrap mj-bg-red">
                <Ban size={24} className="mj-red" />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f0f1a', margin: 0 }} className="black:text-white">Cancel Job Posting</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>This action cannot be undone</p>
              </div>
            </div>

            <div className="mj-modal-info-box" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f0f1a', marginBottom: 4 }} className="black:text-white">{showCancelModal.title}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>ID: {showCancelModal.id}</p>
              <p style={{ fontSize: 12, color: '#6b7280' }}>{showCancelModal.proposalsCount} proposals received</p>
            </div>

            <div className="mj-modal-warn-red" style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>⚠ Warning</p>
              <p style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.7 }}>
                Cancelling this job will permanently remove it and notify all freelancers who submitted proposals.
                Consider closing it instead if the work was completed.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCancelModal(null)} className="mj-action-btn" style={{ flex: 1, justifyContent: 'center', padding: '11px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                Keep Job
              </button>
              <button
                onClick={() => updateJobStatus(
                  showCancelModal.id,
                  JobStatus.Cancelled,
                  'JobPost cancelled successfully.'
                )}
                disabled={updatingJobId === showCancelModal.id}
                className="mj-action-btn mj-btn-red"
                style={{ flex: 1, justifyContent: 'center', padding: '11px', fontSize: 14, borderRadius: 12, background: '#EF4444', color: '#fff', border: 'none' }}
              >
                <Ban size={16} /> Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
