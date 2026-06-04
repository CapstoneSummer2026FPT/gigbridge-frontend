import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Award, BarChart2, Briefcase, CheckCircle, Clock, DollarSign, Download, Eye, FileText, Rocket, Sparkles, Users, Video, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import { MOCK_PROPOSALS, type ProposalViewModel } from '../mock/data-for-ProposalsInboxScreen';
import { MOCK_BROWSE_JOBS } from '../../jobs/mock/data-for-BrowseJobsScreen';
import '../styles/proposals-inbox-screen.css';

type JobProposalGroup = {
  jobPostsId: string;
  jobTitle: string;
  proposals: ProposalViewModel[];
};

type ProposalDetailMode = 'score' | 'cv' | 'detail';
type ProposalStatusValue = 0 | 1 | 2 | 3 | 4;
type ProposalStatusFilter = 'all' | '0' | '1' | '2' | '3' | '4';
type ProposalSortBy = 'interviewScore' | 'status' | 'submittedAt' | 'rate';

const getStatusLabel = (status: ProposalViewModel['status'] | string | null | undefined) => {
  const normalizedStatus = Number(status ?? 0);
  if (normalizedStatus === 0) return 'Pending';
  if (normalizedStatus === 1) return 'Shortlisted';
  if (normalizedStatus === 2) return 'Accepted';
  if (normalizedStatus === 3) return 'Rejected';
  if (normalizedStatus === 4) return 'Withdrawn';
  return 'Pending';
};

