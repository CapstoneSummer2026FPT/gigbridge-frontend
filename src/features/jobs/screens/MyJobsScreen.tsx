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
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI, jobPutAPI } from '../../../api/jobAPI';
import {
  JobStatus,
  type JobPostSummaryDto,
} from '../../../types/models/Job';
import '../../admin/styles/admin-users-screen.css';

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

export default function MyJobsScreen() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');
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

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">My Jobs</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Job Posts</h1>
              <p className="text-sm text-secondary mt-1">Manage your JobPosts, visibility, status, and questions</p>
            </div>

            <button
              onClick={() => navigate('/jobs/post/questions')}
              className="btn-cyan px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Post New Job
            </button>
          </div>

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
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

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
        </div>
      </div>

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
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">
                  Close JobPost
                </h2>
                <p className="text-xs text-muted">
                  Mark this JobPost as closed
                </p>
              </div>
            </div>

            <div className="glass-card p-4 mb-6">
              <p className="text-sm font-bold text-primary mb-2">
                {showCloseModal.title}
              </p>
              <p className="text-xs text-secondary">
                ID: {showCloseModal.id}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(null)}
                className="btn-ghost-cyan flex-1 px-6 py-2"
              >
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
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
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
                <h2 className="text-xl font-bold text-primary">
                  Cancel JobPost
                </h2>
                <p className="text-xs text-muted">
                  This action cannot be undone
                </p>
              </div>
            </div>

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

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(null)}
                className="btn-ghost-cyan flex-1 px-6 py-2"
              >
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
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
