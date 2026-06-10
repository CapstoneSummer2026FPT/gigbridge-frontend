import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Briefcase, Search, Plus, Edit, XCircle, Eye, Users, DollarSign, Calendar, CheckCircle, Clock, Ban } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import '../../admin/styles/admin-users-screen.css';

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

// Mock data
const MOCK_JOBS: MyJob[] = [
  {
    id: 'job_1',
    title: 'E-commerce Website Development',
    description: 'Looking for an experienced web developer to build a modern e-commerce platform with React and Node.js.',
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
    description: 'Need a creative designer for a fitness tracking mobile app. Must have experience with modern design trends.',
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
    description: 'Looking for SEO expert to optimize our tech blog for better search rankings.',
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
    description: 'Need data analyst to work on customer behavior analysis using Python and SQL.',
    budget: 3500,
    status: 'cancelled',
    proposalsCount: 6,
    viewsCount: 67,
    createdAt: '2026-04-15T11:00:00Z',
    skills: ['Python', 'SQL', 'Data Visualization', 'Statistics'],
  },
];

export default function MyJobsScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all');
  const [showCloseModal, setShowCloseModal] = useState<MyJob | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<MyJob | null>(null);

  const stats = useMemo(() => {
    const open = MOCK_JOBS.filter(j => j.status === 'open').length;
    const inProgress = MOCK_JOBS.filter(j => j.status === 'in_progress').length;
    const closed = MOCK_JOBS.filter(j => j.status === 'closed').length;
    const totalProposals = MOCK_JOBS.reduce((sum, j) => sum + j.proposalsCount, 0);

    return { open, inProgress, closed, totalProposals, total: MOCK_JOBS.length };
  }, []);

  const filteredJobs = useMemo(() => {
    return MOCK_JOBS.filter(job => {
      const matchesSearch = searchQuery === '' ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    if (status === 'open') return <span className="badge-green text-xs">Open</span>;
    if (status === 'in_progress') return <span className="badge-cyan text-xs">In Progress</span>;
    if (status === 'closed') return <span className="badge-gray text-xs">Closed</span>;
    return <span className="badge-red text-xs">Cancelled</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCloseJob = (jobId: string) => {
    console.log('Closing job:', jobId);
    // API call to close job
    setShowCloseModal(null);
  };

  const handleCancelJob = (jobId: string) => {
    console.log('Cancelling job:', jobId);
    // API call to cancel job
    setShowCancelModal(null);
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">My Jobs</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Job Posts</h1>
              <p className="text-sm text-secondary mt-1">Manage your job postings</p>
            </div>
            <button
              onClick={() => navigate('/jobs/post')}
              className="btn-cyan px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Post New Job
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {[
              { label: 'Total Jobs', value: stats.total.toString(), icon: <Briefcase size={16} />, color: 'cyan' },
              { label: 'Open', value: stats.open.toString(), icon: <CheckCircle size={16} />, color: 'green' },
              { label: 'In Progress', value: stats.inProgress.toString(), icon: <Clock size={16} />, color: 'amber' },
              { label: 'Closed', value: stats.closed.toString(), icon: <XCircle size={16} />, color: 'gray' },
              { label: 'Total Proposals', value: stats.totalProposals.toString(), icon: <Users size={16} />, color: 'purple' },
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

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search jobs..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as JobStatus)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div key={job.id} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-primary">{job.title}</h3>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-secondary mb-3 line-clamp-2">{job.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {job.skills.slice(0, 4).map(skill => (
                        <span key={skill} className="tag-pill text-xs">{skill}</span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="tag-pill text-xs">+{job.skills.length - 4} more</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-green">
                      ${job.budget.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted">Fixed Price</p>
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
                    <p className="text-xs text-muted mb-1">Posted</p>
                    <p className="text-sm font-semibold text-primary flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(job.createdAt)}
                    </p>
                  </div>
                  {job.deadline && (
                    <div>
                      <p className="text-xs text-muted mb-1">Deadline</p>
                      <p className="text-sm font-semibold text-primary flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(job.deadline)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-1.5"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  {job.proposalsCount > 0 && (
                    <button
                      onClick={() => navigate(`/proposals?job=${job.id}`)}
                      className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-1.5"
                    >
                      <Users size={14} />
                      View Proposals ({job.proposalsCount})
                    </button>
                  )}
                  {job.status === 'open' && (
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
                <p className="text-lg font-semibold text-primary mb-2">No jobs found</p>
                <p className="text-sm text-secondary mb-6">Start by posting your first job</p>
                <button
                  onClick={() => navigate('/jobs/post')}
                  className="btn-cyan px-6 py-3"
                >
                  Post a Job
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close Job Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCloseModal(null)}>
          <div className="glass-card max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green/20 flex items-center justify-center">
                <CheckCircle size={24} className="text-green" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Close Job Posting</h2>
                <p className="text-xs text-muted">Mark this job as completed</p>
              </div>
            </div>

            <div className="glass-card p-4 mb-6">
              <p className="text-sm font-bold text-primary mb-2">{showCloseModal.title}</p>
              <p className="text-xs text-secondary">ID: {showCloseModal.id}</p>
            </div>

            <div className="bg-green/10 border border-green/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-primary mb-1">
                Closing this job will:
              </p>
              <ul className="text-xs text-secondary space-y-1 ml-4">
                <li>• Stop accepting new proposals</li>
                <li>• Mark the job as successfully completed</li>
                <li>• Hide it from job search results</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(null)}
                className="btn-ghost-cyan flex-1 px-6 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCloseJob(showCloseModal.id)}
                className="btn-green flex-1 px-6 py-2 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                Close Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Job Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCancelModal(null)}>
          <div className="glass-card max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red/20 flex items-center justify-center">
                <Ban size={24} className="text-red" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Cancel Job Posting</h2>
                <p className="text-xs text-muted">This action cannot be undone</p>
              </div>
            </div>

            <div className="glass-card p-4 mb-6">
              <p className="text-sm font-bold text-primary mb-2">{showCancelModal.title}</p>
              <p className="text-xs text-secondary mb-2">ID: {showCancelModal.id}</p>
              <p className="text-xs text-muted">{showCancelModal.proposalsCount} proposals received</p>
            </div>

            <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-primary mb-1">Warning</p>
              <p className="text-xs text-secondary">
                Cancelling this job will permanently remove it and notify all freelancers who submitted proposals.
                Consider closing the job instead if it was completed successfully.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(null)}
                className="btn-ghost-cyan flex-1 px-6 py-2"
              >
                Keep Job
              </button>
              <button
                onClick={() => handleCancelJob(showCancelModal.id)}
                className="btn-red flex-1 px-6 py-2 flex items-center justify-center gap-2"
              >
                <Ban size={16} />
                Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
