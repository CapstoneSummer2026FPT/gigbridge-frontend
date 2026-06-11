import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Clock, DollarSign, Users, Globe, Star, CheckCircle, Bot, Video, Send, Bookmark, Share2, ChevronRight, Zap, Edit3, FileText } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { jobPostAPI } from '../../../api/jobAPI/POST';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { userGetAPI } from '../../../api/userAPI/GET';
import type { Job } from '../../../mock_backend/types/legacy';
import type { User } from '../../../types/models/User';
import type { ClientProfile } from '../../../types/models/Profile';
import { UserRole } from '../../../types/models/User';
import '../styles/job-detail-screen.css';

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
  const fallbackJob = (location.state as { job?: JobLocationState } | null)?.job;
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({ coverLetter: '', bidAmount: '', deliveryDays: '' });
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [client, setClient] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [gigcoinBalance, setGigcoinBalance] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  // Fetch job details from API
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await jobGetAPI.getJobById(id);
        setJob(data.job);
        setClient(data.client || null);
        setClientProfile(data.clientProfile || null);
        
        // Fetch similar jobs
        const allJobs = await jobGetAPI.getJobs({ category: data.job.category });
        setSimilarJobs(allJobs.filter(j => j.id !== id).slice(0, 3));
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
  }, [id, fallbackJob]);

  useEffect(() => {
    const stored = window.localStorage.getItem('gb_saved_jobs');
    setSavedJobs(stored ? JSON.parse(stored) : []);
  }, []);

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

  // Fetch gigcoin balance for freelancers
  useEffect(() => {
    const fetchGigcoinBalance = async () => {
      if (role === UserRole.Freelancer && user) {
        try {
          const balance = await userGetAPI.getGigcoinBalance(user.id);
          setGigcoinBalance(balance.gigcoin_balance);
        } catch (error) {
          console.error('Failed to fetch gigcoin balance:', error);
        }
      }
    };
    fetchGigcoinBalance();
  }, [user, role]);

  const generateAIProposal = async () => {
    if (!job || !user || !client) return;
    
    setIsGeneratingProposal(true);
    try {
      const freelancerProfile = user; // Would get from profile API
      const coverLetter = await proposalPostAPI.generateAICoverLetter(
        job.title,
        job.skills
      );
      
      setProposalData({
        coverLetter,
        bidAmount: Math.round((job.budgetMin + job.budgetMax) / 2).toString(),
        deliveryDays: '28',
      });
    } catch (error) {
      console.error('Failed to generate proposal:', error);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!job || !user) return;
    
    setIsSubmitting(true);
    try {
      await proposalPostAPI.createProposal({
        jobId: job.id,
        freelancerId: user.id,
        clientId: job.clientId,
        coverLetter: proposalData.coverLetter,
        bidAmount: parseInt(proposalData.bidAmount),
        deliveryDays: parseInt(proposalData.deliveryDays),
      });
      setShowProposalForm(false);
      navigate('/proposals');
    } catch (error) {
      console.error('Failed to submit proposal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyJob = async () => {
    if (!job || !user) return;
    
    setIsApplying(true);
    try {
      await jobPostAPI.applyJob(job.id, user.id);
      setHasApplied(true);
      // Update gigcoin balance
      if (gigcoinBalance !== null) {
        setGigcoinBalance(gigcoinBalance - (job.gigcoin_cost || 0));
      }
      // Redirect to AI interview screen after successful application
      setTimeout(() => {
        navigate('/ai-interview');
      }, 500);
    } catch (error) {
      console.error('Failed to apply for job:', error);
    } finally {
      setIsApplying(false);
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

  const applicationCost = job.gigcoin_cost || 0;
  const canApplyWithGigcoins = applicationCost === 0 || (gigcoinBalance !== null && gigcoinBalance >= applicationCost);

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
                
                {/* Gigcoin Cost Display */}
                <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs job-detail-desc">Application Cost</span>
                    <div className="flex items-center gap-1">
                      <Zap size={14} className="text-purple" />
                      <span className="text-sm font-semibold text-primary">{applicationCost} GigCoins</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs job-detail-desc">Your Balance</span>
                    <span className={`text-sm font-semibold ${applicationCost === 0 || (gigcoinBalance !== null && gigcoinBalance >= applicationCost) ? 'text-green' : 'text-red'}`}>
                      {applicationCost === 0 && gigcoinBalance === null ? 'Not required' : `${gigcoinBalance !== null ? gigcoinBalance : '...'} GigCoins`}
                    </span>
                  </div>
                </div>

                {/* Apply Button or Insufficient Balance Message */}
                {hasApplied ? (
                  <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <CheckCircle size={16} className="text-green" />
                    <span className="text-xs text-green font-medium">Already applied to this job</span>
                  </div>
                ) : canApplyWithGigcoins ? (
                  <button 
                    onClick={handleApplyJob}
                    disabled={isApplying}
                    className="btn-cyan w-full py-2.5 text-sm flex items-center justify-center gap-2">
                    {isApplying ? (
                      <><div className="w-3 h-3 rounded-full border border-[#0077FF] border-t-transparent animate-spin" />Applying...</>
                    ) : (
                      <><Zap size={14} />Apply Now</>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate('/buy-gigcoin')}
                    className="btn-purple w-full py-2.5 text-sm flex items-center justify-center gap-2">
                    <Zap size={14} />
                    Buy GigCoins
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
