import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Edit3, AlertCircle, Search, Eye, X, Plus, Briefcase, Users,
  CheckCircle, Clock, Ban, Calendar, FileText,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import {
  JobPostStatus,
  type GetMyJobPostDto,
} from '../../../types/models/Job';
import '../styles/manage-job-posts-screen.css';

type StatusFilter = 'All' | 'Draft' | 'Open' | 'Closed' | 'Cancelled';

const STATUSES: StatusFilter[] = ['Draft', 'Open', 'Closed', 'Cancelled'];

const statusLabel = (status?: number | null): StatusFilter => {
  if (status === JobPostStatus.Draft) return 'Draft';
  if (status === JobPostStatus.Open) return 'Open';
  if (status === JobPostStatus.Closed) return 'Closed';
  if (status === JobPostStatus.Cancelled) return 'Cancelled';
  return 'Draft';
};

const statusValue = (status: StatusFilter): JobPostStatus => {
  if (status === 'Open') return JobPostStatus.Open;
  if (status === 'Closed') return JobPostStatus.Closed;
  if (status === 'Cancelled') return JobPostStatus.Cancelled;
  return JobPostStatus.Draft;
};

const BADGE_CLASS: Record<StatusFilter, string> = {
  Open: 'mjp-badge mjp-badge-open',
  Draft: 'mjp-badge mjp-badge-draft',
  Closed: 'mjp-badge mjp-badge-closed',
  Cancelled: 'mjp-badge mjp-badge-cancelled',
  All: 'mjp-badge mjp-badge-draft',
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatBudget = (job: GetMyJobPostDto) => {
  if (job.budgetMin !== undefined && job.budgetMin !== null && job.budgetMax !== undefined && job.budgetMax !== null) {
    return `$${job.budgetMin.toLocaleString()}-${job.budgetMax.toLocaleString()}`;
  }

  if (job.budgetMin !== undefined && job.budgetMin !== null) return `From $${job.budgetMin.toLocaleString()}`;
  if (job.budgetMax !== undefined && job.budgetMax !== null) return `Up to $${job.budgetMax.toLocaleString()}`;
  return 'Not set';
};

const skillNames = (job: GetMyJobPostDto) => [
  ...(job.skills || []).map(skill => skill.name),
  ...(job.customSkillNames || []),
];

export default function ManageJobPostsScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [toast, setToast] = useState<string | null>(null);
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);

    const response = await jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 });
    if (!response.success || !response.data) {
      setJobs([]);
      setError(response.message || 'Unable to load job posts.');
      setIsLoading(false);
      return;
    }

    setJobs(response.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filtered = useMemo(() =>
    jobs.filter(job => {
      const q = search.trim().toLowerCase();
      const searchableText = [
        job.title,
        job.description,
        job.majorName || '',
        job.categoryName || '',
        job.location || '',
        ...skillNames(job),
      ].join(' ').toLowerCase();
      const matchQ = !q || searchableText.includes(q);
      const matchS = filter === 'All' || statusLabel(job.status) === filter;
      return matchQ && matchS;
    }),
  [jobs, search, filter]);

  const counts = useMemo(() => ({
    All: jobs.length,
    Open: jobs.filter(job => statusLabel(job.status) === 'Open').length,
    Draft: jobs.filter(job => statusLabel(job.status) === 'Draft').length,
    Closed: jobs.filter(job => statusLabel(job.status) === 'Closed').length,
    Cancelled: jobs.filter(job => statusLabel(job.status) === 'Cancelled').length,
    proposals: jobs.reduce((total, job) => total + job.proposalCount, 0),
    views: 0,
  }), [jobs]);

  const handleChangeStatus = async (job: GetMyJobPostDto, newStatus: StatusFilter) => {
    setPendingJobId(job.jobPostsId);
    const response = await jobAPI.updateJobPostStatus(job.jobPostsId, { status: statusValue(newStatus) });
    setPendingJobId(null);

    if (!response.success) {
      setError(response.message || 'Unable to update job status.');
      return;
    }

    setJobs(prev => prev.map(item => item.jobPostsId === job.jobPostsId ? { ...item, status: statusValue(newStatus) } : item));
    showToast(`Status changed to ${newStatus}`);
  };

  const TABS: { key: StatusFilter; label: string; activeClass: string }[] = [
    { key: 'All', label: 'All Jobs', activeClass: 't-all' },
    { key: 'Open', label: 'Open', activeClass: 't-open' },
    { key: 'Draft', label: 'Draft', activeClass: 't-draft' },
    { key: 'Closed', label: 'Closed', activeClass: 't-closed' },
    { key: 'Cancelled', label: 'Cancelled', activeClass: 't-cancelled' },
  ];

  const STAT_CARDS = [
    { label: 'Total Jobs', value: counts.All, icon: <Briefcase size={18}/>, bg: 'mjp-bg-cyan', color: 'mjp-cyan' },
    { label: 'Open', value: counts.Open, icon: <CheckCircle size={18}/>, bg: 'mjp-bg-green', color: 'mjp-green' },
    { label: 'Draft', value: counts.Draft, icon: <FileText size={18}/>, bg: 'mjp-bg-gray', color: 'mjp-gray' },
    { label: 'Proposals', value: counts.proposals, icon: <Users size={18}/>, bg: 'mjp-bg-purple', color: 'mjp-purple' },
    { label: 'Closed', value: counts.Closed, icon: <Ban size={18}/>, bg: 'mjp-bg-gray', color: 'mjp-gray' },
  ];

  return (
    <AppLayout>
      <div className="mjp-mesh-bg mjp-scrollbar" style={{ padding: '32px 0 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <header style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Briefcase size={17} className="mjp-cyan" />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gb-cyan,#1782FC)' }}>
                Jobs Management
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f0f1a', margin: 0 }}>
                  Job Posts
                </h1>
                <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
                  Manage, track, and promote your backend JobPosts - {jobs.length} total
                </p>
              </div>
              <button
                onClick={() => navigate('/jobs/post')}
                className="mjp-btn mjp-btn-primary"
                style={{ padding: '10px 22px', fontSize: 13 }}
              >
                <Plus size={16} /> Post New Job
              </button>
            </div>
          </header>

          {toast && (
            <div className="mjp-toast">
              <CheckCircle size={16} /> {toast}
            </div>
          )}

          {error && (
            <div className="mjp-card" style={{ marginBottom: 24, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} /> {error}
              <button onClick={loadJobs} className="mjp-btn mjp-btn-red" style={{ marginLeft: 'auto' }}>Retry</button>
            </div>
          )}

          <div className="mjp-stat-grid" style={{ marginBottom: 28 }}>
            {STAT_CARDS.map(stat => (
              <div key={stat.label} className="mjp-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className={`mjp-stat-icon ${stat.bg}`}>
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                </div>
                <div>
                  <div className="mjp-stat-value">{stat.value}</div>
                  <div className="mjp-stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mjp-card mjp-filter-bar" style={{ marginBottom: 24 }}>
            <div className="mjp-search-wrap">
              <Search size={16} className="mjp-search-icon" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by title, major, category, skill..."
                className="mjp-input"
              />
              {search && (
                <button className="mjp-search-clear" onClick={() => setSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="mjp-glass mjp-tabs">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`mjp-tab ${filter === tab.key ? tab.activeClass : 'inactive'}`}
                >
                  {tab.label}
                  <span className="mjp-tab-count">{counts[tab.key]}</span>
                </button>
              ))}
            </div>

            <div style={{ width: '100%', fontSize: 12, color: '#9ca3af', fontWeight: 500, marginTop: 4 }}>
              Showing <strong style={{ color: '#374151' }}>{filtered.length}</strong> of {jobs.length} jobs
            </div>
          </div>

          {isLoading ? (
            <div className="mjp-card mjp-empty">
              <p style={{ fontSize: 14, color: '#6b7280' }}>Loading job posts...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mjp-card mjp-empty">
              <div className="mjp-empty-icon">
                <Briefcase size={36} className="mjp-cyan" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f0f1a', marginBottom: 6 }}>No jobs found</p>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                {search ? 'Try adjusting your search or filter.' : 'Create your first job post to get started.'}
              </p>
              {!search && (
                <button onClick={() => navigate('/jobs/post')} className="mjp-btn mjp-btn-primary">
                  <Plus size={15} /> Post a Job
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map(job => {
                const status = statusLabel(job.status);
                const isPending = pendingJobId === job.jobPostsId;

                return (
                  <div key={job.jobPostsId} className="mjp-card mjp-job-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <h3 className="mjp-job-title">{job.title}</h3>
                          <span className={BADGE_CLASS[status]}>{status}</span>
                          {job.majorName && <span className="mjp-featured">{job.majorName}</span>}
                          {job.categoryName && <span className="mjp-featured" style={{ background: 'rgba(23,130,252,0.1)', color: 'var(--gb-cyan,#1782FC)', borderColor: 'rgba(23,130,252,.22)' }}>{job.categoryName}</span>}
                        </div>
                        <p className="mjp-job-desc">{job.description}</p>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="mjp-budget">{formatBudget(job)}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Budget</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {(job.skills || []).map(skill => <span key={skill.skillId} className="mjp-tag">{skill.name}</span>)}
                      {(job.customSkillNames || []).map(skill => <span key={skill} className="mjp-tag">{skill} (custom)</span>)}
                    </div>

                    <hr className="mjp-divider" style={{ marginBottom: 14 }} />

                    <div className="mjp-meta-row" style={{ marginBottom: 14 }}>
                      <span className="mjp-meta-item">
                        <Users size={13} className="mjp-purple" />
                        <strong>{job.proposalCount}</strong> proposals
                      </span>
                      {job.estimatedDuration && (
                        <span className="mjp-meta-item">
                          <Clock size={13} className="mjp-amber" />
                          {job.estimatedDuration}
                        </span>
                      )}
                      <span className="mjp-meta-item">
                        <Calendar size={13} />
                        Posted {formatDate(job.createdAt)}
                      </span>
                    </div>

                    <hr className="mjp-divider" style={{ marginBottom: 14 }} />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)} className="mjp-btn mjp-btn-cyan">
                        <Eye size={14} /> View
                      </button>

                      <button onClick={() => navigate(`/jobs/${job.jobPostsId}/edit`)} className="mjp-btn mjp-btn-amber">
                        <Edit3 size={14} /> Edit
                      </button>

                      {status !== 'Closed' && (
                        <button
                          disabled={isPending}
                          onClick={() => handleChangeStatus(job, 'Closed')}
                          className="mjp-btn mjp-btn-gray"
                        >
                          <Ban size={14} /> Close Job
                        </button>
                      )}

                      {status !== 'Cancelled' && (
                        <button
                          disabled={isPending}
                          onClick={() => handleChangeStatus(job, 'Cancelled')}
                          className="mjp-btn mjp-btn-red"
                        >
                          <X size={14} /> Cancel
                        </button>
                      )}

                      <select
                        value={status}
                        disabled={isPending}
                        onChange={event => handleChangeStatus(job, event.target.value as StatusFilter)}
                        className="mjp-btn mjp-btn-gray"
                        style={{ marginLeft: 'auto' }}
                      >
                        {STATUSES.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
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
