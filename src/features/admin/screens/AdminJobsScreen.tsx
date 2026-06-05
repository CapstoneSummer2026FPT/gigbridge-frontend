import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, Briefcase, Eye, Lock, Unlock, MoreVertical, Calendar, DollarSign, Users, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import type { Job, JobPostSummaryDto } from '../../../types/models/Job';
import '../styles/admin-users-screen.css';

type JobFilter = 'all' | 'draft' | 'open' | 'in_progress' | 'closed';
type JobSort = 'posted' | 'title' | 'budget';

const experienceLevelMap: Record<number, Job['experienceLevel']> = {
  0: 'entry',
  1: 'intermediate',
  2: 'expert',
};

const mapJobPostSummaryToJob = (job: JobPostSummaryDto): Job => ({
  id: job.jobPostsId,
  clientId: '',
  title: job.title,
  description: job.descriptionPreview,
  category: 'Uncategorized',
  skills: job.skillNames || [],
  budgetMin: job.budgetMin ?? 0,
  budgetMax: job.budgetMax ?? 0,
  jobType: job.budgetType === 1 ? 'hourly' : 'fixed',
  experienceLevel: experienceLevelMap[job.experienceLevelRequired ?? 1] ?? 'intermediate',
  status: 'open',
  proposalCount: 0,
  viewCount: 0,
  postedAt: job.createdAt,
  isRemote: job.locationType == null || job.locationType === 0,
  gigcoin_cost: 0,
});

