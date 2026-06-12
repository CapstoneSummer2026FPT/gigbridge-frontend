import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Briefcase, Search, Plus, Edit, Eye, Users, Calendar,
  CheckCircle, Clock, Ban, XCircle, TrendingUp, DollarSign,
  Sparkles, ChevronDown, LayoutGrid, AlignJustify, FileText,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import '../styles/my-jobs-screen.css';

type JobStatus = 'all' | 'open' | 'in_progress' | 'closed' | 'cancelled';

interface MyJob {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: 'open' | 'in_progress' | 'closed' | 'cancelled';
  proposalsCount: number;
  viewsCount: number;
  createdAt: string;
  deadline?: string;
  skills: string[];
}

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
  const { user } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all');
  const [isCompact, setIsCompact] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState<MyJob | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<MyJob | null>(null);

  const stats = useMemo(() => {
    const open        = MOCK_JOBS.filter(j => j.status === 'open').length;
    const inProgress  = MOCK_JOBS.filter(j => j.status === 'in_progress').length;
    const closed      = MOCK_JOBS.filter(j => j.status === 'closed').length;
    const cancelled   = MOCK_JOBS.filter(j => j.status === 'cancelled').length;
    const totalProposals = MOCK_JOBS.reduce((s, j) => s + j.proposalsCount, 0);
    const totalViews     = MOCK_JOBS.reduce((s, j) => s + j.viewsCount, 0);
    return { open, inProgress, closed, cancelled, totalProposals, totalViews, total: MOCK_JOBS.length };
  }, []);

  const filteredJobs = useMemo(() => {
    return MOCK_JOBS.filter(job => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.skills.some(s => s.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
              <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f0f1a', margin: 0 }}
                className="black:text-white">
                My Job Posts
              </h1>
              <p style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>
                Manage, track, and analyse all your project listings in one place.
              </p>
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
