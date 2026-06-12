import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Edit3, AlertCircle, Search, Zap, Eye, X, ChevronDown,
  Plus, Briefcase, Users, CheckCircle, Clock, Ban, DollarSign,
  Calendar, TrendingUp, FileText, MoreHorizontal,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/manage-job-posts-screen.css';

interface JobPost {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Open' | 'Closed' | 'Cancelled';
  budget: number;
  duration: string;
  skills: string[];
  proposals: number;
  views: number;
  isFeatured: boolean;
  hasActiveContract: boolean;
  createdAt: string;
}

type StatusFilter = 'All' | JobPost['status'];

const STATUSES: JobPost['status'][] = ['Draft', 'Open', 'Closed', 'Cancelled'];

const INITIAL_JOBS: JobPost[] = [
  {
    id: 'job_1',
    title: 'Build E-Commerce Platform',
    description: 'Need a scalable e-commerce platform with React frontend, Node.js backend and PostgreSQL database. Payment integration via Stripe required.',
    status: 'Open',
    budget: 5000,
    duration: '4 weeks',
    skills: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
    proposals: 12,
    views: 148,
    isFeatured: true,
    hasActiveContract: false,
    createdAt: '2024-01-15',
  },
  {
    id: 'job_2',
    title: 'Mobile App UI Design',
    description: 'Create comprehensive UI mockups for a health-tracking mobile app. Figma-based design system required.',
    status: 'Draft',
    budget: 1500,
    duration: '2 weeks',
    skills: ['Figma', 'UI/UX Design', 'Prototyping'],
    proposals: 0,
    views: 3,
    isFeatured: false,
    hasActiveContract: false,
    createdAt: '2024-01-20',
  },
  {
    id: 'job_3',
    title: 'Logo & Brand Identity Design',
    description: 'Professional logo and full brand identity for a tech startup. Deliverables include logo files, brand guidelines, and color palette.',
    status: 'Closed',
    budget: 800,
    duration: '1 week',
    skills: ['Graphic Design', 'Branding', 'Illustrator'],
    proposals: 25,
    views: 312,
    isFeatured: false,
    hasActiveContract: true,
    createdAt: '2024-01-10',
  },
  {
    id: 'job_4',
    title: 'Website Maintenance & Updates',
    description: 'Monthly website maintenance including CMS updates, plugin management, performance monitoring and bug fixes.',
    status: 'Open',
    budget: 500,
    duration: 'Ongoing',
    skills: ['WordPress', 'HTML/CSS', 'PHP'],
    proposals: 8,
    views: 95,
    isFeatured: false,
    hasActiveContract: true,
    createdAt: '2024-01-05',
  },
  {
    id: 'job_5',
    title: 'Data Pipeline Development',
    description: 'Build automated data pipeline to pull from multiple APIs, transform data, and store in a data warehouse for analytics.',
    status: 'Cancelled',
    budget: 3200,
    duration: '3 weeks',
    skills: ['Python', 'Airflow', 'BigQuery', 'SQL'],
    proposals: 6,
    views: 74,
    isFeatured: false,
    hasActiveContract: false,
    createdAt: '2024-01-03',
  },
];

const BADGE_CLASS: Record<JobPost['status'], string> = {
  Open:      'mjp-badge mjp-badge-open',
  Draft:     'mjp-badge mjp-badge-draft',
  Closed:    'mjp-badge mjp-badge-closed',
  Cancelled: 'mjp-badge mjp-badge-cancelled',
};

const STATUS_DOT: Record<JobPost['status'], string> = {
  Open: '🟢', Draft: '⚪', Closed: '⚫', Cancelled: '🔴',
};

type ModalState =
  | { type: 'close'; job: JobPost }
  | { type: 'cancel'; job: JobPost }
  | { type: 'warn-close'; job: JobPost }
  | { type: 'warn-cancel'; job: JobPost }
  | null;

