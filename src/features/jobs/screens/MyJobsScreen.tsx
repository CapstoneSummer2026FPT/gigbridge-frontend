import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Ban,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  HelpCircle,
  Plus,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Briefcase, Search, Plus, Edit, Eye, Users, Calendar,
  CheckCircle, Clock, Ban, XCircle, TrendingUp, DollarSign,
  Sparkles, ChevronDown, LayoutGrid, AlignJustify, FileText,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI, jobPutAPI } from '../../../api/jobAPI';
import {
  JobStatus,
  type JobPostSummaryDto,
} from '../../../types/models/Job';
import '../../admin/styles/admin-users-screen.css';
import { useApp } from '../../../app/providers/AppProvider';
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
const MOCK_JOBS: MyJob[] = [
  {
    id: 'job_1',
    title: 'E-commerce Website Development',
    description: 'Looking for an experienced web developer to build a modern e-commerce platform with React and Node.js. Must have strong knowledge of payment integrations and scalable architecture.',
    budget: 5000,
    status: 'open',
    proposalsCount: 12,
    viewsCount: 145,
    createdAt: '2026-05-10T10:00:00Z',
    deadline: '2026-06-10T10:00:00Z',
    skills: ['React', 'Node.js', 'MongoDB', 'Payment Integration'],
  },
  {
    id: 'job_2',
    title: 'Mobile App UI/UX Design',
    description: 'Need a creative designer for a fitness tracking mobile app. Must have experience with modern design trends and interactive prototyping.',
    budget: 2800,
    status: 'in_progress',
    proposalsCount: 8,
    viewsCount: 98,
    createdAt: '2026-05-05T14:30:00Z',
    skills: ['Figma', 'UI/UX', 'Mobile Design', 'Prototyping'],
  },
  {
    id: 'job_3',
    title: 'SEO Optimization for Blog',
    description: 'Looking for SEO expert to optimize our tech blog for better search rankings. Focus on on-page SEO, backlink strategy, and performance analytics.',
    budget: 1200,
    status: 'closed',
    proposalsCount: 15,
    viewsCount: 203,
    createdAt: '2026-04-20T09:00:00Z',
    skills: ['SEO', 'Content Writing', 'Analytics', 'Keyword Research'],
  },
  {
    id: 'job_4',
    title: 'Data Analysis Project',
    description: 'Need data analyst to work on customer behavior analysis using Python and SQL. Deliverables include dashboards and written insights.',
    budget: 3500,
    status: 'cancelled',
    proposalsCount: 6,
    viewsCount: 67,
    createdAt: '2026-04-15T11:00:00Z',
    skills: ['Python', 'SQL', 'Data Visualization', 'Statistics'],
  },
  {
    id: 'job_5',
    title: 'Brand Identity Design',
    description: 'Looking for a skilled brand designer to create a comprehensive brand identity including logo, color palette, typography, and brand guidelines.',
    budget: 1800,
    status: 'open',
    proposalsCount: 5,
    viewsCount: 82,
    createdAt: '2026-06-01T08:00:00Z',
    deadline: '2026-07-01T08:00:00Z',
    skills: ['Branding', 'Logo Design', 'Illustrator', 'Typography'],
  },
];

const STATUS_TABS: { key: JobStatus; label: string; activeClass: string }[] = [
  { key: 'all',         label: 'All Jobs',    activeClass: 'active-cyan'   },
  { key: 'open',        label: 'Open',        activeClass: 'active-green'  },
  { key: 'in_progress', label: 'In Progress', activeClass: 'active-amber'  },
  { key: 'closed',      label: 'Closed',      activeClass: 'active-gray'   },
  { key: 'cancelled',   label: 'Cancelled',   activeClass: 'active-red'    },
];

const STATUS_BADGE: Record<string, string> = {
  open:        'mj-badge-open',
  in_progress: 'mj-badge-progress',
  closed:      'mj-badge-closed',
  cancelled:   'mj-badge-cancelled',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', closed: 'Closed', cancelled: 'Cancelled',
};

