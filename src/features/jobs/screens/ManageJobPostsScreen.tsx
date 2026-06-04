import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Edit3, AlertCircle, Search, Zap, Eye, X, ChevronDown } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/manage-job-posts-screen.css';

interface JobPost {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Open' | 'Closed' | 'Cancelled';
  budget: number;
  budgetType: 'Fixed' | 'Hourly';
  duration: string;
  skills: string[];
  proposals: number;
  isFeatured: boolean;
  hasActiveContract: boolean;
  createdAt: string;
}

const JOB_STATUSES: JobPost['status'][] = ['Draft', 'Open', 'Closed', 'Cancelled'];

export default function ManageJobPostsScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Open' | 'Closed' | 'Cancelled'>('All');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState<{ id: string; type: 'close' | 'cancel' } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mock job posts data
  const [jobPosts, setJobPosts] = useState<JobPost[]>([
    {
      id: 'job_1',
      title: 'Build E-Commerce Platform',
      description: 'Need a scalable e-commerce platform with React frontend',
      status: 'Open',
      budget: 5000,
      budgetType: 'Fixed',
      duration: '4 weeks',
      skills: ['React', 'Node.js', 'PostgreSQL'],
      proposals: 12,
      isFeatured: true,
      hasActiveContract: false,
      createdAt: '2024-01-15',
    },
    {
      id: 'job_2',
      title: 'Mobile App UI Design',
      description: 'Create UI mockups for mobile app',
      status: 'Draft',
      budget: 1500,
      budgetType: 'Fixed',
      duration: '2 weeks',
      skills: ['Figma', 'UI/UX Design'],
      proposals: 0,
      isFeatured: false,
      hasActiveContract: false,
      createdAt: '2024-01-20',
    },
    {
      id: 'job_3',
      title: 'Logo Design',
      description: 'Professional logo for startup',
      status: 'Closed',
      budget: 800,
      budgetType: 'Fixed',
      duration: '1 week',
      skills: ['Graphic Design', 'Branding'],
      proposals: 25,
      isFeatured: false,
      hasActiveContract: true,
      createdAt: '2024-01-10',
    },
    {
      id: 'job_4',
      title: 'Website Maintenance',
      description: 'Monthly website maintenance and updates',
      status: 'Open',
      budget: 50,
      budgetType: 'Hourly',
      duration: 'Ongoing',
      skills: ['WordPress', 'HTML/CSS'],
      proposals: 8,
      isFeatured: false,
      hasActiveContract: true,
      createdAt: '2024-01-05',
    },
  ]);

  const filteredJobs = jobPosts.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (jobId: string) => {
    navigate(`/jobs/${jobId}/edit`);
  };

  const handleCloseJob = (jobId: string) => {
    const job = jobPosts.find(j => j.id === jobId);
    if (job?.hasActiveContract) {
      setShowWarning({ id: jobId, type: 'close' });
    } else {
      setShowCloseConfirm(jobId);
    }
  };

  const handleCancelJob = (jobId: string) => {
    const job = jobPosts.find(j => j.id === jobId);
    if (job?.hasActiveContract) {
      setShowWarning({ id: jobId, type: 'cancel' });
    } else {
      setShowDeleteConfirm(jobId);
    }
  };

  const confirmClose = (jobId: string) => {
    setJobPosts(prev =>
      prev.map(j => (j.id === jobId ? { ...j, status: 'Closed' as const } : j))
    );
    setShowCloseConfirm(null);
    setShowWarning(null);
    setSuccessMessage('Job closed successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const confirmCancel = (jobId: string) => {
    setJobPosts(prev =>
      prev.map(j => (j.id === jobId ? { ...j, status: 'Cancelled' as const } : j))
    );
    setShowDeleteConfirm(null);
    setShowWarning(null);
    setSuccessMessage('Job cancelled successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePromote = (jobId: string) => {
    const job = jobPosts.find(j => j.id === jobId);
    if (!job) return;

    if (job.status !== 'Open') {
      alert('MSG44: Only Open jobs can be promoted');
      return;
    }

    if (job.isFeatured) {
      alert('This job is already featured');
      return;
    }

    setJobPosts(prev =>
      prev.map(j => (j.id === jobId ? { ...j, isFeatured: true } : j))
    );
    setSuccessMessage('Job promoted successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleStatusChange = (jobId: string, newStatus: JobPost['status']) => {
    const job = jobPosts.find(j => j.id === jobId);
    if (!job) return;

    // Check for active contracts when changing to Closed or Cancelled
    if ((newStatus === 'Closed' || newStatus === 'Cancelled') && job.hasActiveContract) {
      setShowWarning({ id: jobId, type: newStatus === 'Closed' ? 'close' : 'cancel' });
      return;
    }

    setJobPosts(prev =>
      prev.map(j => (j.id === jobId ? { ...j, status: newStatus } : j))
    );
    setSuccessMessage(`Job status changed to ${newStatus}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getStatusBadgeClass = (status: JobPost['status']) => {
    switch (status) {
      case 'Draft':
        return 'status-badge status-draft';
      case 'Open':
        return 'status-badge status-open';
      case 'Closed':
        return 'status-badge status-closed';
      case 'Cancelled':
        return 'status-badge status-cancelled';
    }
  };

  return (
    <AppLayout>
      <div className="manage-jobs-wrapper">
        {/* Header */}
        <div className="manage-jobs-header">
          <h1 className="manage-jobs-title">Job Posts Management</h1>
          <p className="manage-jobs-subtitle">
            Manage your job posts - {jobPosts.length} total
          </p>
          <button onClick={() => navigate('/jobs/post')} className="manage-jobs-new-btn">
            + New Job Post
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
          </div>
        )}

        {/* Search & Filter */}
        <div className="manage-jobs-controls glass-card">
          <div className="manage-jobs-search">
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title..."
              className="manage-jobs-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="manage-jobs-search-clear">
                ✕
              </button>
            )}
          </div>

          <div className="manage-jobs-tabs">
            {(['All', ...JOB_STATUSES] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as 'All' | 'Draft' | 'Open' | 'Closed' | 'Cancelled')}
                className={`manage-jobs-tab ${statusFilter === status ? 'active' : ''}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Job Posts Table */}
        <div className="manage-jobs-container">
          {filteredJobs.length === 0 ? (
            <div className="manage-jobs-empty">
              <Search size={48} />
              <p className="manage-jobs-empty-title">
                {searchQuery ? 'No jobs found' : 'No job posts yet'}
              </p>
              <p className="manage-jobs-empty-subtitle">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first job post to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/jobs/post')}
                  className="manage-jobs-empty-btn"
                >
                  Post a New Job
                </button>
              )}
            </div>
          ) : (
            <div className="manage-jobs-list">
              {/* Table Header */}
              <div className="manage-jobs-table-header">
                <div className="col-title">Job Title</div>
                <div className="col-status">Status</div>
                <div className="col-proposals">Proposals</div>
                <div className="col-budget">Budget</div>
                <div className="col-actions">Actions</div>
              </div>

              {/* Table Rows */}
              {filteredJobs.map(job => (
                <div key={job.id} className="manage-jobs-table-row">
                  {/* Title */}
                  <div className="col-title">
                    <div className="job-title-cell">
                      <div>
                        <h3 className="job-title-text">{job.title}</h3>
                        {job.isFeatured && (
                          <span className="featured-badge">
                            <Zap size={12} /> Featured
                          </span>
                        )}
                      </div>
                      <p className="job-meta">{job.duration} • {job.proposals} proposals</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-status">
                    <span className={getStatusBadgeClass(job.status)}>{job.status}</span>
                  </div>

                  {/* Proposals */}
                  <div className="col-proposals">
                    <span className="proposal-count">{job.proposals}</span>
                  </div>

                  {/* Budget */}
                  <div className="col-budget">
                    <span className="budget-text">
                      ${job.budget}{job.budgetType === 'Hourly' ? '/hr' : ''}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-actions">
                    <div className="job-actions">
                      <button
                        onClick={() => handleEdit(job.id)}
                        className="job-action-btn job-action-edit"
                        title="Edit job"
                        disabled={job.status === 'Closed' || job.status === 'Cancelled'}
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => navigate(`/jobs/${job.id}`, { state: { job } })}
                        className="job-action-btn job-action-view"
                        title="View job details"
                      >
                        <Eye size={16} />
                      </button>

                      {!job.isFeatured && (
                        <button
                          onClick={() => handlePromote(job.id)}
                          className="job-action-btn job-action-feature"
                          title="Feature this Job"
                        >
                          <Zap size={16} />
                        </button>
                      )}

                      <div className="job-actions-dropdown">
                        <button
                          className="job-action-btn job-action-menu"
                          title="More actions"
                        >
                          <ChevronDown size={16} />
                        </button>

                        <div className="job-dropdown-menu">
                          {JOB_STATUSES.filter(status => status !== job.status).map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(job.id, status)}
                              className={`dropdown-item ${
                                status === 'Closed'
                                  ? 'dropdown-close'
                                  : status === 'Cancelled'
                                    ? 'dropdown-cancel'
                                    : 'dropdown-status'
                              }`}
                            >
                              Change to {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Modals */}
                  {showCloseConfirm === job.id && (
                    <div className="job-confirmation-overlay">
                      <div className="job-confirmation-modal">
                        <AlertCircle size={24} className="confirmation-icon" />
                        <h3>Close this job?</h3>
                        <p>You can reopen it later if needed</p>
                        <div className="confirmation-actions">
                          <button
                            onClick={() => confirmClose(job.id)}
                            className="btn-primary"
                          >
                            Close Job
                          </button>
                          <button
                            onClick={() => setShowCloseConfirm(null)}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showDeleteConfirm === job.id && (
                    <div className="job-confirmation-overlay">
                      <div className="job-confirmation-modal">
                        <AlertCircle size={24} className="confirmation-icon" />
                        <h3>Cancel this job?</h3>
                        <p>Cancelled jobs cannot be reopened</p>
                        <div className="confirmation-actions">
                          <button
                            onClick={() => confirmCancel(job.id)}
                            className="btn-danger"
                          >
                            Cancel Job
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="btn-secondary"
                          >
                            Keep Job
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showWarning?.id === job.id && (
                    <div className="job-confirmation-overlay">
                      <div className="job-confirmation-modal warning">
                        <AlertCircle size={24} className="confirmation-icon warning-icon" />
                        <h3>
                          {showWarning.type === 'close'
                            ? 'Close job with active contracts?'
                            : 'Cancel job with active contracts?'}
                        </h3>
                        <p>This job has active contracts. Are you sure?</p>
                        <div className="confirmation-actions">
                          <button
                            onClick={() =>
                              showWarning.type === 'close'
                                ? confirmClose(job.id)
                                : confirmCancel(job.id)
                            }
                            className={showWarning.type === 'close' ? 'btn-primary' : 'btn-danger'}
                          >
                            {showWarning.type === 'close' ? 'Close' : 'Cancel'} Anyway
                          </button>
                          <button
                            onClick={() => setShowWarning(null)}
                            className="btn-secondary"
                          >
                            Keep Job
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Info */}
        {filteredJobs.length > 0 && (
          <div className="manage-jobs-results-info">
            <p>
              Showing <strong>{filteredJobs.length}</strong> of{' '}
              <strong>{jobPosts.length}</strong> job posts
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