export default function AdminJobsScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<JobFilter>('all');
  const [sortBy, setSortBy] = useState<JobSort>('posted');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{type: 'lock' | 'unlock', job: Job} | null>(null);
  const [lockedJobs, setLockedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      setJobsError(null);

      const response = await jobGetAPI.getAllJobPosts({
        PageIndex: 1,
        PageSize: 200,
      });

      if (response.success && response.data) {
        setAllJobs(response.data.map(mapJobPostSummaryToJob));
      } else {
        setAllJobs([]);
        setJobsError(response.message || 'Failed to load jobs');
      }

      setIsLoadingJobs(false);
    };

    fetchJobs();
  }, []);

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = allJobs.filter(job => {
      const matchesSearch = searchQuery === '' ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterType === 'all' ? true :
        job.status === filterType;

      return matchesSearch && matchesFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'posted') return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      if (sortBy === 'budget') return b.budgetMax - a.budgetMax;
      return 0;
    });

    return filtered;
  }, [allJobs, searchQuery, filterType, sortBy]);

  const stats = useMemo(() => {
    const total = allJobs.length;
    const draft = allJobs.filter(j => j.status === 'draft').length;
    const open = allJobs.filter(j => j.status === 'open').length;
    const inProgress = allJobs.filter(j => j.status === 'in_progress').length;
    const closed = allJobs.filter(j => j.status === 'closed').length;
    const locked = lockedJobs.size;

    return { total, draft, open, inProgress, closed, locked };
  }, [allJobs, lockedJobs]);

  const handleLockToggle = (jobId: string) => {
    const newLocked = new Set(lockedJobs);
    if (newLocked.has(jobId)) {
      newLocked.delete(jobId);
      alert('Job unlocked successfully');
    } else {
      newLocked.add(jobId);
      alert('Job locked successfully');
    }
    setLockedJobs(newLocked);
    setConfirmAction(null);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'draft') return <span className="badge-gray text-xs">Draft</span>;
    if (status === 'open') return <span className="badge-green text-xs">Open</span>;
    if (status === 'in_progress') return <span className="badge-cyan text-xs">In Progress</span>;
    return <span className="badge-red text-xs">Closed</span>;
  };

  const getJobTypeBadge = (jobType: string) => {
    return jobType === 'fixed'
      ? <span className="badge-purple text-xs">Fixed Price</span>
      : <span className="badge-amber text-xs">Hourly</span>;
  };

  const getClientName = (clientId: string) => {
    return clientId || 'Unknown Client';
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
              { label: 'In Progress', value: stats.inProgress.toString(), icon: <Clock size={16} />, color: 'purple' },
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
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by title, description, or category..."
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
                      { type: 'in_progress', label: 'In Progress', icon: <Clock size={14} />, color: 'purple' },
                      { type: 'closed', label: 'Closed', icon: <XCircle size={14} />, color: 'red' },
                    ].map(filter => (
                      <button
                        key={filter.type}
                        onClick={() => setFilterType(filter.type as JobFilter)}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                          filterType === filter.type
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
                      onChange={e => setSortBy(e.target.value as JobSort)}
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
                  Showing <span className="text-primary font-semibold">{filteredJobs.length}</span> of <span className="text-primary font-semibold">{allJobs.length}</span> jobs
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
                            {lockedJobs.has(job.id) && <Lock size={10} className="text-amber flex-shrink-0" />}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-xs text-secondary truncate max-w-[120px]">{getClientName(job.clientId)}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <DollarSign size={12} className="text-green flex-shrink-0" />
                          <span className="text-xs text-primary font-semibold">
                            ${job.budgetMin.toLocaleString()} - ${job.budgetMax.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {getJobTypeBadge(job.jobType)}
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
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewJob(job)}
                            className="p-1.5 rounded-lg glass-button hover:bg-cyan/10 transition-colors flex-shrink-0"
                            title="Preview Job"
                          >
                            <Eye size={14} className="text-cyan" />
                          </button>

                          <button
                            onClick={() => {
                              setConfirmAction({
                                type: lockedJobs.has(job.id) ? 'unlock' : 'lock',
                                job
                              });
                            }}
                            className={`p-1.5 rounded-lg glass-button transition-colors flex-shrink-0 ${
                              lockedJobs.has(job.id)
                                ? 'hover:bg-green/10'
                                : 'hover:bg-amber/10'
                            }`}
                            title={lockedJobs.has(job.id) ? 'Unlock Job' : 'Lock Job'}
                          >
                            {lockedJobs.has(job.id) ? (
                              <Unlock size={14} className="text-green" />
                            ) : (
                              <Lock size={14} className="text-amber" />
                            )}
                          </button>

                          <button
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            className="p-1.5 rounded-lg glass-button hover:bg-purple/10 transition-colors flex-shrink-0"
                            title="View Full Job"
                          >
                            <MoreVertical size={14} className="text-purple" />
                          </button>
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
                    {getJobTypeBadge(job.jobType)}
                    {lockedJobs.has(job.id) && (
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
                    <DollarSign size={12} className="text-green" />
                    <span className="text-primary font-semibold text-xs">
                      ${job.budgetMin.toLocaleString()} - ${job.budgetMax.toLocaleString()}
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

              <div className="flex gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => setPreviewJob(job)}
                  className="flex-1 btn-ghost-cyan px-3 py-2 text-xs flex items-center justify-center gap-1"
                >
                  <Eye size={14} />
                  Preview
                </button>
                <button
                  onClick={() => {
                    setConfirmAction({
                      type: lockedJobs.has(job.id) ? 'unlock' : 'lock',
                      job
                    });
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    lockedJobs.has(job.id)
                      ? 'bg-green/20 text-green border border-green'
                      : 'bg-amber/20 text-amber border border-amber'
                  }`}
                >
                  {lockedJobs.has(job.id) ? (
                    <>
                      <Unlock size={14} />
                      Unlock
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      Lock
                    </>
                  )}
                </button>
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

        {/* Preview Job Modal */}
        {previewJob && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewJob(null)}>
            <div className="glass-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">Job Preview</h2>
                <button
                  onClick={() => setPreviewJob(null)}
                  className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                >
                  <XCircle size={20} className="text-red" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Job Header */}
                <div className="glass-card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-primary mb-2">{previewJob.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(previewJob.status)}
                        {getJobTypeBadge(previewJob.jobType)}
                        <span className="badge-cyan text-xs">{previewJob.category}</span>
                        {lockedJobs.has(previewJob.id) && (
                          <span className="badge-amber text-xs flex items-center gap-1">
                            <Lock size={12} />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted mb-1">Budget</p>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-green" />
                        <p className="text-sm font-semibold text-primary">
                          ${previewJob.budgetMin.toLocaleString()} - ${previewJob.budgetMax.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Proposals</p>
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-cyan" />
                        <p className="text-sm font-semibold text-primary">{previewJob.proposalCount}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Posted</p>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-purple" />
                        <p className="text-sm font-semibold text-primary">
                          {new Date(previewJob.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Views</p>
                      <div className="flex items-center gap-1">
                        <Eye size={14} className="text-amber" />
                        <p className="text-sm font-semibold text-primary">{previewJob.viewCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-primary mb-3">Description</h4>
                  <p className="text-sm text-secondary leading-relaxed">{previewJob.description}</p>
                </div>

                {/* Skills */}
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-primary mb-3">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewJob.skills.map((skill, idx) => (
                      <span key={idx} className="badge-purple text-xs">{skill}</span>
                    ))}
                  </div>
                </div>

                {/* Client Info */}
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-primary mb-3">Client Information</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-sm font-bold text-white">
                      {getClientName(previewJob.clientId).split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{getClientName(previewJob.clientId)}</p>
                      <p className="text-xs text-secondary">Client ID: {previewJob.clientId}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-primary mb-3">Additional Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted mb-1">Job ID</p>
                      <p className="text-primary font-mono text-xs">{previewJob.id}</p>
                    </div>
                    <div>
                      <p className="text-muted mb-1">Experience Level</p>
                      <p className="text-primary capitalize">{previewJob.experienceLevel}</p>
                    </div>
                    <div>
                      <p className="text-muted mb-1">Remote</p>
                      <p className="text-primary">{previewJob.isRemote ? 'Yes' : 'No'}</p>
                    </div>
                    {previewJob.deadline && (
                      <div>
                        <p className="text-muted mb-1">Deadline</p>
                        <p className="text-primary">{new Date(previewJob.deadline).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setPreviewJob(null)}
                  className="btn-ghost-cyan px-6 py-2"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigate(`/jobs/${previewJob.id}`);
                  }}
                  className="btn-cyan px-6 py-2 flex items-center gap-2"
                >
                  <Eye size={16} />
                  View Full Job
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setConfirmAction(null)}>
            <div className="glass-card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-primary">Confirm Action</h3>
                <button
                  onClick={() => setConfirmAction(null)}
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
                  <div className={`p-2 rounded-lg ${confirmAction.type === 'lock' ? 'bg-amber/20' : 'bg-green/20'}`}>
                    {confirmAction.type === 'lock' ? (
                      <Lock size={20} className="text-amber" />
                    ) : (
                      <Unlock size={20} className="text-green" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">
                      {confirmAction.type === 'lock' ? 'Lock Job Post' : 'Unlock Job Post'}
                    </p>
                    <p className="text-xs text-secondary">
                      {confirmAction.type === 'lock'
                        ? 'This job will be locked and hidden from public view. Freelancers will not be able to submit proposals.'
                        : 'This job will be unlocked and visible to all users. Freelancers will be able to submit proposals.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 btn-ghost-cyan px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLockToggle(confirmAction.job.id)}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    confirmAction.type === 'lock'
                      ? 'bg-amber/20 text-amber border border-amber hover:bg-amber/30'
                      : 'bg-green/20 text-green border border-green hover:bg-green/30'
                  }`}
                >
                  {confirmAction.type === 'lock' ? 'Lock Job' : 'Unlock Job'}
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Click outside to close action menu */}
          {showActionMenu && (
            <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(null)} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
