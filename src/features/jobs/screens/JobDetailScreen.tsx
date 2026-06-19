import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Clock, DollarSign, Users, Globe, Star, CheckCircle, Bot, Bookmark, Share2, ChevronRight, Edit3, FileText } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import type { Job } from '../../../types/models/Job';
import type { User } from '../../../types/models/User';
import { UserRole } from '../../../types/models/User';
import { ProposalStatus, type ProposalDetailDto } from '../../../types/models/Proposal';
import { canEditProposal, canViewContract, canWithdrawProposal, getStatusClass, getStatusLabel } from '../../proposals/utils/statusHelpers';

type ManageJobPostState = {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Open' | 'Closed' | 'Cancelled';
  budget: number;
  duration: string;
  skills: string[];
  proposals: number;
  createdAt: string;
};

type JobLocationState = ManageJobPostState | Job;
type JobDetailLocationState = {
  job?: JobLocationState;
  preferOwnedJob?: boolean;
} | null;

const toJobFromManageState = (job: ManageJobPostState): Job => ({
  id: job.id,
  clientId: '',
  title: job.title,
  description: job.description,
  category: 'All',
  skills: job.skills,
  budgetMin: job.budget,
  budgetMax: job.budget,
  jobType: 'fixed',
  status: job.status.toLowerCase() === 'cancelled' ? 'closed' : job.status.toLowerCase() as Job['status'],
  proposalCount: job.proposals,
  viewCount: 0,
  postedAt: job.createdAt,
  isRemote: true,
  gigcoin_cost: 0,
});

