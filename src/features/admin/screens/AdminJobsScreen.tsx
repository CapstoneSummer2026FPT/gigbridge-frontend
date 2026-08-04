import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Search, Filter, Briefcase, Eye, Lock, Unlock, MoreVertical, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Trash2, FileQuestion, Download, ExternalLink, Award, MapPin, Clock8, Folder, Image, Film, File as FileIcon } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { adminAPI } from '../../../api/adminAPI';
import { JobPostStatus, type AdminJobPostStatsDto, type Job, type JobPostSummaryDto } from '../../../types/models/Job';
import '../styles/admin-users-screen.css';

type JobFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled';
type JobSort = 'posted' | 'title' | 'budget';

const PAGE_SIZE = 25;
const EMPTY_STATS: AdminJobPostStatsDto = {
  total: 0,
  draft: 0,
  open: 0,
  closed: 0,
  cancelled: 0,
  locked: 0,
};

const JOB_FILTER_STATUS: Record<Exclude<JobFilter, 'all'>, JobPostStatus> = {
  draft: JobPostStatus.Draft,
  open: JobPostStatus.Open,
  closed: JobPostStatus.Closed,
  cancelled: JobPostStatus.Cancelled,
};

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null || bytes === 0) return 'Unknown Size';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType?: string, fileName?: string) => {
  const name = fileName?.toLowerCase() || '';
  const mime = mimeType?.toLowerCase() || '';

  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) {
    return <Image size={14} className="text-cyan flex-shrink-0" />;
  }
  if (mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(name)) {
    return <Film size={14} className="text-purple flex-shrink-0" />;
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return <FileText size={14} className="text-red flex-shrink-0" />;
  }
  return <FileIcon size={14} className="text-secondary flex-shrink-0" />;
};

const mapJobPostSummaryToJob = (job: JobPostSummaryDto): Job => ({
  id: job.jobPostsId,
  clientId: job.clientFullName || job.clientProfilesId || '',
  title: job.title,
  description: job.descriptionPreview,
  category: job.categoryName || 'Uncategorized',
  majorName: job.majorName,
  categoryName: job.categoryName,
  customSkillNames: job.customSkillNames || [],
  skills: [...(job.skillNames || []), ...(job.customSkillNames || [])],
  budgetMin: job.budgetMin ?? 0,
  budgetMax: job.budgetMax ?? 0,
  jobType: 'fixed',
  status:
    job.status === JobPostStatus.Draft ? 'draft' :
      job.status === JobPostStatus.Closed ? 'closed' :
        job.status === JobPostStatus.Cancelled ? 'cancelled' :
          'open',
  proposalCount: 0,
  viewCount: 0,
  postedAt: job.createdAt,
  isRemote: true,
  gigcoin_cost: 0,
  visibility: job.visibility ?? undefined,
});

const createJobPreviewPlaceholder = (jobId: string): Job => ({
  id: jobId,
  clientId: '',
  title: 'Job post',
  description: '',
  category: 'Uncategorized',
  skills: [],
  budgetMin: 0,
  budgetMax: 0,
  jobType: 'fixed',
  status: 'draft',
  proposalCount: 0,
  viewCount: 0,
  postedAt: '',
  isRemote: true,
  gigcoin_cost: 0,
});