const getStatusClass = (status: ProposalViewModel['status'] | string | null | undefined) => {
  const label = getStatusLabel(status).toLowerCase();
  if (label === 'shortlisted') return 'proposal-status proposal-status-shortlisted';
  if (label === 'accepted') return 'proposal-status proposal-status-accepted';
  if (label === 'rejected') return 'proposal-status proposal-status-rejected';
  if (label === 'withdrawn') return 'proposal-status proposal-status-withdrawn';
  return 'proposal-status proposal-status-pending';
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default function ProposalsInboxScreen() {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [proposals, setProposals] = useState<ProposalViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobProposalGroup | null>(null);
  const [managingJob, setManagingJob] = useState<JobProposalGroup | null>(null);
  const [proposalStatusFilter, setProposalStatusFilter] = useState<ProposalStatusFilter>('all');
  const [proposalSortBy, setProposalSortBy] = useState<ProposalSortBy>('interviewScore');
  const [proposalDetail, setProposalDetail] = useState<{ proposal: ProposalViewModel; mode: ProposalDetailMode } | null>(null);
  const [inviteProposal, setInviteProposal] = useState<ProposalViewModel | null>(null);
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [sentInvites, setSentInvites] = useState<string[]>([]);
  const [isPremiumFreelancer] = useState(true);
  const [tokenBalance, setTokenBalance] = useState(120);
  const [boostAmount, setBoostAmount] = useState(10);
  const [boostError, setBoostError] = useState('');
  const [boostSuccess, setBoostSuccess] = useState('');
  const [competitionJob, setCompetitionJob] = useState<JobProposalGroup | null>(null);
  const [competitionError, setCompetitionError] = useState('');

  const isClient = role === 0;

  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = isClient
          ? await proposalGetAPI.getAllProposals()
          : await proposalGetAPI.getMyProposals();
        setProposals(response.data?.length ? response.data.map((proposal, index) => ({
          ...proposal,
          updatedAt: proposal.reviewedAt || proposal.submittedAt,
          isAIGenerated: index % 2 === 0,
          interviewScore: Math.max(58, 96 - index * 7),
          rankingScore: Math.max(58, 96 - index * 7),
          boostedTokenAmount: 0,
          attachments: [
            {
              propoAttach_ProposalAttachmentsId: `api_attach_${proposal.proposalsId}`,
              propo_ProposalsId: proposal.proposalsId,
              fileName: `${proposal.freelancerName || 'Freelancer'}_CV.pdf`,
              fileUrl: '#',
              fileSize: 700000 + index * 42000,
              createdAt: proposal.submittedAt,
            },
          ],
        })) : MOCK_PROPOSALS);
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
        setProposals(MOCK_PROPOSALS);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [user, isClient]);

  const jobGroups = useMemo<JobProposalGroup[]>(() => {
    const groups = new Map<string, JobProposalGroup>();

    proposals.forEach(proposal => {
      const id = proposal.jobPostsId || 'unknown-job';
      const current = groups.get(id);

      if (current) {
        current.proposals.push(proposal);
        return;
      }

      groups.set(id, {
        jobPostsId: id,
        jobTitle: proposal.jobTitle || 'Untitled JobPost',
        proposals: [proposal],
      });
    });

    return Array.from(groups.values()).sort((a, b) => b.proposals.length - a.proposals.length);
  }, [proposals]);

  useEffect(() => {
    const jobId = searchParams.get('job');
    if (!jobId || jobGroups.length === 0) return;

    const group = jobGroups.find(item => item.jobPostsId === jobId);
    if (group) setManagingJob(group);
  }, [jobGroups, searchParams]);

  const updateProposalStatus = async (proposalId: string, status: ProposalStatusValue) => {
    try {
      await proposalPutAPI.updateProposalStatus(proposalId, String(status));
      setProposals(prev =>
        prev.map(proposal =>
          proposal.proposalsId === proposalId
            ? { ...proposal, status, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : proposal
        )
      );
    } catch (error) {
      console.error('Failed to update proposal status:', error);
    }
  };

  const totalPending = proposals.filter(proposal => getStatusLabel(proposal.status) === 'Pending').length;
  const openJobs = MOCK_BROWSE_JOBS.filter(job => job.status === 'open');
  const activeManagingJob = managingJob
    ? jobGroups.find(group => group.jobPostsId === managingJob.jobPostsId) || managingJob
    : null;

  const visibleManagingProposals = useMemo(() => {
    const items = activeManagingJob?.proposals || [];
    const filtered = proposalStatusFilter === 'all'
      ? items
      : items.filter(proposal => String(proposal.status) === proposalStatusFilter);

    return [...filtered].sort((a, b) => {
      if ((a.boostedTokenAmount || 0) !== (b.boostedTokenAmount || 0)) return (b.boostedTokenAmount || 0) - (a.boostedTokenAmount || 0);
      if (proposalSortBy === 'interviewScore') return (b.interviewScore || 0) - (a.interviewScore || 0);
      if (proposalSortBy === 'status') return Number(a.status) - Number(b.status);
      if (proposalSortBy === 'rate') return (b.proposedRate || 0) - (a.proposedRate || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [activeManagingJob, proposalSortBy, proposalStatusFilter]);

  const freelancerVisibleProposals = useMemo(() => {
    const filtered = proposalStatusFilter === 'all'
      ? proposals
      : proposals.filter(proposal => String(proposal.status) === proposalStatusFilter);

    return [...filtered].sort((a, b) =>
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );
  }, [proposals, proposalStatusFilter]);

  const sendInterviewInvite = () => {
    if (!inviteProposal) return;
    setInviteError('');
    setInviteSuccess('');

    if (openJobs.length === 0) {
      setInviteError('MSG62: Please create a job post first');
      return;
    }

    if (!inviteJobId) {
      setInviteError('Please select a job post');
      return;
    }

    const inviteKey = `${inviteProposal.freelancerProfilesId}_${inviteJobId}`;
    if (sentInvites.includes(inviteKey)) {
      setInviteError('An interview invitation was already sent for this freelancer and job.');
      return;
    }

    setSentInvites(prev => [...prev, inviteKey]);
    setInviteSuccess('Interview invitation sent. Freelancer notified and invitation expires in 7 days.');
    setTimeout(() => setInviteProposal(null), 1200);
  };

  const boostProposal = (proposal: ProposalViewModel) => {
    setBoostError('');
    setBoostSuccess('');

    if (!isPremiumFreelancer) {
      setBoostError('MSG45: This feature requires a Premium subscription');
      return;
    }

    if (getStatusLabel(proposal.status) !== 'Pending') {
      setBoostError('Only pending proposals can be boosted.');
      return;
    }

    if (tokenBalance < boostAmount) {
      setBoostError('MSG46: Insufficient balance. Please top up your wallet.');
      return;
    }

    setTokenBalance(prev => prev - boostAmount);
    setProposals(prev => prev.map(item => item.proposalsId === proposal.proposalsId
      ? {
          ...item,
          boostedTokenAmount: (item.boostedTokenAmount || 0) + boostAmount,
          rankingScore: (item.rankingScore || item.interviewScore || 0) + boostAmount,
          updatedAt: new Date().toISOString(),
        }
      : item
    ));
    setBoostSuccess(`Boost successful. ${boostAmount} tokens deducted and ranking score increased.`);
  };

  const openCompetitionMatrix = (job: JobProposalGroup) => {
    setCompetitionError('');

    if (!isPremiumFreelancer) {
      setCompetitionError('MSG45: This feature requires a Premium subscription');
      return;
    }

    if (job.proposals.length < 3) {
      setCompetitionError('MSG74: Not enough data for analysis (minimum 3 proposals required)');
      return;
    }

    setCompetitionJob(job);
  };

  const competitionStats = useMemo(() => {
    if (!competitionJob) return null;
    const rates = competitionJob.proposals.map(proposal => proposal.proposedRate || 0);
    const scores = competitionJob.proposals.map(proposal => proposal.interviewScore || 0);
    return {
      minBid: Math.min(...rates),
      avgBid: Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length),
      maxBid: Math.max(...rates),
      proposalCount: competitionJob.proposals.length,
      highScore: scores.filter(score => score >= 85).length,
      midScore: scores.filter(score => score >= 70 && score < 85).length,
      lowScore: scores.filter(score => score < 70).length,
    };
  }, [competitionJob]);

  return (
    <AppLayout>
      <div className="proposals-page">
        <div className="proposals-header">
          <div>
            <h1>Proposal Management</h1>
            <p>
              {isClient
                ? 'Review proposals grouped by JobPost.'
                : 'Track proposals grouped by the jobs you applied to.'}
            </p>
          </div>
          <div className="proposals-header-stats">
            <div>
              <span>JobPosts</span>
              <strong>{jobGroups.length}</strong>
            </div>
            <div>
              <span>Proposals</span>
              <strong>{proposals.length}</strong>
            </div>
            <div>
              <span>Pending</span>
              <strong>{totalPending}</strong>
            </div>
          </div>
        </div>

        {!isClient && (
          <div className="proposal-premium-strip">
            <div>
              <span>Premium Freelancer</span>
              <strong>{isPremiumFreelancer ? 'Active' : 'Inactive'}</strong>
            </div>
            <div>
              <span>Token Balance</span>
              <strong>{tokenBalance}</strong>
            </div>
            <label>
              <span>Boost tokens</span>
              <input type="number" min="1" value={boostAmount} onChange={event => setBoostAmount(Math.max(1, Number(event.target.value) || 1))} />
            </label>
          </div>
        )}

        {(boostError || boostSuccess || competitionError) && (
          <div className={`proposal-feedback ${boostError || competitionError ? 'error' : 'success'}`}>
            {boostError || competitionError || boostSuccess}
          </div>
        )}

        {!isClient && (
          <div className="freelancer-proposals-shell">
            <div className="freelancer-proposals-toolbar">
              <div>
                <h2>My Proposals & Applications</h2>
                <p>Sorted by submitted date, newest first. Accepted proposals link to their contract.</p>
              </div>
              <label>
                <span>Filter by status</span>
                <select value={proposalStatusFilter} onChange={event => setProposalStatusFilter(event.target.value as ProposalStatusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="0">Pending</option>
                  <option value="1">Shortlisted</option>
                  <option value="2">Accepted</option>
                  <option value="3">Rejected</option>
                  <option value="4">Withdrawn</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="proposals-empty">
                <Clock size={28} />
                <p>Loading your proposals...</p>
              </div>
            ) : freelancerVisibleProposals.length === 0 ? (
              <div className="proposals-empty">
                <FileText size={32} />
                <p>No proposals found</p>
                <span>Your submitted applications will appear here.</span>
              </div>
            ) : (
              <div className="freelancer-proposal-list">
                {freelancerVisibleProposals.map(proposal => {
                  const accepted = getStatusLabel(proposal.status) === 'Accepted';
                  const relatedJob = jobGroups.find(group => group.jobPostsId === proposal.jobPostsId);

                  return (
                    <article key={proposal.proposalsId} className="freelancer-proposal-card">
                      <div className="freelancer-proposal-top">
                        <div>
                          <div className="freelancer-proposal-title">
                            <Briefcase size={18} />
                            <h3>{proposal.jobTitle || 'Untitled JobPost'}</h3>
                            <span className={getStatusClass(proposal.status)}>{getStatusLabel(proposal.status)}</span>
                          </div>
                          <p>{proposal.coverLetter || 'No cover letter provided.'}</p>
                        </div>
                        <div className="freelancer-proposal-rate">
                          <span>Bid</span>
                          <strong>${(proposal.proposedRate || 0).toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="freelancer-proposal-meta">
                        <div>
                          <Clock size={14} />
                          <span>Submitted {proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleString() : 'recently'}</span>
                        </div>
                        <div>
                          <FileText size={14} />
                          <span>ID {proposal.proposalsId}</span>
                        </div>
                        <div>
                          <Sparkles size={14} />
                          <span>{proposal.isAIGenerated ? 'AI Generated' : 'Manual proposal'}</span>
                        </div>
                        {(proposal.boostedTokenAmount || 0) > 0 && (
                          <div>
                            <Rocket size={14} />
                            <span>Boosted {proposal.boostedTokenAmount} tokens</span>
                          </div>
                        )}
                      </div>

                      <div className="freelancer-proposal-actions">
                        <button className="proposal-view-btn" onClick={() => navigate(`/jobs/${proposal.jobPostsId}`)}>
                          <Eye size={15} />
                          View JobPost
                        </button>
                        <button className="proposal-view-btn" onClick={() => setProposalDetail({ proposal, mode: 'detail' })}>
                          <FileText size={15} />
                          Proposal Details
                        </button>
                        {accepted && (
                          <button className="proposal-accepted-contract-btn" onClick={() => navigate('/contracts')}>
                            <CheckCircle size={15} />
                            View Contract
                          </button>
                        )}
                        {getStatusLabel(proposal.status) === 'Pending' && (
                          <button className="proposal-boost-btn" onClick={() => boostProposal(proposal)}>
                            <Rocket size={15} />
                            Boost
                          </button>
                        )}
                        {relatedJob && (
                          <button className="proposal-view-btn" onClick={() => openCompetitionMatrix(relatedJob)}>
                            <BarChart2 size={15} />
                            View Competition
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isClient && (
        <div className="proposals-table-card">
          <div className="proposals-table-header">
            <div>JobPost</div>
            <div>Proposal Count</div>
            <div>Action</div>
          </div>

          {loading ? (
            <div className="proposals-empty">
              <Clock size={28} />
              <p>Loading proposals...</p>
            </div>
          ) : jobGroups.length === 0 ? (
            <div className="proposals-empty">
              <Users size={32} />
              <p>No proposals found</p>
              <span>Jobs with submitted proposals will appear here.</span>
            </div>
          ) : (
            <div className="proposals-table-body">
              {jobGroups.map(group => (
                <div key={group.jobPostsId} className="proposals-table-row">
                  <button className="proposal-job-cell" onClick={() => setSelectedJob(group)}>
                    <span className="proposal-job-icon">
                      <Briefcase size={18} />
                    </span>
                    <span>
                      <strong>{group.jobTitle}</strong>
                      <small>Click to view JobPost</small>
                    </span>
                  </button>

                  <div className="proposal-count-cell">
                    <strong>{group.proposals.length}</strong>
                    <span>{group.proposals.length === 1 ? 'proposal' : 'proposals'} applied</span>
                  </div>

                  <div className="proposal-action-cell">
                    <button className="proposal-manage-btn" onClick={() => setManagingJob(group)}>
                      <FileText size={16} />
                      Manage Proposals
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {selectedJob && (
          <div className="proposal-modal-overlay" onClick={() => setSelectedJob(null)}>
            <div className="proposal-modal proposal-job-modal" onClick={event => event.stopPropagation()}>
              <button className="proposal-modal-close" onClick={() => setSelectedJob(null)}>
                <X size={18} />
              </button>
              <div className="proposal-modal-title">
                <Briefcase size={20} />
                <div>
                  <h2>{selectedJob.jobTitle}</h2>
                  <p>JobPost overview</p>
                </div>
              </div>
              <div className="proposal-job-summary">
                <div>
                  <span>JobPost ID</span>
                  <strong>{selectedJob.jobPostsId}</strong>
                </div>
                <div>
                  <span>Proposal count</span>
                  <strong>{selectedJob.proposals.length}</strong>
                </div>
                <div>
                  <span>Pending review</span>
                  <strong>{selectedJob.proposals.filter(item => getStatusLabel(item.status) === 'Pending').length}</strong>
                </div>
              </div>
              <p className="proposal-job-note">
                Use Manage Proposals to accept or reject freelancers who applied to this JobPost.
              </p>
            </div>
          </div>
        )}

        {activeManagingJob && (
          <div className="proposal-modal-overlay" onClick={() => setManagingJob(null)}>
            <div className="proposal-modal proposal-manage-modal" onClick={event => event.stopPropagation()}>
              <button className="proposal-modal-close" onClick={() => setManagingJob(null)}>
                <X size={18} />
              </button>
              <div className="proposal-modal-title">
                <FileText size={20} />
                <div>
                  <h2>Manage Proposals</h2>
                  <p>{activeManagingJob.jobTitle}</p>
                </div>
              </div>

              <div className="proposal-manage-toolbar">
                <label>
                  <span>Filter status</span>
                  <select value={proposalStatusFilter} onChange={event => setProposalStatusFilter(event.target.value as ProposalStatusFilter)}>
                    <option value="all">All statuses</option>
                    <option value="0">Pending</option>
                    <option value="1">Shortlisted</option>
                    <option value="2">Accepted</option>
                    <option value="3">Rejected</option>
                    <option value="4">Withdrawn</option>
                  </select>
                </label>
                <label>
                  <span>Sort by</span>
                  <select value={proposalSortBy} onChange={event => setProposalSortBy(event.target.value as ProposalSortBy)}>
                    <option value="interviewScore">Score interview</option>
                    <option value="status">Status</option>
                    <option value="submittedAt">Submitted date</option>
                    <option value="rate">Proposed rate</option>
                  </select>
                </label>
              </div>

              <div className="proposal-cards">
                {visibleManagingProposals.map(proposal => (
                  <div key={proposal.proposalsId} className="proposal-review-card">
                    <div className="proposal-review-header">
                      <div className="proposal-freelancer">
                        <img
                          src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${proposal.freelancerName || proposal.freelancerProfilesId}`}
                          alt={proposal.freelancerName || 'Freelancer'}
                        />
                        <div>
                          <strong>{proposal.freelancerName || 'Unknown freelancer'}</strong>
                          <span>{proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : 'Submitted recently'}</span>
                        </div>
                      </div>
                      <div className="proposal-card-side">
                        <span className={getStatusClass(proposal.status)}>{getStatusLabel(proposal.status)}</span>
                        <span className="proposal-score-pill">
                          <Award size={13} />
                          {proposal.interviewScore || 0}
                        </span>
                      </div>
                    </div>

                    <p className="proposal-cover-letter">{proposal.coverLetter || 'No cover letter provided.'}</p>

                    <div className="proposal-review-meta">
                      <div>
                        <FileText size={14} />
                        <span>ID {proposal.proposalsId}</span>
                      </div>
                      <div>
                        <DollarSign size={14} />
                        <span>${(proposal.proposedRate || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <Clock size={14} />
                        <span>{proposal.proposedDuration || 'Flexible'} days</span>
                      </div>
                      <div>
                        <Sparkles size={14} />
                        <span>{proposal.isAIGenerated ? 'AI Generated' : 'Manual'}</span>
                      </div>
                    </div>

                    <div className="proposal-interface-grid">
                      <div>
                        <span>flPro_FreelancerProfilesId</span>
                        <strong>{proposal.freelancerProfilesId}</strong>
                      </div>
                      <div>
                        <span>SubmittedAt</span>
                        <strong>{proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleString() : '-'}</strong>
                      </div>
                      <div>
                        <span>UpdatedAt</span>
                        <strong>{proposal.updatedAt ? new Date(proposal.updatedAt).toLocaleString() : '-'}</strong>
                      </div>
                    </div>

                    {isClient && (
                      <div className="proposal-review-actions">
                        <button className="proposal-view-btn" onClick={() => setProposalDetail({ proposal, mode: 'score' })}>
                          <Award size={15} />
                          View Score Interview
                        </button>
                        <button className="proposal-view-btn" onClick={() => setProposalDetail({ proposal, mode: 'cv' })}>
                          <Download size={15} />
                          View CV of freelance
                        </button>
                        <button className="proposal-view-btn" onClick={() => setProposalDetail({ proposal, mode: 'detail' })}>
                          <Eye size={15} />
                          View more detail of Proposal
                        </button>
                        <button className="proposal-view-btn" onClick={() => {
                          setInviteProposal(proposal);
                          setInviteJobId(activeManagingJob.jobPostsId);
                          setInviteError('');
                          setInviteSuccess('');
                        }}>
                          <Video size={15} />
                          Invite to Interview
                        </button>
                        <label className="proposal-status-select">
                          <span>Change status</span>
                          <select value={String(proposal.status)} onChange={event => updateProposalStatus(proposal.proposalsId, Number(event.target.value) as ProposalStatusValue)}>
                            <option value="0">Pending</option>
                            <option value="1">Shortlisted</option>
                            <option value="2">Accepted</option>
                            <option value="3">Rejected</option>
                            <option value="4">Withdrawn</option>
                          </select>
                        </label>
                      </div>
                    )}

                    {!isClient && (
                      <div className="proposal-review-actions">
                        <button
                          className="proposal-boost-btn"
                          onClick={() => boostProposal(proposal)}
                          disabled={getStatusLabel(proposal.status) !== 'Pending'}
                        >
                          <Rocket size={15} />
                          Boost
                        </button>
                        <button className="proposal-view-btn" onClick={() => openCompetitionMatrix(activeManagingJob)}>
                          <BarChart2 size={15} />
                          View Competition
                        </button>
                        <span className="proposal-boost-meta">
                          Rank {proposal.rankingScore || proposal.interviewScore || 0}
                          {(proposal.boostedTokenAmount || 0) > 0 && ` · Boosted ${proposal.boostedTokenAmount} tokens`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {visibleManagingProposals.length === 0 && (
                  <div className="proposals-empty compact">
                    <Users size={28} />
                    <p>No proposals match this filter</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {proposalDetail && (
          <div className="proposal-modal-overlay" onClick={() => setProposalDetail(null)}>
            <div className="proposal-modal proposal-detail-modal" onClick={event => event.stopPropagation()}>
              <button className="proposal-modal-close" onClick={() => setProposalDetail(null)}>
                <X size={18} />
              </button>
              <div className="proposal-modal-title">
                {proposalDetail.mode === 'score' ? <Award size={20} /> : proposalDetail.mode === 'cv' ? <Download size={20} /> : <Eye size={20} />}
                <div>
                  <h2>
                    {proposalDetail.mode === 'score'
                      ? 'Score Interview'
                      : proposalDetail.mode === 'cv'
                        ? 'Freelancer CV'
                        : 'Proposal Detail'}
                  </h2>
                  <p>{proposalDetail.proposal.freelancerName}</p>
                </div>
              </div>

              {proposalDetail.mode === 'score' && (
                <div className="proposal-score-detail">
                  <strong>{proposalDetail.proposal.interviewScore || 0}</strong>
                  <span>Interview score</span>
                  <div className="proposal-score-bar">
                    <div style={{ width: `${proposalDetail.proposal.interviewScore || 0}%` }} />
                  </div>
                  <p>Score is calculated from mock interview performance, communication clarity, technical fit, and delivery confidence.</p>
                </div>
              )}

              {proposalDetail.mode === 'cv' && (
                <div className="proposal-attachments">
                  {(proposalDetail.proposal.attachments || []).length > 0 ? (
                    proposalDetail.proposal.attachments?.map(attachment => (
                      <div key={attachment.propoAttach_ProposalAttachmentsId} className="proposal-attachment-row">
                        <FileText size={18} />
                        <div>
                          <strong>{attachment.fileName}</strong>
                          <span>{formatFileSize(attachment.fileSize)} - {new Date(attachment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <a href={attachment.fileUrl}>Open</a>
                      </div>
                    ))
                  ) : (
                    <p className="proposal-job-note">No CV attachment uploaded for this proposal.</p>
                  )}
                </div>
              )}

              {proposalDetail.mode === 'detail' && (
                <div className="proposal-full-detail">
                  {[
                    ['propo_ProposalsId', proposalDetail.proposal.proposalsId],
                    ['jp_JobPostsId', proposalDetail.proposal.jobPostsId],
                    ['flPro_FreelancerProfilesId', proposalDetail.proposal.freelancerProfilesId],
                    ['ProposedRate', `$${(proposalDetail.proposal.proposedRate || 0).toLocaleString()}`],
                    ['ProposedDuration', `${proposalDetail.proposal.proposedDuration || 'Flexible'} days`],
                    ['Status', getStatusLabel(proposalDetail.proposal.status)],
                    ['SubmittedAt', proposalDetail.proposal.submittedAt ? new Date(proposalDetail.proposal.submittedAt).toLocaleString() : '-'],
                    ['UpdatedAt', proposalDetail.proposal.updatedAt ? new Date(proposalDetail.proposal.updatedAt).toLocaleString() : '-'],
                    ['IsAIGenerated', proposalDetail.proposal.isAIGenerated ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                  <div className="proposal-detail-cover">
                    <span>CoverLetter</span>
                    <p>{proposalDetail.proposal.coverLetter}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {inviteProposal && (
          <div className="proposal-modal-overlay" onClick={() => setInviteProposal(null)}>
            <div className="proposal-modal proposal-job-modal" onClick={event => event.stopPropagation()}>
              <button className="proposal-modal-close" onClick={() => setInviteProposal(null)}>
                <X size={18} />
              </button>
              <div className="proposal-modal-title">
                <Video size={20} />
                <div>
                  <h2>Invite to Interview</h2>
                  <p>{inviteProposal.freelancerName}</p>
                </div>
              </div>
              <div className="proposal-manage-toolbar">
                <label>
                  <span>Job post</span>
                  <select value={inviteJobId} onChange={event => setInviteJobId(event.target.value)}>
                    <option value="">Select an open job</option>
                    {openJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                  </select>
                </label>
              </div>
              <label className="invite-message-field">
                Optional message
                <textarea value={inviteMessage} onChange={event => setInviteMessage(event.target.value)} placeholder="Add a short invitation message..." />
              </label>
              {inviteError && <p className="proposal-form-error">{inviteError}</p>}
              {inviteSuccess && <p className="invite-success">{inviteSuccess}</p>}
              <button className="proposal-manage-btn" onClick={sendInterviewInvite}>
                Send invitation
              </button>
            </div>
          </div>
        )}

        {competitionJob && competitionStats && (
          <div className="proposal-modal-overlay" onClick={() => setCompetitionJob(null)}>
            <div className="proposal-modal proposal-detail-modal" onClick={event => event.stopPropagation()}>
              <button className="proposal-modal-close" onClick={() => setCompetitionJob(null)}>
                <X size={18} />
              </button>
              <div className="proposal-modal-title">
                <BarChart2 size={20} />
                <div>
                  <h2>Competitor Bid Matrix</h2>
                  <p>{competitionJob.jobTitle} · anonymized data</p>
                </div>
              </div>
              <div className="proposal-bid-matrix">
                <div>
                  <span>Min bid</span>
                  <strong>${competitionStats.minBid.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Avg bid</span>
                  <strong>${competitionStats.avgBid.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Max bid</span>
                  <strong>${competitionStats.maxBid.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Proposal count</span>
                  <strong>{competitionStats.proposalCount}</strong>
                </div>
              </div>
              <div className="proposal-score-distribution">
                <h3>AI score distribution</h3>
                {[
                  { label: 'High score 85+', value: competitionStats.highScore },
                  { label: 'Medium score 70-84', value: competitionStats.midScore },
                  { label: 'Low score <70', value: competitionStats.lowScore },
                ].map(item => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <div><i style={{ width: `${(item.value / competitionStats.proposalCount) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