const formatStatus = (status: Job['status']) =>
  status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export default function JobDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useApp();
  const locationState = location.state as JobDetailLocationState;
  const fallbackJob = locationState?.job;
  const preferOwnedJob = locationState?.preferOwnedJob === true;
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [client, setClient] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProposal, setMyProposal] = useState<ProposalDetailDto | null>(null);
  const [proposalStatusLoading, setProposalStatusLoading] = useState(false);
  const [proposalStatusError, setProposalStatusError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [acceptedContractId, setAcceptedContractId] = useState<string | null>(null);
  const [contractLookupLoading, setContractLookupLoading] = useState(false);
  const [contractLookupMessage, setContractLookupMessage] = useState('');

  // Fetch job details from API
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        let data;
        try {
          data = await jobGetAPI.getJobById(id);
        } catch (pubError) {
          if (role === UserRole.Client) {
            // Try fetching client-owned job details (supports draft, in_progress, etc.)
            data = await jobGetAPI.getClientJobById(id);
          } else {
            throw pubError;
          }
        }
        setJob(data.job);
        setClient(data.client || null);
        setClientProfile(data.clientProfile || null);
        
        // Fetch similar jobs
        try {
          const allJobs = await jobGetAPI.getJobs({ category: data.job.category });
          setSimilarJobs(allJobs.filter(j => j.id !== id).slice(0, 3));
        } catch (similarError) {
          console.error('Failed to fetch similar jobs:', similarError);
          setSimilarJobs([]);
        }
      } catch (error) {
        console.error('Failed to fetch job details:', error);
        if (fallbackJob && fallbackJob.id === id) {
          setJob('budgetMin' in fallbackJob ? fallbackJob : toJobFromManageState(fallbackJob));
          setClient(null);
          setClientProfile(null);
          setSimilarJobs([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchJobDetails();
  }, [id, fallbackJob, role]);

  useEffect(() => {
    const stored = window.localStorage.getItem('gb_saved_jobs');
    setSavedJobs(stored ? JSON.parse(stored) : []);
  }, []);

  const loadMyProposalStatus = useCallback(async () => {
    if (!job?.id || role !== UserRole.Freelancer) {
      setMyProposal(null);
      return;
    }

    try {
      setProposalStatusLoading(true);
      setProposalStatusError('');

      const response = await proposalGetAPI.getMyProposalByJobPost(job.id);

      if (response.success && response.data) {
        setMyProposal(response.data);
        return;
      }

      setMyProposal(null);

      if (response.statusCode !== 404) {
        setProposalStatusError(response.message || 'Failed to load your proposal status.');
      }
    } catch (error) {
      console.error('Failed to load proposal status:', error);
      setProposalStatusError('Failed to load your proposal status.');
      setMyProposal(null);
    } finally {
      setProposalStatusLoading(false);
    }
  }, [job?.id, role]);

  useEffect(() => {
    loadMyProposalStatus();
  }, [loadMyProposalStatus]);

  useEffect(() => {
    const loadAcceptedContract = async () => {
      if (!myProposal?.proposalId || !canViewContract(myProposal.status)) {
        setAcceptedContractId(null);
        setContractLookupMessage('');
        return;
      }

      try {
        setContractLookupLoading(true);
        setContractLookupMessage('');
        const response = await contractGetAPI.getContractByProposal(myProposal.proposalId);

        if (response.success && response.data?.contractsId) {
          setAcceptedContractId(response.data.contractsId);
          return;
        }

        setAcceptedContractId(null);
        setContractLookupMessage(response.message || 'Contract is not available yet.');
      } catch (error) {
        console.error('Failed to load accepted proposal contract:', error);
        setAcceptedContractId(null);
        setContractLookupMessage('Contract is not available yet.');
      } finally {
        setContractLookupLoading(false);
      }
    };

    loadAcceptedContract();
  }, [myProposal?.proposalId, myProposal?.status]);

  const toggleSavedJob = () => {
    if (!job) return;
    if (!user || role !== UserRole.Freelancer) {
      alert('Please log in as a freelancer to save jobs.');
      return;
    }
    setSavedJobs(prev => {
      const next = prev.includes(job.id) ? prev.filter(id => id !== job.id) : [...prev, job.id];
      window.localStorage.setItem('gb_saved_jobs', JSON.stringify(next));
      return next;
    });
  };

  const handleWithdrawProposal = async () => {
    if (!myProposal?.proposalId || !canWithdrawProposal(myProposal.status)) return;

    const confirmed = window.confirm('Withdraw this proposal? You will not be able to apply again for this JobPost.');
    if (!confirmed) return;

    try {
      setWithdrawing(true);
      setProposalStatusError('');

      const response = await proposalPatchAPI.updateProposalStatus(myProposal.proposalId, { status: ProposalStatus.Withdrawn });

      if (!response.success) {
        setProposalStatusError(response.message || 'Failed to withdraw proposal.');
        return;
      }

      toast.success('Proposal withdrawn successfully.');
      await loadMyProposalStatus();
    } catch (error) {
      console.error('Failed to withdraw proposal:', error);
      setProposalStatusError('Failed to withdraw proposal.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-primary">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-primary font-semibold">Job not found</p>
          <button className="btn-cyan mt-4 px-4 py-2 text-sm" onClick={() => navigate('/jobs/my-jobs')}>
            Back to My Jobs
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="job-detail-page max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="glass-card p-6 job-detail-hero">
              <div className="flex items-start justify-between gap-4 mb-5 job-detail-hero-top">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="badge-cyan">{job.category}</span>
                    {job.isAiRecommended && <span className="badge-purple">⚡ AI Recommended</span>}
                    <span className={`job-detail-status job-detail-status-${job.status}`}>{formatStatus(job.status)}</span>
                  </div>
                  <h1 className="text-3xl font-black text-primary mb-3 job-detail-title">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm job-detail-meta">
                    <div className="flex items-center gap-1"><DollarSign size={14} />${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}</div>
                    <div className="flex items-center gap-1"><Globe size={14} />Remote</div>
                    <div className="flex items-center gap-1"><Users size={14} />{job.proposalCount} proposals</div>
                    <div className="flex items-center gap-1"><Clock size={14} />Posted {job.postedAt}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg transition-all job-detail-client-card" onClick={toggleSavedJob}>
                    <Bookmark size={16} fill={savedJobs.includes(job.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button className="p-2 rounded-lg transition-all job-detail-client-card">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              {role === UserRole.Client && (
                <div className="job-detail-client-actions">
                  <button
                    className="job-detail-primary-action"
                    onClick={() => navigate(`/jobs/${job.id}/edit`)}
                  >
                    <Edit3 size={16} />
                    Edit Jobpost
                  </button>
                  <button
                    className="job-detail-secondary-action"
                    onClick={() => navigate(`/proposals?job=${job.id}`)}
                  >
                    <FileText size={16} />
                    Manage Proposal
                    <span>{job.proposalCount}</span>
                  </button>
                </div>
              )}

              <div className="job-detail-quick-stats">
                {[
                  { label: 'Budget', value: `$${job.budgetMin.toLocaleString()} - $${job.budgetMax.toLocaleString()}` },
                  { label: 'Work type', value: 'Fixed Price' },
                  { label: 'Deadline', value: job.deadline || 'Flexible' },
                ].map(item => (
                  <div key={item.label} className="job-detail-stat-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              {/* AI Match Score (for freelancers) */}
              {role === UserRole.Freelancer && job.aiMatchScore && (
                <div className="p-4 rounded-xl mb-4 job-detail-proposal-bg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot size={20} className="job-detail-icon" />
                      <div>
                        <p className="text-primary font-semibold text-sm">AI Match Analysis</p>
                        <p className="text-xs job-detail-desc">Based on your profile and portfolio</p>
                      </div>
                    </div>
                    <div className={`match-score ${job.aiMatchScore >= 90 ? 'high' : 'medium'} text-sm px-3 py-1.5`}>
                      {job.aiMatchScore}% Match
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {['Skills Match', 'Profile Fit', 'Budget Align'].map((factor, i) => (
                      <div key={factor} className="text-center">
                        <div className="progress-bar-gb mb-1">
                          <div className="progress-bar-gb-fill" style={{ width: `${[92, 88, 95][i]}%` }} />
                        </div>
                        <p className="text-[10px] job-detail-desc">{factor}: {[92, 88, 95][i]}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons - Removed, using Apply Now button in sidebar instead */}
            </div>

            {/* Proposal Form - Removed */}

            {/* Job Description */}
            <div className="glass-card p-6">
              <h2 className="text-primary font-semibold mb-4">Job Description</h2>
              <div className="text-sm leading-relaxed whitespace-pre-line job-detail-desc">
                {job.description}
              </div>
            </div>

            {/* Skills Required */}
            <div className="glass-card p-6">
              <h2 className="text-primary font-semibold mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill: string) => (
                  <span key={skill} className="px-3 py-2 rounded-xl text-sm font-medium job-detail-proposal-bg">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Similar Jobs */}
            <div className="glass-card p-6">
              <h2 className="text-primary font-semibold mb-4">Similar Jobs</h2>
              <div className="space-y-3">
                {similarJobs.map(sj => (
                  <div key={sj.id} className="p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between job-detail-client-card"
                    onClick={() => navigate(`/jobs/${sj.id}`)}>
                    <div>
                      <p className="text-primary text-sm font-medium">{sj.title}</p>
                      <p className="text-xs mt-1 job-detail-desc">${sj.budgetMin.toLocaleString()}–${sj.budgetMax.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sj.aiMatchScore && <span className="match-score high text-xs">{sj.aiMatchScore}%</span>}
                      <ChevronRight size={16} className="job-detail-desc" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            {/* Client Info */}
            <div className="glass-card p-5">
              <h2 className="text-primary font-semibold mb-4 text-sm">About the Client</h2>
              <div className="flex items-center gap-3 mb-4">
                <img src={'https://via.placeholder.com/48'} alt={client?.full_name} className="w-12 h-12 rounded-xl avatar-glow" />
                <div>
                  <p className="text-primary font-semibold text-sm">{client?.full_name}</p>
                  <p className="text-xs job-detail-desc">{clientProfile?.company_name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs job-detail-desc">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star size={12} fill="#F59E0B" className="job-detail-star-icon" />
                    <span className="text-primary text-xs font-semibold">{clientProfile?.rating}</span>
                    <span className="text-xs job-detail-desc">({clientProfile?.reviewCount} reviews)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs job-detail-desc">Total Spent</span>
                  <span className="text-primary text-xs font-semibold">${((clientProfile?.totalSpent || 0) / 1000).toFixed(0)}K+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs job-detail-desc">Jobs Posted</span>
                  <span className="text-primary text-xs font-semibold">{clientProfile?.postedJobs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs job-detail-desc">Hire Rate</span>
                  <span className="text-xs font-semibold text-green">82%</span>
                </div>
                {clientProfile?.isVerifiedClient && (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <CheckCircle size={12} className="text-green" />
                    <span className="text-xs text-green">Payment Verified</span>
                  </div>
                )}
              </div>
              <button className="w-full mt-4 py-2 rounded-xl text-xs font-medium transition-all job-detail-client-card"
                onClick={() => navigate(`/profile/client/${job.clientId}`)}>
                View Client Profile
              </button>
            </div>

            {/* Job Details Summary */}
            <div className="glass-card p-5">
              <h2 className="text-primary font-semibold mb-4 text-sm">Job Details</h2>
              <div className="space-y-3">
                {[
                  { label: 'Budget', value: `$${job.budgetMin.toLocaleString()} – $${job.budgetMax.toLocaleString()}` },
                  { label: 'Type', value: 'Fixed Price' },
                  { label: 'Location', value: 'Remote Worldwide' },
                  { label: 'Proposals', value: `${job.proposalCount} submitted` },
                  { label: 'Deadline', value: job.deadline || 'Flexible' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-xs job-detail-desc">{item.label}</span>
                    <span className="text-xs font-medium text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Apply Job Section */}
            {role === UserRole.Freelancer && (
              <div className="glass-card p-5">
                <h2 className="text-primary font-semibold mb-4 text-sm">Apply to Job</h2>
                <p className="text-xs job-detail-desc mb-4">
                  Submit a focused proposal for this JobPost. You can review the job details before sending.
                </p>

                {proposalStatusLoading && (
                  <div className="job-detail-proposal-state">Checking your proposal status...</div>
                )}

                {proposalStatusError && (
                  <div className="job-detail-proposal-error">{proposalStatusError}</div>
                )}

                {!proposalStatusLoading && myProposal && (
                  <div className="job-detail-proposal-actions-stack">
                    <span className={getStatusClass(myProposal.status)}>{getStatusLabel(myProposal.status)}</span>

                    {canEditProposal(myProposal.status) && (
                      <button
                        onClick={() => navigate(`/proposals/${myProposal.proposalId}/edit`)}
                        className="btn-cyan w-full py-2.5 text-sm flex items-center justify-center gap-2"
                      >
                        <FileText size={14} />
                        Continue Editing
                      </button>
                    )}

                    {canWithdrawProposal(myProposal.status) && (
                      <button
                        onClick={handleWithdrawProposal}
                        disabled={withdrawing}
                        className="job-detail-secondary-action w-full justify-center"
                      >
                        {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                    )}

                    {canViewContract(myProposal.status) && (
                      <>
                        {contractLookupLoading && (
                          <div className="job-detail-proposal-state">Checking contract...</div>
                        )}
                        {!contractLookupLoading && acceptedContractId && (
                          <button
                            onClick={() => navigate(`/contracts/${acceptedContractId}`)}
                            className="job-detail-primary-action w-full justify-center"
                          >
                            <CheckCircle size={14} />
                            View Contract
                          </button>
                        )}
                        {!contractLookupLoading && !acceptedContractId && contractLookupMessage && (
                          <div className="job-detail-proposal-state">{contractLookupMessage}</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {!proposalStatusLoading && !myProposal && (
                  <button
                    onClick={() => navigate(`/proposals/create/${job.id}`)}
                    className="btn-cyan w-full py-2.5 text-sm flex items-center justify-center gap-2">
                    <FileText size={14} />
                    Apply JobPost
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