export default function MyJobsScreen() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all');
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
    const unknown = jobs.filter(job => job.status === null).length;
    const totalProposals = jobs.reduce((sum, job) => sum + job.proposalsCount, 0);

    return {
      draft,
      open,
      closed,
      unknown,
      totalProposals,
      total: jobs.length,
    };
  }, [jobs]);
    const open        = MOCK_JOBS.filter(j => j.status === 'open').length;
    const inProgress  = MOCK_JOBS.filter(j => j.status === 'in_progress').length;
    const closed      = MOCK_JOBS.filter(j => j.status === 'closed').length;
    const cancelled   = MOCK_JOBS.filter(j => j.status === 'cancelled').length;
    const totalProposals = MOCK_JOBS.reduce((s, j) => s + j.proposalsCount, 0);
    const totalViews     = MOCK_JOBS.reduce((s, j) => s + j.viewsCount, 0);
    return { open, inProgress, closed, cancelled, totalProposals, totalViews, total: MOCK_JOBS.length };
  }, []);

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

    return MOCK_JOBS.filter(job => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.skills.some(s => s.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  const getStatusBadge = (status: JobStatus | null) => {
    if (status === JobStatus.Draft) return <span className="badge-gray text-xs">Draft</span>;
    if (status === JobStatus.Open) return <span className="badge-green text-xs">Open</span>;
    if (status === JobStatus.Closed) return <span className="badge-gray text-xs">Closed</span>;
    if (status === JobStatus.Cancelled) return <span className="badge-red text-xs">Cancelled</span>;
    return <span className="badge-amber text-xs">Unknown</span>;
  };

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
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
  const handleCloseJob  = (id: string) => { console.log('Closing:', id); setShowCloseModal(null); };
  const handleCancelJob = (id: string) => { console.log('Cancelling:', id); setShowCancelModal(null); };

  const STAT_CARDS = [
    { label: 'Total Jobs',    value: stats.total,         icon: <Briefcase  size={18}/>, bg: 'mj-bg-cyan',   color: 'mj-cyan'   },
    { label: 'Open',          value: stats.open,          icon: <CheckCircle size={18}/>, bg: 'mj-bg-green', color: 'mj-green'  },
    { label: 'In Progress',   value: stats.inProgress,    icon: <Clock      size={18}/>, bg: 'mj-bg-amber',  color: 'mj-amber'  },
    { label: 'Total Proposals', value: stats.totalProposals, icon: <Users  size={18}/>, bg: 'mj-bg-purple',  color: 'mj-purple' },
    { label: 'Total Views',   value: stats.totalViews,    icon: <Eye        size={18}/>, bg: 'mj-bg-cyan',   color: 'mj-cyan'   },
  ];

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">My Jobs</span>
      <div className="mj-mesh-bg mj-custom-scrollbar" style={{ padding: '32px 0 64px' }}>
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
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Job Posts</h1>
              <p className="text-sm text-secondary mt-1">Manage your JobPosts, visibility, status, and questions</p>
              <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f0f1a', margin: 0 }}
                className="black:text-white">
                My Job Posts
              </h1>
              <p style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>
                Manage, track, and analyse all your project listings in one place.
              </p>
            </div>

            <button
              onClick={() => navigate('/jobs/post/questions')}
              className="btn-cyan px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Post New Job
            </button>
          </div>

            {/* Post Job CTA */}
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

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 mb-8">
            {[
              { label: 'Total Jobs', value: stats.total.toString(), icon: <Briefcase size={16} />, color: 'cyan' },
              { label: 'Draft', value: stats.draft.toString(), icon: <Clock size={16} />, color: 'amber' },
              { label: 'Open', value: stats.open.toString(), icon: <CheckCircle size={16} />, color: 'green' },
              { label: 'Closed', value: stats.closed.toString(), icon: <XCircle size={16} />, color: 'gray' },
              { label: 'Unknown', value: stats.unknown.toString(), icon: <HelpCircle size={16} />, color: 'purple' },
              { label: 'Proposals', value: stats.totalProposals.toString(), icon: <Users size={16} />, color: 'purple' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>
                    {stat.icon}
                  </span>
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
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Filter Bar ── */}
          <div className="mj-card mj-filter-bar" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search jobs..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search jobs, skills..."
                  className="mj-input"
                />
              </div>
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as JobStatusFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
                <option value="unknown">Unknown</option>
              </select>

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
                        {tab.key === 'open' ? stats.open
                          : tab.key === 'in_progress' ? stats.inProgress
                          : tab.key === 'closed' ? stats.closed
                          : stats.cancelled}
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
              Showing <strong style={{ color: '#374151' }}>{filteredJobs.length}</strong> of {MOCK_JOBS.length} jobs
            </div>
          </div>

          {error && (
            <div className="glass-card p-4 mb-6 text-center">
              <p className="text-sm text-red mb-3">{error}</p>
              <button className="btn-ghost-cyan px-4 py-2 text-xs" onClick={fetchMyJobs}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="glass-card p-12 text-center">
              <Briefcase size={48} className="mx-auto mb-4 text-muted" />
              <p className="text-lg font-semibold text-primary mb-2">
                Loading jobs...
              </p>
              <p className="text-sm text-secondary">
                Please wait while we fetch your JobPosts.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <div key={job.id} className="glass-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-primary">
                          {job.title}
                        </h3>
                        {getStatusBadge(job.status)}
                        <span className="badge-cyan text-xs">
                          {getVisibilityLabel(job.visibility)}
                        </span>
                      </div>

                      <p className="text-sm text-secondary mb-3 line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.skills.slice(0, 4).map(skill => (
                          <span key={skill} className="tag-pill text-xs">
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 4 && (
                          <span className="tag-pill text-xs">
                            +{job.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-green">
                        ${job.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-xs text-muted mb-1">Proposals</p>
                      <p className="text-sm font-semibold text-primary flex items-center gap-1">
                        <Users size={14} />
                        {job.proposalsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Views</p>
                      <p className="text-sm font-semibold text-primary flex items-center gap-1">
                        <Eye size={14} />
                        {job.viewsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Created</p>
                      <p className="text-sm font-semibold text-primary flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(job.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Status</p>
                      <p className="text-sm font-semibold text-primary">
                        {getStatusLabel(job.status)}
                      </p>
                    </div>
                  </div>
          {/* ── Jobs List ── */}
          {filteredJobs.length === 0 ? (
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
              {filteredJobs.map(job => (
                <div key={job.id} className="mj-card mj-job-card" style={isCompact ? { padding: '16px 20px' } : {}}>

                  {/* Top row: title + badge + budget */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h3 className="mj-job-title">{job.title}</h3>
                        <span className={`mj-badge ${STATUS_BADGE[job.status]}`}>
                          {STATUS_LABEL[job.status]}
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
                    {job.deadline && (
                      <div>
                        <div className="mj-meta-label">Deadline</div>
                        <div className="mj-meta-value mj-amber">
                          <Calendar size={13} /> {formatDate(job.deadline)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/5">
                    <button
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      View Details
                    </button>

                    <button
                      onClick={() => navigateToQuestions(job)}
                      className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-1.5"
                    >
                      <HelpCircle size={14} />
                      Manage Questions
                    </button>

                    <select
                      value={job.visibility ?? ''}
                      onChange={event => updateJobVisibility(job.id, Number(event.target.value))}
                      disabled={updatingJobId === job.id}
                      className="input-gb px-3 py-2 text-xs cursor-pointer disabled:opacity-40"
                      title="Update visibility"
                    >
                      <option value="" disabled>Visibility Unknown</option>
                      <option value="0">Public</option>
                      <option value="1">Private</option>
                      <option value="2">InviteOnly</option>
                    </select>

                    {job.status === JobStatus.Draft && (
                      <button
                        onClick={() => updateJobStatus(job.id, JobStatus.Open, 'JobPost published successfully.')}
                        disabled={updatingJobId === job.id}
                        className="btn-green px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <CheckCircle size={14} />
                        Publish
                      </button>
                    )}

                    {job.proposalsCount > 0 && (
                      <button
                        onClick={() => navigate(`/proposals?job=${job.id}`)}
                        className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-1.5"
                      >
                        <Users size={14} />
                        View Proposals ({job.proposalsCount})
                      </button>
                    )}

                    {job.status === JobStatus.Open && (
                      <>
                        <button
                          onClick={() => navigate(`/jobs/edit/${job.id}`)}
                          className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-1.5"
                        >
                          <Edit size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() => setShowCloseModal(job)}
                          className="btn-ghost-green px-4 py-2 text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} />
                          Mark as Closed
                        </button>

                        <button
                          onClick={() => setShowCancelModal(job)}
                          className="btn-ghost-red px-4 py-2 text-xs flex items-center gap-1.5"
                        >
                          <Ban size={14} />
                          Cancel Job
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <Briefcase size={48} className="mx-auto mb-4 text-muted" />
                  <p className="text-lg font-semibold text-primary mb-2">
                    No jobs found
                  </p>
                  <p className="text-sm text-secondary mb-6">
                    Start by creating your question set and JobPost details.
                  </p>
                  <button
                    onClick={() => navigate('/jobs/post/questions')}
                    className="btn-cyan px-6 py-3"
                  >
                    Post a Job
                  </button>
                </div>
              )}
            </div>
          )}
                  {/* Action Buttons */}
                  <hr className="mj-divider" style={{ margin: '16px 0' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => navigate(`/jobs/${job.id}`)} className="mj-action-btn mj-btn-cyan">
                      <Eye size={14} /> View Details
                    </button>
                    {job.proposalsCount > 0 && (
                      <button onClick={() => navigate(`/proposals?job=${job.id}`)} className="mj-action-btn mj-btn-cyan">
                        <Users size={14} /> Proposals ({job.proposalsCount})
                      </button>
                    )}
                    {job.status === 'open' && (
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCloseModal(null)}
        >
          <div
            className="glass-card max-w-lg w-full p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green/20 flex items-center justify-center">
                <CheckCircle size={24} className="text-green" />
        <div className="mj-modal-overlay" onClick={() => setShowCloseModal(null)}>
          <div className="mj-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div className="mj-modal-icon-wrap mj-bg-green">
                <CheckCircle size={24} className="mj-green" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Close JobPost
                </h2>
                <p className="text-xs text-muted">
                  Mark this JobPost as closed
                </p>
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
            <div className="glass-card p-4 mb-6">
              <p className="text-sm font-bold text-primary mb-2">
                {showCloseModal.title}
              </p>
              <p className="text-xs text-secondary">
                ID: {showCloseModal.id}
              </p>
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
                className="btn-green flex-1 px-6 py-2 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <CheckCircle size={16} />
                Close Job
              <button onClick={() => handleCloseJob(showCloseModal.id)} className="mj-action-btn mj-btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '11px', fontSize: 14 }}>
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCancelModal(null)}
        >
          <div
            className="glass-card max-w-lg w-full p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red/20 flex items-center justify-center">
                <Ban size={24} className="text-red" />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f0f1a', margin: 0 }} className="black:text-white">Cancel Job Posting</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>This action cannot be undone</p>
                <h2 className="text-xl font-bold text-primary">
                  Cancel JobPost
                </h2>
                <p className="text-xs text-muted">
                  This action cannot be undone
                </p>
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
            <div className="glass-card p-4 mb-6">
              <p className="text-sm font-bold text-primary mb-2">
                {showCancelModal.title}
              </p>
              <p className="text-xs text-secondary mb-2">
                ID: {showCancelModal.id}
              </p>
              <p className="text-xs text-muted">
                {showCancelModal.proposalsCount} proposals received
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
                className="btn-red flex-1 px-6 py-2 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Ban size={16} />
                Cancel Job
              <button onClick={() => handleCancelJob(showCancelModal.id)} className="mj-action-btn mj-btn-red" style={{ flex: 1, justifyContent: 'center', padding: '11px', fontSize: 14, borderRadius: 12, background: '#EF4444', color: '#fff', border: 'none' }}>
                <Ban size={16} /> Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