export default function ManageJobPostsScreen() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<StatusFilter>('All');
  const [modal, setModal]             = useState<ModalState>(null);
  const [toast, setToast]             = useState<string | null>(null);
  const [jobs, setJobs]               = useState<JobPost[]>(INITIAL_JOBS);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() =>
    jobs.filter(j => {
      const q = search.toLowerCase();
      const matchQ = !q || j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q);
      const matchS = filter === 'All' || j.status === filter;
      return matchQ && matchS;
    }),
  [jobs, search, filter]);

  const counts = useMemo(() => ({
    All:       jobs.length,
    Open:      jobs.filter(j => j.status === 'Open').length,
    Draft:     jobs.filter(j => j.status === 'Draft').length,
    Closed:    jobs.filter(j => j.status === 'Closed').length,
    Cancelled: jobs.filter(j => j.status === 'Cancelled').length,
    proposals: jobs.reduce((a, j) => a + j.proposals, 0),
    views:     jobs.reduce((a, j) => a + j.views, 0),
  }), [jobs]);

  const handleChangeStatus = (jobId: string, newStatus: JobPost['status']) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    if ((newStatus === 'Closed' || newStatus === 'Cancelled') && job.hasActiveContract) {
      setModal({ type: newStatus === 'Closed' ? 'warn-close' : 'warn-cancel', job });
      return;
    }
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    showToast(`Status changed to ${newStatus}`);
  };

  const handleClose = (job: JobPost) => {
    if (job.hasActiveContract) { setModal({ type: 'warn-close', job }); return; }
    setModal({ type: 'close', job });
  };

  const handleCancel = (job: JobPost) => {
    if (job.hasActiveContract) { setModal({ type: 'warn-cancel', job }); return; }
    setModal({ type: 'cancel', job });
  };

  const confirmAction = (jobId: string, newStatus: JobPost['status']) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    setModal(null);
    showToast(`Job ${newStatus === 'Closed' ? 'closed' : 'cancelled'} successfully`);
  };

  const handlePromote = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || job.status !== 'Open') return;
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isFeatured: true } : j));
    showToast('Job promoted — now featured!');
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const TABS: { key: StatusFilter; label: string; activeClass: string }[] = [
    { key: 'All',       label: 'All Jobs',  activeClass: 't-all'       },
    { key: 'Open',      label: 'Open',      activeClass: 't-open'      },
    { key: 'Draft',     label: 'Draft',     activeClass: 't-draft'     },
    { key: 'Closed',    label: 'Closed',    activeClass: 't-closed'    },
    { key: 'Cancelled', label: 'Cancelled', activeClass: 't-cancelled' },
  ];

  const STAT_CARDS = [
    { label: 'Total Jobs',    value: counts.All,       icon: <Briefcase size={18}/>,  bg: 'mjp-bg-cyan',   color: 'mjp-cyan'   },
    { label: 'Open',          value: counts.Open,      icon: <CheckCircle size={18}/>, bg: 'mjp-bg-green', color: 'mjp-green'  },
    { label: 'Draft',         value: counts.Draft,     icon: <FileText  size={18}/>,  bg: 'mjp-bg-gray',   color: 'mjp-gray'   },
    { label: 'Proposals',     value: counts.proposals, icon: <Users     size={18}/>,  bg: 'mjp-bg-purple', color: 'mjp-purple' },
    { label: 'Total Views',   value: counts.views,     icon: <Eye       size={18}/>,  bg: 'mjp-bg-cyan',   color: 'mjp-cyan'   },
  ];

  return (
    <AppLayout>
      <div className="mjp-mesh-bg mjp-scrollbar" style={{ padding: '32px 0 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

          {/* ── Page Header ── */}
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
                  Manage, track, and promote your job listings — {jobs.length} total
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

          {/* ── Toast ── */}
          {toast && (
            <div className="mjp-toast">
              <CheckCircle size={16} /> {toast}
            </div>
          )}
      <div className="manage-jobs-wrapper">
        {/* Header */}
        <div className="manage-jobs-header">
          <h1 className="manage-jobs-title">Job Posts Management</h1>
          <p className="manage-jobs-subtitle">
            Manage your job posts - {jobPosts.length} total
          </p>
          <button onClick={() => navigate('/jobs/post/questions')} className="manage-jobs-new-btn">
            + New Job Post
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
          </div>
        )}

          {/* ── Stat Cards ── */}
          <div className="mjp-stat-grid" style={{ marginBottom: 28 }}>
            {STAT_CARDS.map(s => (
              <div key={s.label} className="mjp-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className={`mjp-stat-icon ${s.bg}`}>
                    <span className={s.color}>{s.icon}</span>
                  </div>
                </div>
                <div>
                  <div className="mjp-stat-value">{s.value}</div>
                  <div className="mjp-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter Bar ── */}
          <div className="mjp-card mjp-filter-bar" style={{ marginBottom: 24 }}>
            {/* Search */}
            <div className="mjp-search-wrap">
              <Search size={16} className="mjp-search-icon" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, skill..."
                className="mjp-input"
              />
              {search && (
                <button className="mjp-search-clear" onClick={() => setSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div className="mjp-glass mjp-tabs">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`mjp-tab ${filter === t.key ? t.activeClass : 'inactive'}`}
                >
                  {t.label}
                  <span className="mjp-tab-count">{counts[t.key]}</span>
                </button>
              ))}
            </div>

            {/* Results count */}
            <div style={{ width: '100%', fontSize: 12, color: '#9ca3af', fontWeight: 500, marginTop: 4 }}>
              Showing <strong style={{ color: '#374151' }}>{filtered.length}</strong> of {jobs.length} jobs
            </div>
          </div>

          {/* ── Job Cards ── */}
          {filtered.length === 0 ? (
            <div className="mjp-card mjp-empty">
              <div className="mjp-empty-icon">
                <Briefcase size={36} className="mjp-cyan" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f0f1a', marginBottom: 6 }}>No jobs found</p>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                {search ? 'Try adjusting your search or filter.' : 'Create your first job post to get started.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/jobs/post/questions')}
                  className="manage-jobs-empty-btn"
                >
                  Post a New Job
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map(job => (
                <div key={job.id} className="mjp-card mjp-job-card">

                  {/* ── Card Top: title + badges + budget ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <h3 className="mjp-job-title">{job.title}</h3>
                        <span className={BADGE_CLASS[job.status]}>{job.status}</span>
                        {job.isFeatured && (
                          <span className="mjp-featured"><Zap size={11} /> Featured</span>
                        )}
                        {job.hasActiveContract && (
                          <span className="mjp-featured" style={{ background: 'rgba(23,130,252,0.1)', color: 'var(--gb-cyan,#1782FC)', borderColor: 'rgba(23,130,252,.22)' }}>
                            <CheckCircle size={11} /> Active Contract
                          </span>
                        )}
                      </div>
                      <p className="mjp-job-desc">{job.description}</p>
                    </div>

                    {/* Budget */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="mjp-budget">${job.budget.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Fixed Price</div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {job.skills.map(s => <span key={s} className="mjp-tag">{s}</span>)}
                  </div>

                  <hr className="mjp-divider" style={{ marginBottom: 14 }} />

                  {/* Meta row */}
                  <div className="mjp-meta-row" style={{ marginBottom: 14 }}>
                    <span className="mjp-meta-item">
                      <Users size={13} className="mjp-purple" />
                      <strong>{job.proposals}</strong> proposals
                    </span>
                    <span className="mjp-meta-item">
                      <Eye size={13} className="mjp-cyan" />
                      <strong>{job.views}</strong> views
                    </span>
                    <span className="mjp-meta-item">
                      <Clock size={13} className="mjp-amber" />
                      {job.duration}
                    </span>
                    <span className="mjp-meta-item">
                      <Calendar size={13} />
                      Posted {formatDate(job.createdAt)}
                    </span>
                  </div>

                  <hr className="mjp-divider" style={{ marginBottom: 14 }} />

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="mjp-btn mjp-btn-cyan"
                    >
                      <Eye size={14} /> View
                    </button>

                    {job.proposals > 0 && (
                      <button
                        onClick={() => navigate(`/proposals?job=${job.id}`)}
                        className="mjp-btn mjp-btn-cyan"
                      >
                        <Users size={14} /> Proposals ({job.proposals})
                      </button>
                    )}

                    {(job.status === 'Open' || job.status === 'Draft') && (
                      <button
                        onClick={() => navigate(`/jobs/${job.id}/edit`)}
                        className="mjp-btn mjp-btn-amber"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    )}

                    {job.status === 'Open' && !job.isFeatured && (
                      <button onClick={() => handlePromote(job.id)} className="mjp-btn mjp-btn-amber">
                        <Zap size={14} /> Feature
                      </button>
                    )}

                    {job.status === 'Open' && (
                      <button onClick={() => handleClose(job)} className="mjp-btn mjp-btn-gray">
                        <Ban size={14} /> Close Job
                      </button>
                    )}

                    {(job.status === 'Open' || job.status === 'Draft') && (
                      <button onClick={() => handleCancel(job)} className="mjp-btn mjp-btn-red">
                        <X size={14} /> Cancel
                      </button>
                    )}

                    {/* Change Status dropdown */}
                    <div className="mjp-dropdown-wrap" style={{ marginLeft: 'auto' }}>
                      <button className="mjp-btn mjp-btn-gray">
                        <MoreHorizontal size={14} /> Status <ChevronDown size={13} />
                      </button>
                      <div className="mjp-dropdown-menu">
                        <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>
                          Change to
                        </div>
                        {STATUSES.filter(s => s !== job.status).map(s => (
                          <button
                            key={s}
                            onClick={() => handleChangeStatus(job.id, s)}
                            className={`mjp-dropdown-item ${s.toLowerCase()}-item`}
                          >
                            {STATUS_DOT[s]} {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Close Modal ── */}
      {(modal?.type === 'close' || modal?.type === 'warn-close') && (
        <div className="mjp-modal-overlay" onClick={() => setModal(null)}>
          <div className="mjp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
              <div className="mjp-modal-icon mjp-bg-gray">
                <Ban size={22} className="mjp-gray" />
              </div>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: '#0f0f1a' }}>Close Job Posting</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>Mark this position as no longer accepting proposals</p>
              </div>
            </div>

            <div className="mjp-modal-info" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f0f1a', margin: 0 }}>{modal.job.title}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{modal.job.proposals} proposals received</p>
            </div>

            {modal.type === 'warn-close' ? (
              <div className="mjp-modal-warn mjp-modal-warn-amber" style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>⚠ Active Contract Detected</p>
                <p style={{ fontSize: 12, color: '#92400e' }}>This job has an active contract. Closing it won't terminate the contract, but will stop new proposals.</p>
              </div>
            ) : (
              <div className="mjp-modal-warn mjp-modal-warn-green" style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>Closing this job will:</p>
                <ul style={{ fontSize: 12, color: '#166534', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                  <li>Stop accepting new proposals</li>
                  <li>Mark the listing as Closed</li>
                  <li>Hide it from job search results</li>
                </ul>
              </div>
            )}

            <div className="mjp-modal-actions">
              <button onClick={() => setModal(null)} className="mjp-modal-cancel-btn">Keep Job</button>
              <button
                onClick={() => confirmAction(modal.job.id, 'Closed')}
                className="mjp-modal-confirm-btn"
                style={{ background: '#374151', color: '#fff' }}
              >
                <Ban size={15} /> Close Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {(modal?.type === 'cancel' || modal?.type === 'warn-cancel') && (
        <div className="mjp-modal-overlay" onClick={() => setModal(null)}>
          <div className="mjp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
              <div className="mjp-modal-icon mjp-bg-red">
                <AlertCircle size={22} className="mjp-red" />
              </div>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: '#0f0f1a' }}>Cancel Job Posting</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>This action cannot be undone</p>
              </div>
            </div>

            <div className="mjp-modal-info" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f0f1a', margin: 0 }}>{modal.job.title}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{modal.job.proposals} proposals received</p>
            </div>

            <div className="mjp-modal-warn mjp-modal-warn-red" style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
                {modal.type === 'warn-cancel' ? '⚠ Active Contract Detected' : '⚠ Warning'}
              </p>
              <p style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.7 }}>
                {modal.type === 'warn-cancel'
                  ? 'This job has an active contract. Cancelling will notify all freelancers and may impact ongoing work.'
                  : 'Cancelling this job will permanently remove it and notify all freelancers who submitted proposals.'}
              </p>
            </div>

            <div className="mjp-modal-actions">
              <button onClick={() => setModal(null)} className="mjp-modal-cancel-btn">Keep Job</button>
              <button
                onClick={() => confirmAction(modal.job.id, 'Cancelled')}
                className="mjp-modal-confirm-btn"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                <X size={15} /> Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