export default function AdminJobsScreen() {
  const navigate = useNavigate();
  const [routeSearchParams, setRouteSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<JobFilter>('all');
  const [sortBy, setSortBy] = useState<JobSort>('posted');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [pageIndex, setPageIndex] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<AdminJobPostStatsDto>(EMPTY_STATS);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [previewJobDetail, setPreviewJobDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [jobAssets, setJobAssets] = useState<any[]>([]);
  const [isLoadingJobAssets, setIsLoadingJobAssets] = useState(false);
  const previewJobId = routeSearchParams.get('preview');
  const closeJobPreview = () => {
    const next = new URLSearchParams(routeSearchParams);
    next.delete('preview');
    setRouteSearchParams(next, { replace: true });
    setPreviewJob(null);
  };

  const [jobContract, setJobContract] = useState<any | null>(null);
  const [jobMilestones, setJobMilestones] = useState<any[]>([]);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);

  // Milestone CRUD modal states
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);
  const [showCreateMilestoneForm, setShowCreateMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', amount: 0, dueDate: '', status: 0, sortOrder: 0 });
  const [milestoneActionLoading, setMilestoneActionLoading] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  const currentMilestone = useMemo(() => {
    if (jobMilestones.length === 0) return null;
    // Current milestone is the first one that is NOT Approved (3) and NOT Paid (5)
    return jobMilestones.find(m => m.status !== 3 && m.status !== 5) || jobMilestones[0];
  }, [jobMilestones]);

  const [showQuestionsJob, setShowQuestionsJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'lock' | 'unlock' | 'delete', job: Job } | null>(null);
  const [isJobActionPending, setIsJobActionPending] = useState(false);
  const [jobsRefreshKey, setJobsRefreshKey] = useState(0);
  const latestJobsRequestRef = useRef(0);

  const fetchJobs = async (forceSummary = false) => {
    const requestId = ++latestJobsRequestRef.current;
    setIsLoadingJobs(true);
    setJobsError(null);

    const includeSummary = forceSummary || pageIndex === 1;

    const response = await jobGetAPI.getAllJobPosts({
      pageIndex,
      pageSize: PAGE_SIZE,
      search: debouncedSearchQuery.trim() || undefined,
      status: filterType === 'all' ? undefined : JOB_FILTER_STATUS[filterType],
      sortBy: sortBy === 'posted' ? 'newest' : sortBy === 'budget' ? 'budgetMax' : 'title',
      sortDesc: sortBy !== 'title',
      includeSummary,
      knownTotalItems: includeSummary ? undefined : totalItems,
    });

    if (requestId !== latestJobsRequestRef.current) return;

    if (response.success && response.data) {
      if (response.data.totalPages > 0 && pageIndex > response.data.totalPages) {
        setPageIndex(response.data.totalPages);
      } else {
        setAllJobs(response.data.items.map(mapJobPostSummaryToJob));
      }
      setTotalItems(response.data.totalItems);
      setTotalPages(response.data.totalPages);
      if (response.data.stats) setStats(response.data.stats);
    } else {
      setAllJobs([]);
      setTotalItems(0);
      setTotalPages(0);
      setStats(EMPTY_STATS);
      setJobsError(response.message || 'Failed to load jobs');
    }

    setIsLoadingJobs(false);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    void fetchJobs();

    return () => {
      latestJobsRequestRef.current += 1;
    };
  }, [pageIndex, debouncedSearchQuery, filterType, sortBy, jobsRefreshKey]);

  useEffect(() => {
    if (!previewJobId) {
      setPreviewJob(null);
      return;
    }

    const requested = allJobs.find(job => job.id === previewJobId);
    setPreviewJob(current => {
      if (requested) return requested;
      if (current?.id === previewJobId) return current;
      return createJobPreviewPlaceholder(previewJobId);
    });
  }, [allJobs, previewJobId]);

  useEffect(() => {
    if (previewJob) {
      const loadDetail = async () => {
        setIsLoadingDetail(true);
        setIsLoadingJobAssets(true);
        setIsLoadingMilestones(true);
        try {
          const res = await adminAPI.getJobPostDetail(previewJob.id);
          if (res.success && res.data) {
            setPreviewJobDetail(res.data);
          }
          // Fetch job assets
          const assetsRes = await adminAPI.getAssets({ jobPostId: previewJob.id });
          if (assetsRes.success && assetsRes.data) {
            setJobAssets(assetsRes.data);
          } else {
            setJobAssets([]);
          }
          // Fetch job contract and milestones
          const contractRes = await adminAPI.getContracts({ jobPostId: previewJob.id });
          if (contractRes.success && contractRes.data && contractRes.data.length > 0) {
            const activeContract = contractRes.data[0];
            setJobContract(activeContract);

            const milestonesRes = await adminAPI.getContractMilestones(activeContract.contractsId);
            if (milestonesRes.success && milestonesRes.data) {
              setJobMilestones(milestonesRes.data);
            } else {
              setJobMilestones([]);
            }
          } else {
            setJobContract(null);
            setJobMilestones([]);
          }
        } catch (err) {
          console.error("Failed to load job post details/assets/milestones:", err);
        } finally {
          setIsLoadingDetail(false);
          setIsLoadingJobAssets(false);
          setIsLoadingMilestones(false);
        }
      };
      loadDetail();
    } else {
      setPreviewJobDetail(null);
      setJobAssets([]);
      setJobContract(null);
      setJobMilestones([]);
    }
  }, [previewJob]);

  const handleCreateMilestone = async () => {
    if (!jobContract) return;
    if (!milestoneForm.title.trim()) {
      setMilestoneError('Title is required');
      return;
    }
    if (milestoneForm.amount <= 0) {
      setMilestoneError('Amount must be greater than 0');
      return;
    }
    setMilestoneActionLoading(true);
    setMilestoneError(null);
    try {
      const res = await adminAPI.createMilestone(jobContract.contractsId, {
        title: milestoneForm.title,
        amount: milestoneForm.amount,
        dueDate: milestoneForm.dueDate || undefined,
        sortOrder: milestoneForm.sortOrder || 0
      });
      if (res.success) {
        // Refresh milestones
        const milestonesRes = await adminAPI.getContractMilestones(jobContract.contractsId);
        if (milestonesRes.success) setJobMilestones(milestonesRes.data || []);
        setShowCreateMilestoneForm(false);
        setMilestoneForm({ title: '', amount: 0, dueDate: '', status: 0, sortOrder: 0 });
      } else {
        setMilestoneError(res.message || 'Failed to create milestone');
      }
    } catch (err) {
      setMilestoneError('An error occurred while creating the milestone');
    } finally {
      setMilestoneActionLoading(false);
    }
  };

  const handleUpdateMilestone = async () => {
    if (!editingMilestone || !jobContract) return;
    if (!milestoneForm.title.trim()) {
      setMilestoneError('Title is required');
      return;
    }
    if (milestoneForm.amount <= 0) {
      setMilestoneError('Amount must be greater than 0');
      return;
    }
    setMilestoneActionLoading(true);
    setMilestoneError(null);
    try {
      const res = await adminAPI.updateMilestone(editingMilestone.milestonesId, {
        title: milestoneForm.title,
        amount: milestoneForm.amount,
        dueDate: milestoneForm.dueDate || undefined,
        status: milestoneForm.status,
        sortOrder: milestoneForm.sortOrder || 0
      });
      if (res.success) {
        // Refresh milestones
        const milestonesRes = await adminAPI.getContractMilestones(jobContract.contractsId);
        if (milestonesRes.success) setJobMilestones(milestonesRes.data || []);
        setEditingMilestone(null);
      } else {
        setMilestoneError(res.message || 'Failed to update milestone');
      }
    } catch (err) {
      setMilestoneError('An error occurred while updating the milestone');
    } finally {
      setMilestoneActionLoading(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!window.confirm('Are you sure you want to delete this milestone? Associated attachments will be removed.')) return;
    setMilestoneActionLoading(true);
    setMilestoneError(null);
    try {
      const res = await adminAPI.deleteMilestone(milestoneId);
      if (res.success) {
        // Refresh milestones
        if (jobContract) {
          const milestonesRes = await adminAPI.getContractMilestones(jobContract.contractsId);
          if (milestonesRes.success) setJobMilestones(milestonesRes.data || []);
        }
      } else {
        setMilestoneError(res.message || 'Failed to delete milestone');
      }
    } catch (err) {
      setMilestoneError('An error occurred while deleting the milestone');
    } finally {
      setMilestoneActionLoading(false);
    }
  };

  const handleOverrideAction = async (milestoneId: string, action: 'release' | 'refund') => {
    const note = window.prompt(`Enter admin override note for this ${action} action:`);
    if (note === null) return; // cancelled
    setMilestoneActionLoading(true);
    setMilestoneError(null);
    try {
      const res = await adminAPI.overrideMilestone(milestoneId, { action, note: note || undefined });
      if (res.success) {
        // Refresh milestones
        if (jobContract) {
          const milestonesRes = await adminAPI.getContractMilestones(jobContract.contractsId);
          if (milestonesRes.success) setJobMilestones(milestonesRes.data || []);
        }
        alert(`Milestone successfully ${action}d!`);
      } else {
        setMilestoneError(res.message || `Failed to ${action} milestone`);
      }
    } catch (err) {
      setMilestoneError(`An error occurred while performing ${action} override`);
    } finally {
      setMilestoneActionLoading(false);
    }
  };

  useEffect(() => {
    if (showQuestionsJob) {
      const loadQuestions = async () => {
        setIsLoadingQuestions(true);
        setQuestionsError(null);
        try {
          const res = await jobGetAPI.getJobPostQuestions(showQuestionsJob.id);
          if (res.success) {
            setQuestions(res.data || []);
          } else {
            setQuestionsError(res.message || 'Failed to load questions.');
          }
        } catch (err) {
          setQuestionsError('An unexpected error occurred while loading questions.');
        } finally {
          setIsLoadingQuestions(false);
        }
      };
      loadQuestions();
    } else {
      setQuestions([]);
      setQuestionsError(null);
    }
  }, [showQuestionsJob]);

  useEffect(() => {
    if (!showActionMenu) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.job-action-menu-container')) {
        setShowActionMenu(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [showActionMenu]);

  const filteredJobs = allJobs;

  const handleLockToggle = async (job: Job) => {
    setIsJobActionPending(true);
    try {
      const response = await adminAPI.lockJobPost(job.id);
      if (response.success) {
        const isLocked = response.data === true;
        const wasLocked = job.visibility === 3;

        setAllJobs(currentJobs => currentJobs.map(currentJob =>
          currentJob.id === job.id
            ? { ...currentJob, visibility: isLocked ? 3 : 0 }
            : currentJob
        ));
        if (isLocked !== wasLocked) {
          setStats(currentStats => ({
            ...currentStats,
            locked: Math.max(0, currentStats.locked + (isLocked ? 1 : -1)),
          }));
        }
        setConfirmAction(null);
        toast.success(response.message || 'Job lock status updated successfully');
      } else {
        toast.error(response.message || 'Failed to update job lock status');
      }
    } catch {
      toast.error('An error occurred while locking/unlocking the job post');
    } finally {
      setIsJobActionPending(false);
    }
  };

  const handleDeleteJob = async (job: Job) => {
    setIsJobActionPending(true);
    try {
      const response = await adminAPI.deleteJobPost(job.id);
      if (response.success) {
        const nextTotalItems = Math.max(0, totalItems - 1);
        const nextTotalPages = nextTotalItems === 0 ? 0 : Math.ceil(nextTotalItems / PAGE_SIZE);
        const statusKey = job.status === 'draft'
          ? 'draft'
          : job.status === 'open'
            ? 'open'
            : job.status === 'cancelled'
              ? 'cancelled'
              : 'closed';

        setAllJobs(currentJobs => currentJobs.filter(currentJob => currentJob.id !== job.id));
        setTotalItems(nextTotalItems);
        setTotalPages(nextTotalPages);
        setStats(currentStats => ({
          ...currentStats,
          total: Math.max(0, currentStats.total - 1),
          [statusKey]: Math.max(0, currentStats[statusKey] - 1),
          locked: job.visibility === 3
            ? Math.max(0, currentStats.locked - 1)
            : currentStats.locked,
        }));
        setPageIndex(currentPage =>
          nextTotalPages > 0 && currentPage > nextTotalPages ? nextTotalPages : currentPage
        );
        setJobsRefreshKey(current => current + 1);
        setConfirmAction(null);
        toast.success(response.message || 'Job deleted successfully');
      } else {
        toast.error(response.message || 'Failed to delete job post');
      }
    } catch {
      toast.error('An error occurred while deleting the job post');
    } finally {
      setIsJobActionPending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'draft') return <span className="badge-gray text-xs">Draft</span>;
    if (status === 'open') return <span className="badge-green text-xs">Open</span>;
    if (status === 'cancelled') return <span className="badge-amber text-xs">Cancelled</span>;
    return <span className="badge-red text-xs">Closed</span>;
  };

  const getJobTypeBadge = () => <span className="badge-purple text-xs">Fixed Price</span>;

  const getClientName = (clientId: string) => {
    if (!clientId) return 'Unknown Client';
    // If clientId looks like a GUID (from clientProfilesId fallback), abbreviate it
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(clientId)) {
      return `Client ${clientId.substring(0, 8)}…`;
    }
    return clientId;
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">Job Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Manage Jobs</h1>
              <p className="text-sm text-secondary mt-1">View and manage all job postings</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: 'Total Jobs', value: stats.total.toLocaleString(), icon: <Briefcase size={16} />, color: 'cyan' },
              { label: 'Draft', value: stats.draft.toLocaleString(), icon: <FileText size={16} />, color: 'gray' },
              { label: 'Open', value: stats.open.toLocaleString(), icon: <CheckCircle size={16} />, color: 'green' },
              { label: 'Cancelled', value: stats.cancelled.toLocaleString(), icon: <XCircle size={16} />, color: 'amber' },
              { label: 'Closed', value: stats.closed.toString(), icon: <XCircle size={16} />, color: 'red' },
              { label: 'Locked', value: stats.locked.toString(), icon: <Lock size={16} />, color: 'amber' },
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

          {/* Filters and Search */}
          <div className="glass-card overflow-hidden mb-6">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-r from-cyan/5 to-purple/5">
              <Filter size={18} className="text-cyan flex-shrink-0" />
              <h3 className="font-semibold text-primary text-sm sm:text-base">Search & Filters</h3>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setPageIndex(1);
                    }}
                    placeholder="Search by title, description, client, category, or skill..."
                    className="input-gb w-full py-3 text-sm"
                    style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-3">
                  {/* Filter Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { type: 'all', label: 'All Jobs', icon: <Briefcase size={14} />, color: 'cyan' },
                      { type: 'draft', label: 'Draft', icon: <FileText size={14} />, color: 'gray' },
                      { type: 'open', label: 'Open', icon: <CheckCircle size={14} />, color: 'green' },
                      { type: 'closed', label: 'Closed', icon: <XCircle size={14} />, color: 'red' },
                      { type: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} />, color: 'amber' },
                    ].map(filter => (
                      <button
                        key={filter.type}
                        onClick={() => {
                          setFilterType(filter.type as JobFilter);
                          setPageIndex(1);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${filterType === filter.type
                          ? `bg-${filter.color}/20 text-${filter.color} border border-${filter.color} shadow-lg shadow-${filter.color}/20`
                          : 'glass-button text-secondary hover:text-primary hover:border-white/20'
                          }`}
                      >
                        <span className={filterType === filter.type ? `text-${filter.color}` : 'text-muted'}>
                          {filter.icon}
                        </span>
                        <span>{filter.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-secondary">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={e => {
                        setSortBy(e.target.value as JobSort);
                        setPageIndex(1);
                      }}
                      className="input-gb px-3 sm:px-4 py-2 pr-8 sm:pr-10 flex-1 sm:flex-initial sm:min-w-[160px] text-xs sm:text-sm font-medium cursor-pointer"
                    >
                      <option value="posted">Newest First</option>
                      <option value="title">Title A-Z</option>
                      <option value="budget">Highest Budget</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs sm:text-sm text-secondary">
              {isLoadingJobs ? (
                <span>Loading jobs...</span>
              ) : (
                <>
                  Showing <span className="text-primary font-semibold">
                    {totalItems === 0 ? 0 : ((pageIndex - 1) * PAGE_SIZE) + 1}-{Math.min(pageIndex * PAGE_SIZE, totalItems)}
                  </span> of <span className="text-primary font-semibold">{totalItems}</span> matching jobs
                </>
              )}
            </p>
          </div>

          {jobsError && (
            <div className="glass-card p-4 mb-6 flex items-center gap-3 border border-red/30">
              <AlertCircle size={18} className="text-red flex-shrink-0" />
              <p className="text-sm text-secondary">{jobsError}</p>
            </div>
          )}

          {/* Jobs Table - Desktop */}
          <div className="glass-card overflow-hidden hidden xl:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-primary">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-primary min-w-[250px]">Job</th>
                    <th className="text-left p-3 text-xs font-semibold text-primary min-w-[120px]">Client</th>
                    <th className="text-left p-3 text-xs font-semibold text-primary min-w-[140px]">Budget</th>
                    <th className="text-left p-3 text-xs font-semibold text-primary min-w-[100px]">Type</th>
                    <th className="text-left p-3 text-xs font-semibold text-primary min-w-[90px]">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-primary min-w-[110px]">Posted</th>
                    <th className="text-left p-3 text-xs font-semibold text-primary min-w-[130px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary">
                  {filteredJobs.map(job => (
                    <tr key={job.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-semibold text-primary mb-1 truncate max-w-[250px]">{job.title}</p>
                          <p className="text-xs text-secondary line-clamp-1 max-w-[250px]">{job.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted truncate max-w-[180px]">{job.category}</span>
                            {job.visibility === 3 && <Lock size={10} className="text-amber flex-shrink-0" />}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-xs text-secondary truncate max-w-[120px]">{getClientName(job.clientId)}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <GCoinIcon size={12} />
                          <span className="text-xs text-primary font-semibold">
                            {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {getJobTypeBadge()}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={12} className="text-muted flex-shrink-0" />
                          <span className="text-xs text-secondary">
                            {new Date(job.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="relative job-action-menu-container">
                          <button
                            onClick={() => setShowActionMenu(showActionMenu === job.id ? null : job.id)}
                            className="p-2 rounded-lg glass-button hover:bg-amber/10 transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical size={16} className="text-amber" />
                          </button>

                          {showActionMenu === job.id && (
                            <div className="absolute right-0 top-full mt-2 w-48 dropdown-menu p-2 z-50">
                              <button
                                onClick={() => {
                                  setPreviewJob(job);
                                  setShowActionMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                              >
                                <Eye size={14} className="text-cyan" />
                                Preview Details
                              </button>

                              <button
                                onClick={() => {
                                  setShowQuestionsJob(job);
                                  setShowActionMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                              >
                                <FileQuestion size={14} className="text-purple" />
                                View Questions
                              </button>

                              <button
                                onClick={() => {
                                  setConfirmAction({
                                    type: job.visibility === 3 ? 'unlock' : 'lock',
                                    job
                                  });
                                  setShowActionMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                              >
                                {job.visibility === 3 ? (
                                  <>
                                    <Unlock size={14} className="text-green" />
                                    Unlock Job
                                  </>
                                ) : (
                                  <>
                                    <Lock size={14} className="text-amber" />
                                    Lock Job
                                  </>
                                )}
                              </button>

                              <div className="h-px my-1 dropdown-divider" />

                              <button
                                onClick={() => {
                                  setConfirmAction({ type: 'delete', job });
                                  setShowActionMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-red-500/10 text-red"
                              >
                                <Trash2 size={14} className="text-red" />
                                Delete Job
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredJobs.length === 0 && (
              <div className="text-center py-16">
                <Briefcase size={48} className="mx-auto mb-4 text-muted" />
                <p className="text-primary font-medium mb-2">No jobs found</p>
                <p className="text-sm text-secondary">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          {/* Jobs Cards - Mobile/Tablet */}
          <div className="xl:hidden space-y-4">
            {filteredJobs.map(job => (
              <div key={job.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-primary mb-1 truncate">{job.title}</h3>
                    <p className="text-xs text-secondary line-clamp-2 mb-2">{job.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {getStatusBadge(job.status)}
                      {getJobTypeBadge()}
                      {job.visibility === 3 && (
                        <span className="badge-amber text-xs flex items-center gap-1">
                          <Lock size={10} />
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div>
                    <p className="text-muted mb-1">Budget</p>
                    <div className="flex items-center gap-1">
                      <GCoinIcon size={12} />
                      <span className="text-primary font-semibold text-xs">
                        {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Client</p>
                    <p className="text-primary font-medium truncate">{getClientName(job.clientId)}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Category</p>
                    <p className="text-primary font-medium truncate">{job.category}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Posted</p>
                    <p className="text-primary font-medium">
                      {new Date(job.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 relative job-action-menu-container">
                  <button
                    onClick={() => setShowActionMenu(showActionMenu === job.id ? null : job.id)}
                    className="w-full btn-ghost-cyan py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <MoreVertical size={14} />
                    Actions Menu
                  </button>

                  {showActionMenu === job.id && (
                    <div className="absolute left-0 bottom-full mb-2 w-full dropdown-menu p-2 z-50">
                      <button
                        onClick={() => {
                          setPreviewJob(job);
                          setShowActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                      >
                        <Eye size={14} className="text-cyan" />
                        Preview Details
                      </button>

                      <button
                        onClick={() => {
                          setShowQuestionsJob(job);
                          setShowActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                      >
                        <FileQuestion size={14} className="text-purple" />
                        View Questions
                      </button>

                      <button
                        onClick={() => {
                          setConfirmAction({
                            type: job.visibility === 3 ? 'unlock' : 'lock',
                            job
                          });
                          setShowActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                      >
                        {job.visibility === 3 ? (
                          <>
                            <Unlock size={14} className="text-green" />
                            Unlock Job
                          </>
                        ) : (
                          <>
                            <Lock size={14} className="text-amber" />
                            Lock Job
                          </>
                        )}
                      </button>

                      <div className="h-px my-1 dropdown-divider" />

                      <button
                        onClick={() => {
                          setConfirmAction({ type: 'delete', job });
                          setShowActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-red-500/10 text-red"
                      >
                        <Trash2 size={14} className="text-red" />
                        Delete Job
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredJobs.length === 0 && (
              <div className="glass-card text-center py-16">
                <Briefcase size={48} className="mx-auto mb-4 text-muted" />
                <p className="text-primary font-medium mb-2">No jobs found</p>
                <p className="text-sm text-secondary">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Job list pagination">
              <button
                type="button"
                className="glass-button rounded-lg px-4 py-2 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-40"
                disabled={isLoadingJobs || pageIndex <= 1}
                onClick={() => setPageIndex(current => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <span className="text-sm text-secondary">
                Page <span className="font-semibold text-primary">{pageIndex}</span> of{' '}
                <span className="font-semibold text-primary">{totalPages}</span>
              </span>
              <button
                type="button"
                className="glass-button rounded-lg px-4 py-2 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-40"
                disabled={isLoadingJobs || pageIndex >= totalPages}
                onClick={() => setPageIndex(current => Math.min(totalPages, current + 1))}
              >
                Next
              </button>
            </nav>
          )}

          {/* Preview Job Modal */}
          {previewJob && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeJobPreview}>
              <div className="glass-card max-w-3xl w-full p-0 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold text-cyan bg-cyan/10 px-2 py-0.5 rounded">ADMIN PREVIEW</span>
                      </div>
                      <h2 className="text-xl font-bold text-primary truncate">
                        {isLoadingDetail ? 'Loading...' : previewJobDetail?.title || previewJob.title}
                      </h2>
                    </div>
                    <button
                      onClick={closeJobPreview}
                      className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors flex-shrink-0"
                    >
                      <XCircle size={20} className="text-red" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5">
                  {isLoadingDetail ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan mx-auto mb-4" />
                      <p className="text-secondary text-sm">Retrieving full job details...</p>
                    </div>
                  ) : previewJobDetail ? (
                    <div className="space-y-5">

                      {/* Status & Visibility Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(() => {
                          const s = previewJobDetail.status;
                          const label = s === 0 ? 'Draft' : s === 1 ? 'Open' : s === 2 ? 'Closed' : s === 3 ? 'Cancelled' : `Status ${s}`;
                          const cls = s === 0 ? 'badge-amber' : s === 1 ? 'badge-green' : s === 2 ? 'badge-red' : 'badge-red';
                          return <span className={`${cls} text-xs`}>{label}</span>;
                        })()}
                        {(() => {
                          const v = previewJobDetail.visibility;
                          if (v === 3) return <span className="badge-amber text-xs flex items-center gap-1"><Lock size={10} /> Locked</span>;
                          if (v === 1) return <span className="badge-purple text-xs">Private</span>;
                          if (v === 2) return <span className="badge-cyan text-xs">Invite Only</span>;
                          return <span className="badge-green text-xs">Public</span>;
                        })()}
                        <span className="badge-purple text-xs">Fixed Price</span>
                        {previewJobDetail.categoryName && (
                          <span className="badge-cyan text-xs">{previewJobDetail.categoryName}</span>
                        )}
                        {previewJobDetail.majorName && (
                          <span className="text-xs text-secondary bg-white/5 px-2 py-0.5 rounded border border-white/10">{previewJobDetail.majorName}</span>
                        )}
                      </div>

                      {/* Key Info Grid */}
                      <div className="glass-card p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                          {/* Client / Posted By */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">Posted By</p>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {(previewJobDetail.clientFullName || '?')[0]?.toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-primary truncate">
                                {previewJobDetail.clientFullName || 'Unknown Client'}
                              </span>
                            </div>
                          </div>

                          {/* Budget */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">Budget Range</p>
                            <div className="flex items-center gap-1.5">
                              <GCoinIcon size={14} />
                              <span className="text-sm font-bold text-primary">
                                {(previewJobDetail.budgetMin ?? 0).toLocaleString()} – {(previewJobDetail.budgetMax ?? 0).toLocaleString()}
                              </span>
                              <span className="text-xs text-muted">{previewJobDetail.currency || 'GIG'}</span>
                            </div>
                          </div>

                          {/* Elo */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">Client Elo Score</p>
                            <div className="flex items-center gap-1.5">
                              <Award size={14} className="text-amber" />
                              <span className="text-sm font-bold text-primary">{previewJobDetail.eloPoints ?? 100}</span>
                              <span className="text-xs text-muted">points</span>
                            </div>
                          </div>

                          {/* Duration */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">Est. Duration</p>
                            <div className="flex items-center gap-1.5">
                              <Clock8 size={14} className="text-purple" />
                              <span className="text-sm font-medium text-primary">{previewJobDetail.estimatedDuration || 'Not specified'}</span>
                            </div>
                          </div>

                          {/* Location */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">Location</p>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={14} className="text-cyan" />
                              <span className="text-sm font-medium text-primary">{previewJobDetail.location || 'Remote'}</span>
                            </div>
                          </div>

                          {/* Posted Date */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">Posted On</p>
                            <div className="flex items-center gap-1.5">
                              <Calendar size={14} className="text-green" />
                              <span className="text-sm font-medium text-primary">
                                {new Date(previewJobDetail.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Deadline */}
                          {previewJobDetail.endDate && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">Deadline</p>
                              <div className="flex items-center gap-1.5">
                                <AlertCircle size={14} className="text-red" />
                                <span className="text-sm font-medium text-primary">
                                  {new Date(previewJobDetail.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">Description</h4>
                        <div className="glass-card p-4">
                          <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                            {previewJobDetail.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Contract & Milestones */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">Contract & Milestones</h4>
                        <div className="glass-card p-4 space-y-4">
                          {isLoadingMilestones ? (
                            <div className="py-4 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan mx-auto animate-duration-1000" />
                              <p className="text-xs text-secondary mt-2">Checking milestones...</p>
                            </div>
                          ) : !jobContract ? (
                            <div className="text-center py-2">
                              <p className="text-xs text-secondary italic">No active contract or milestones set for this job post yet.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Contract Header Info */}
                              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <div>
                                  <p className="text-sm font-semibold text-primary">{jobContract.title}</p>
                                  <p className="text-[10px] text-muted mt-0.5">
                                    Contract ID: <span className="font-mono">{jobContract.contractsId}</span>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 justify-end">
                                    <GCoinIcon size={12} />
                                    <span className="text-xs font-bold text-cyan">{jobContract.totalBudget.toLocaleString()} G</span>
                                  </div>
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-1 ${jobContract.status === 7 ? 'bg-green/10 text-green border border-green/20' :
                                    jobContract.status === 8 ? 'bg-cyan/10 text-cyan border border-cyan/20' :
                                      jobContract.status === 9 ? 'bg-red/10 text-red border border-red/20' :
                                        'bg-white/5 text-secondary border border-white/10'
                                    }`}>
                                    {jobContract.status === 7 ? 'Active' :
                                      jobContract.status === 8 ? 'Completed' :
                                        jobContract.status === 9 ? 'Cancelled' : 'Draft/Negotiation'}
                                  </span>
                                </div>
                              </div>

                              {/* Current Milestone Detail */}
                              {currentMilestone ? (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="badge-cyan text-[10px]">Current Milestone</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${currentMilestone.status === 3 || currentMilestone.status === 5 ? 'bg-green/10 text-green' :
                                      currentMilestone.status === 2 ? 'bg-amber/10 text-amber' :
                                        currentMilestone.status === 1 ? 'bg-purple/10 text-purple' : 'bg-white/10 text-muted'
                                      }`}>
                                      {currentMilestone.status === 0 ? 'Pending' :
                                        currentMilestone.status === 1 ? 'In Progress' :
                                          currentMilestone.status === 2 ? 'Submitted' :
                                            currentMilestone.status === 3 ? 'Approved' :
                                              currentMilestone.status === 4 ? 'Proof Uploaded' :
                                                currentMilestone.status === 5 ? 'Payment Confirmed' : 'Disputed'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-primary">{currentMilestone.title}</p>
                                  <div className="flex items-center justify-between text-[11px] text-secondary mt-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-1">
                                      <GCoinIcon size={12} />
                                      <span className="font-semibold text-primary">{currentMilestone.amount.toLocaleString()} G</span>
                                    </div>
                                    {currentMilestone.dueDate && (
                                      <span>Due: {new Date(currentMilestone.dueDate).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-secondary italic">No active milestones configured.</p>
                              )}

                              {/* View & Manage All Button */}
                              <button
                                onClick={() => {
                                  setShowMilestonesModal(true);
                                  setMilestoneError(null);
                                }}
                                className="w-full btn-ghost-cyan py-2 text-xs flex items-center justify-center gap-1.5 font-semibold mt-2"
                              >
                                <Filter size={12} />
                                View & Manage All Milestones ({jobMilestones.length})
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Skills */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">
                          Skills ({(previewJobDetail.skills?.length || 0) + (previewJobDetail.customSkillNames?.length || 0)})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {previewJobDetail.skills?.map((skill: any) => (
                            <span key={skill.jobPostSkillsId || skill.skillsId} className="badge-purple text-xs">{skill.skillName || skill.name}</span>
                          ))}
                          {previewJobDetail.customSkillNames?.map((custom: string, idx: number) => (
                            <span key={`custom-${idx}`} className="text-xs bg-cyan/10 text-cyan border border-cyan/20 px-2.5 py-0.5 rounded-full">{custom}</span>
                          ))}
                          {(!previewJobDetail.skills?.length && !previewJobDetail.customSkillNames?.length) && (
                            <span className="text-xs text-muted italic">No skills specified</span>
                          )}
                        </div>
                      </div>

                      {/* Attachments */}
                      {previewJobDetail.attachments && previewJobDetail.attachments.length > 0 && (
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">
                            Attachments ({previewJobDetail.attachments.length})
                          </h4>
                          <div className="space-y-2">
                            {previewJobDetail.attachments.map((att: any) => (
                              <div key={att.jobPostAttachmentsId} className="flex items-center justify-between p-3 rounded-lg glass-card text-xs group hover:border-cyan/30 transition-all">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <FileText size={14} className="text-secondary flex-shrink-0" />
                                  <span className="truncate text-primary font-medium">{att.fileName}</span>
                                </div>
                                {att.fileUrl ? (
                                  <a
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-cyan font-semibold hover:underline flex-shrink-0 ml-3"
                                  >
                                    <Download size={12} />
                                    Download
                                  </a>
                                ) : (
                                  <span className="text-muted flex-shrink-0 ml-3">No link</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Job Assets & Deliverables */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold flex items-center gap-1.5">
                          <Folder size={12} className="text-cyan" />
                          Job Assets & Deliverables ({jobAssets.length})
                        </h4>
                        {isLoadingJobAssets ? (
                          <div className="py-4 text-center glass-card">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan mx-auto" />
                          </div>
                        ) : jobAssets.length > 0 ? (
                          <div className="space-y-2">
                            {jobAssets.map((asset: any) => (
                              <div key={asset.assetId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg glass-card text-xs gap-2 hover:border-cyan/20 transition-all">
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <div className="p-1.5 rounded bg-white/5 flex-shrink-0">
                                    {getFileIcon(asset.mimeType, asset.fileName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-primary font-medium" title={asset.fileName}>{asset.fileName}</p>
                                    <p className="text-[10px] text-muted mt-0.5 font-mono">
                                      {formatBytes(asset.fileSize)} • By {asset.uploadedBy}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 justify-between sm:justify-end">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${asset.assetType === 'Deliverable'
                                    ? 'bg-green/10 text-green border border-green/20'
                                    : 'bg-purple/10 text-purple border border-purple/20'
                                    }`}>
                                    {asset.assetType === 'Deliverable' ? 'Final Handoff' : 'Milestone File'}
                                  </span>
                                  {asset.fileUrl ? (
                                    <a
                                      href={asset.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-cyan hover:underline font-semibold"
                                    >
                                      <Download size={12} />
                                      Download
                                    </a>
                                  ) : (
                                    <span className="text-muted">No Link</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center glass-card border border-dashed border-white/10">
                            <p className="text-xs text-secondary italic">No handover or milestone files uploaded yet for this job.</p>
                          </div>
                        )}
                      </div>

                      {/* System IDs (collapsible for admin reference) */}
                      <details className="group">
                        <summary className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold cursor-pointer select-none flex items-center gap-1 hover:text-secondary transition-colors">
                          <ExternalLink size={12} />
                          System Identifiers
                        </summary>
                        <div className="glass-card p-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted mb-0.5">Job Post ID</p>
                            <p className="text-primary font-mono select-all">{previewJobDetail.jobPostsId}</p>
                          </div>
                          <div>
                            <p className="text-muted mb-0.5">Client Profile ID</p>
                            <p className="text-primary font-mono select-all">{previewJobDetail.clientProfilesId}</p>
                          </div>
                          {previewJobDetail.majorCategoryId && (
                            <div>
                              <p className="text-muted mb-0.5">Major Category ID</p>
                              <p className="text-primary font-mono select-all">{previewJobDetail.majorCategoryId}</p>
                            </div>
                          )}
                        </div>
                      </details>

                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <AlertCircle size={32} className="mx-auto mb-3 text-red" />
                      <p className="text-red font-medium">Failed to load job details</p>
                      <p className="text-xs text-secondary mt-1">Please try again or check the backend connection.</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 flex-shrink-0">
                  <button
                    onClick={closeJobPreview}
                    className="btn-ghost-cyan px-5 py-2 text-sm"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => navigate(`/jobs/${previewJob.id}`)}
                    className="btn-cyan px-5 py-2 flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={14} />
                    Open Full Page
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmAction && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => {
              if (!isJobActionPending) setConfirmAction(null);
            }}>
              <div className="glass-card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-primary">Confirm Action</h3>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={isJobActionPending}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={18} className="text-red" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="glass-card p-4 mb-4">
                    <p className="text-sm font-semibold text-primary mb-1">{confirmAction.job.title}</p>
                    <p className="text-xs text-secondary line-clamp-2">{confirmAction.job.description}</p>
                  </div>

                  <div className="flex items-start gap-3 p-4 glass-card mb-4">
                    <div className={`p-2 rounded-lg ${confirmAction.type === 'delete' ? 'bg-red/20' :
                      confirmAction.type === 'lock' ? 'bg-amber/20' : 'bg-green/20'
                      }`}>
                      {confirmAction.type === 'delete' ? (
                        <Trash2 size={20} className="text-red" />
                      ) : confirmAction.type === 'lock' ? (
                        <Lock size={20} className="text-amber" />
                      ) : (
                        <Unlock size={20} className="text-green" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary mb-1">
                        {confirmAction.type === 'delete' && 'Delete Job Post'}
                        {confirmAction.type === 'lock' && 'Lock Job Post'}
                        {confirmAction.type === 'unlock' && 'Unlock Job Post'}
                      </p>
                      <p className="text-xs text-secondary">
                        {confirmAction.type === 'delete' && 'This job post will be permanently deleted from the database. This action is irreversible and leaves no log trace.'}
                        {confirmAction.type === 'lock' && 'This job will be locked and hidden from public view. Freelancers will not be able to submit proposals.'}
                        {confirmAction.type === 'unlock' && 'This job will be unlocked and visible to all users. Freelancers will be able to submit proposals.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={isJobActionPending}
                    className="flex-1 btn-ghost-cyan px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirmAction.type === 'delete') {
                        void handleDeleteJob(confirmAction.job);
                      } else {
                        void handleLockToggle(confirmAction.job);
                      }
                    }}
                    disabled={isJobActionPending}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${confirmAction.type === 'delete'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : confirmAction.type === 'lock'
                        ? 'bg-amber/20 text-amber border border-amber hover:bg-amber/30'
                        : 'bg-green/20 text-green border border-green hover:bg-green/30'
                      }`}
                  >
                    {isJobActionPending ? 'Working…' : (
                      <>
                        {confirmAction.type === 'delete' && 'Delete Job'}
                        {confirmAction.type === 'lock' && 'Lock Job'}
                        {confirmAction.type === 'unlock' && 'Unlock Job'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Milestones Management Modal */}
          {showMilestonesModal && jobContract && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[70] p-4" onClick={() => setShowMilestonesModal(false)}>
              <div className="glass-card max-w-4xl w-full p-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-primary">Manage Milestones</h3>
                    <p className="text-xs text-secondary mt-0.5">Contract: <span className="font-semibold text-cyan">{jobContract.title}</span></p>
                  </div>
                  <button
                    onClick={() => setShowMilestonesModal(false)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                {/* Error Alert */}
                {milestoneError && (
                  <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-xs flex items-center gap-2 flex-shrink-0">
                    <AlertCircle size={14} />
                    <span>{milestoneError}</span>
                  </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4">

                  {/* Create/Edit Form (Collapsible/Conditional Inline panel) */}
                  {(showCreateMilestoneForm || editingMilestone) && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                      <h4 className="text-sm font-bold text-primary">
                        {showCreateMilestoneForm ? 'Create New Milestone' : 'Edit Milestone'}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Title */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Milestone Title</label>
                          <input
                            type="text"
                            value={milestoneForm.title}
                            onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                            placeholder="e.g. Design mockups approval"
                            className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-primary focus:outline-none focus:border-cyan text-sm"
                          />
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Budget Amount (VND / G-coin)</label>
                          <input
                            type="number"
                            value={milestoneForm.amount}
                            onChange={e => setMilestoneForm({ ...milestoneForm, amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-primary focus:outline-none focus:border-cyan text-sm"
                          />
                        </div>

                        {/* Due Date */}
                        <div>
                          <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Due Date</label>
                          <input
                            type="date"
                            value={milestoneForm.dueDate}
                            onChange={e => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-primary focus:outline-none focus:border-cyan text-sm"
                          />
                        </div>

                        {/* Status (Only when editing) */}
                        {editingMilestone && (
                          <div>
                            <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Status</label>
                            <select
                              value={milestoneForm.status}
                              onChange={e => setMilestoneForm({ ...milestoneForm, status: parseInt(e.target.value) })}
                              style={{ backgroundColor: '#111827', color: '#f3f4f6' }}
                              className="w-full px-3 py-2 rounded-lg border border-white/10 text-secondary focus:outline-none focus:border-cyan text-sm"
                            >
                              <option value={0} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Pending</option>
                              <option value={1} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>In Progress</option>
                              <option value={2} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Submitted</option>
                              <option value={3} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Approved</option>
                              <option value={4} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Proof Uploaded</option>
                              <option value={5} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Payment Confirmed</option>
                              <option value={6} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>Disputed</option>
                            </select>
                          </div>
                        )}

                        {/* Sort Order */}
                        <div>
                          <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Sort Order (index)</label>
                          <input
                            type="number"
                            value={milestoneForm.sortOrder}
                            onChange={e => setMilestoneForm({ ...milestoneForm, sortOrder: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-primary focus:outline-none focus:border-cyan text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={() => {
                            setShowCreateMilestoneForm(false);
                            setEditingMilestone(null);
                          }}
                          className="btn-ghost-cyan px-4 py-1.5 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={showCreateMilestoneForm ? handleCreateMilestone : handleUpdateMilestone}
                          disabled={milestoneActionLoading}
                          className="btn-cyan px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                        >
                          {milestoneActionLoading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
                          Save Milestone
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List and actions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Milestones List ({jobMilestones.length})</p>
                      {!(showCreateMilestoneForm || editingMilestone) && (
                        <button
                          onClick={() => {
                            setShowCreateMilestoneForm(true);
                            setEditingMilestone(null);
                            setMilestoneForm({ title: '', amount: 0, dueDate: '', status: 0, sortOrder: jobMilestones.length });
                          }}
                          className="btn-cyan px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                        >
                          + Create Milestone
                        </button>
                      )}
                    </div>

                    {jobMilestones.length === 0 ? (
                      <div className="text-center py-10 glass-card">
                        <p className="text-xs text-secondary italic">No milestones defined yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {jobMilestones.map((milestone, idx) => (
                          <div key={milestone.milestonesId} className="p-4 rounded-xl glass-card border border-white/10 hover:border-cyan/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                            {/* Title and stats */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                  #{milestone.sortOrder ?? (idx + 1)}
                                </span>
                                <p className="text-sm font-semibold text-primary">{milestone.title}</p>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${milestone.status === 3 || milestone.status === 5 ? 'bg-green/10 text-green border border-green/20' :
                                  milestone.status === 2 ? 'bg-amber/10 text-amber border border-amber/20' :
                                    milestone.status === 1 ? 'bg-purple/10 text-purple border border-purple/20' :
                                      milestone.status === 6 ? 'bg-red/10 text-red border border-red/20' :
                                        'bg-white/5 text-secondary border border-white/10'
                                  }`}>
                                  {milestone.status === 0 ? 'Pending' :
                                    milestone.status === 1 ? 'In Progress' :
                                      milestone.status === 2 ? 'Submitted' :
                                        milestone.status === 3 ? 'Approved' :
                                          milestone.status === 4 ? 'Proof Uploaded' :
                                            milestone.status === 5 ? 'Payment Confirmed' :
                                              milestone.status === 6 ? 'Disputed' : 'Unknown'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-[11px] text-secondary">
                                <div className="flex items-center gap-1">
                                  <GCoinIcon size={12} />
                                  <span className="font-bold text-cyan">{milestone.amount.toLocaleString()} G</span>
                                </div>
                                {milestone.dueDate && (
                                  <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                                )}
                                {milestone.releasedAmount > 0 && (
                                  <span className="text-green">Released: {milestone.releasedAmount.toLocaleString()} G</span>
                                )}
                              </div>
                            </div>

                            {/* Action button groups */}
                            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">

                              {/* Override Actions */}
                              {milestone.status !== 3 && milestone.status !== 5 && (
                                <>
                                  <button
                                    onClick={() => handleOverrideAction(milestone.milestonesId, 'release')}
                                    disabled={milestoneActionLoading}
                                    className="px-2 py-1 rounded text-[10px] bg-green/10 text-green border border-green/30 hover:bg-green/20 font-bold transition-all"
                                  >
                                    Force Release
                                  </button>
                                  <button
                                    onClick={() => handleOverrideAction(milestone.milestonesId, 'refund')}
                                    disabled={milestoneActionLoading}
                                    className="px-2 py-1 rounded text-[10px] bg-red/10 text-red border border-red/30 hover:bg-red/20 font-bold transition-all"
                                  >
                                    Force Refund
                                  </button>
                                </>
                              )}

                              {/* Standard CRUD */}
                              <button
                                onClick={() => {
                                  setEditingMilestone(milestone);
                                  setShowCreateMilestoneForm(false);
                                  setMilestoneForm({
                                    title: milestone.title,
                                    amount: milestone.amount,
                                    dueDate: milestone.dueDate ? milestone.dueDate.split('T')[0] : '',
                                    status: milestone.status,
                                    sortOrder: milestone.sortOrder || 0
                                  });
                                }}
                                className="p-1.5 rounded glass-button hover:bg-cyan/10 transition-colors"
                                title="Edit milestone"
                              >
                                <Eye size={12} className="text-cyan" />
                              </button>
                              <button
                                onClick={() => handleDeleteMilestone(milestone.milestonesId)}
                                className="p-1.5 rounded glass-button hover:bg-red-500/10 transition-colors"
                                title="Delete milestone"
                              >
                                <Trash2 size={12} className="text-red" />
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end flex-shrink-0">
                  <button
                    onClick={() => setShowMilestonesModal(false)}
                    className="btn-cyan px-6 py-2 text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Recruitment screening Questions Modal */}
          {showQuestionsJob && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQuestionsJob(null)}>
              <div className="glass-card max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary">Recruitment Screening Questions</h3>
                    <p className="text-xs text-secondary mt-1">For: <span className="font-semibold text-primary">{showQuestionsJob.title}</span></p>
                  </div>
                  <button
                    onClick={() => setShowQuestionsJob(null)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                {isLoadingQuestions ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan mx-auto mb-2" />
                    <p className="text-xs text-secondary">Loading screening questions...</p>
                  </div>
                ) : questionsError ? (
                  <div className="glass-card p-4 border border-red/20 bg-red/5 text-red text-sm mb-4">
                    {questionsError}
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12 glass-card bg-white/5 border border-white/5">
                    <FileQuestion size={40} className="mx-auto mb-3 text-muted" />
                    <p className="text-sm text-primary font-medium">No Screening Questions Found</p>
                    <p className="text-xs text-secondary mt-1">This job post does not have any recruitment screening questions.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div key={q.jobPostQuestionsId || idx} className="glass-card p-4 hover:border-cyan/30 transition-all duration-300">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-xs font-bold text-cyan font-mono bg-cyan/10 px-2.5 py-0.5 rounded">
                            Question #{q.orderIndex ?? (idx + 1)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${q.isRequired
                            ? 'bg-red/10 text-red border border-red/20'
                            : 'bg-white/5 text-secondary border border-white/15'
                            }`}>
                            {q.isRequired ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <p className="text-sm text-primary font-medium leading-relaxed">{q.questionText}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowQuestionsJob(null)}
                    className="btn-ghost-cyan px-6 py-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
