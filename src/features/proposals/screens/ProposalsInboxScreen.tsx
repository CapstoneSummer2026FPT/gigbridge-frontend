import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { BarChart2, X, Users } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import { ProposalCard, ProposalDetailModal, CreateContractModal, type ContractData, ProposalToolbar, PaginationToolbar, FreelancerProposalView, ClientProposalSidebar } from '../components';
import type { JobProposalGroup, ProposalDetailMode, ProposalStatusValue, ProposalStatusFilter, ProposalSortBy, ProposalViewModel } from '../types';
import { canViewContract, canWithdrawProposal, getStatusLabel } from '../utils/statusHelpers';
import '../styles/proposals-inbox-screen.css';

const toProposalViewModel = (proposal: ProposalDto): ProposalViewModel => ({
  ...proposal,
  updatedAt: proposal.reviewedAt || proposal.submittedAt,
});

export default function ProposalsInboxScreen() {
  const { user, role } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [proposals, setProposals] = useState<ProposalViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    (location.state as { successMessage?: string } | null)?.successMessage || ''
  );
  const [managingJob, setManagingJob] = useState<JobProposalGroup | null>(null);
  const [proposalStatusFilter, setProposalStatusFilter] = useState<ProposalStatusFilter>('all');
  const [proposalSortBy, setProposalSortBy] = useState<ProposalSortBy>('interviewScore');
  const [proposalDetail, setProposalDetail] = useState<{ proposal: ProposalViewModel; mode: ProposalDetailMode } | null>(null);
  const [createContractProposal, setCreateContractProposal] = useState<ProposalViewModel | null>(null);
  const [competitionJob, setCompetitionJob] = useState<JobProposalGroup | null>(null);
  const [competitionError, setCompetitionError] = useState('');
  const [jobMenuOpen, setJobMenuOpen] = useState<string | null>(null);
  const [proposalsPerPage, setProposalsPerPage] = useState(10);
  const [currentProposalPage, setCurrentProposalPage] = useState(1);
  const [showToolbars, setShowToolbars] = useState(true);
  const proposalCardsRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);

  const isClient = role === 0;
  const selectedJobId = searchParams.get('job');

  // Fetch proposals
  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) {
        setProposals([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        if (isClient) {
          const jobsResponse = await jobGetAPI.getMyJobPosts();

          if (!jobsResponse.success) {
            setError(jobsResponse.message || 'Failed to fetch your job posts.');
            setProposals([]);
            return;
          }

          const jobs = jobsResponse.data || [];
          const targetJobs = selectedJobId
            ? jobs.filter(job => job.jobPostsId === selectedJobId)
            : jobs;

          const proposalResponses = await Promise.all(
            targetJobs.map(job => proposalGetAPI.getProposalsByJobPost(job.jobPostsId))
          );

          const failedResponse = proposalResponses.find(response => !response.success);
          if (failedResponse) {
            setError(failedResponse.message || 'Failed to fetch proposals.');
            setProposals([]);
            return;
          }

          setProposals(proposalResponses.flatMap(response => response.data || []).map(toProposalViewModel));
          return;
        }

        const response = await proposalGetAPI.getMyProposals();

        if (!response.success) {
          setError(response.message || 'Failed to fetch proposals.');
          setProposals([]);
          return;
        }

        setProposals((response.data || []).map(toProposalViewModel));
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
        setError('Failed to fetch proposals.');
        setProposals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [user, isClient, selectedJobId]);

  // Scroll detection for showing/hiding toolbars
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (!target) return;

      const currentScrollY = target.scrollTop;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (scrollDelta < -5) {
        setShowToolbars(true);
      } else if (scrollDelta > 5) {
        setShowToolbars(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    const element = proposalCardsRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [managingJob]);

  // Group proposals by job
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
    if (!isClient || !selectedJobId || jobGroups.length === 0) return;

    const selectedGroup = jobGroups.find(group => group.jobPostsId === selectedJobId);
    if (selectedGroup) {
      setManagingJob(selectedGroup);
    }
  }, [isClient, jobGroups, selectedJobId]);

  // Update proposal status
  const updateProposalStatus = async (proposalId: string, status: ProposalStatusValue) => {
    try {
      setError('');
      setSuccessMessage('');
      const response = await proposalPutAPI.updateProposalStatus(proposalId, status);

      if (!response.success) {
        setError(response.message || 'Failed to update proposal status.');
        return;
      }

      setProposals(prev =>
        prev.map(proposal =>
          proposal.proposalsId === proposalId
            ? { ...proposal, status, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : proposal
        )
      );
      setSuccessMessage('Proposal status updated successfully.');
    } catch (error) {
      console.error('Failed to update proposal status:', error);
      setError('Failed to update proposal status.');
    }
  };

  // Filter and sort managing proposals
  const visibleManagingProposals = useMemo(() => {
    const items = managingJob?.proposals || [];
    const filtered = proposalStatusFilter === 'all'
      ? items
      : items.filter(proposal => String(proposal.status) === proposalStatusFilter);

    return [...filtered].sort((a, b) => {
      if (proposalSortBy === 'interviewScore') return (b.interviewScore || 0) - (a.interviewScore || 0);
      if (proposalSortBy === 'status') return Number(a.status) - Number(b.status);
      if (proposalSortBy === 'rate') return (b.proposedBudget || 0) - (a.proposedBudget || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [managingJob, proposalSortBy, proposalStatusFilter]);

  // Paginate proposals
  const paginatedProposals = useMemo(() => {
    const start = (currentProposalPage - 1) * proposalsPerPage;
    const end = start + proposalsPerPage;
    return visibleManagingProposals.slice(start, end);
  }, [visibleManagingProposals, currentProposalPage, proposalsPerPage]);

  const totalProposalPages = Math.ceil(visibleManagingProposals.length / proposalsPerPage);

  const handleProposalsPerPageChange = (newValue: number) => {
    setProposalsPerPage(newValue);
    setCurrentProposalPage(1);
  };

  // Competition matrix logic
  const openCompetitionMatrix = (job: JobProposalGroup) => {
    setCompetitionError('');

    if (job.proposals.length < 3) {
      setCompetitionError('MSG74: Not enough data for analysis (minimum 3 proposals required)');
      return;
    }

    setCompetitionJob(job);
  };

  const competitionStats = useMemo(() => {
    if (!competitionJob) return null;
    const rates = competitionJob.proposals.map(proposal => proposal.proposedBudget || 0);
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

  // Event handlers
  const handleViewDetail = (proposal: ProposalViewModel, mode: ProposalDetailMode) => {
    setProposalDetail({ proposal, mode });
  };

  const handleAccept = (proposalId: string) => {
    updateProposalStatus(proposalId, ProposalStatus.Accepted);
  };

  const handleReject = (proposalId: string) => {
    updateProposalStatus(proposalId, ProposalStatus.Rejected);
  };

  const handleWithdraw = async (proposal: ProposalViewModel) => {
    if (!canWithdrawProposal(proposal.status)) return;

    const confirmed = window.confirm('Withdraw this proposal?');
    if (!confirmed) return;

    await updateProposalStatus(proposal.proposalsId, ProposalStatus.Withdrawn);
  };

  const handleEditDraft = (proposal: ProposalViewModel) => {
    navigate(`/proposals/${proposal.proposalsId}/edit`);
  };

  const handleViewAnswers = (proposal: ProposalViewModel) => {
    navigate(`/proposals/${proposal.proposalsId}/answers`);
  };

  const handleViewContract = async (proposal: ProposalViewModel) => {
    if (!canViewContract(proposal.status)) return;

    try {
      setError('');
      const response = await contractGetAPI.getContractByProposal(proposal.proposalsId);

      if (response.success && response.data?.contractsId) {
        navigate(`/contracts/${response.data.contractsId}`);
        return;
      }

      setError(response.message || 'Contract is not available yet for this accepted proposal.');
    } catch (error) {
      console.error('Failed to load proposal contract:', error);
      setError('Contract is not available yet for this accepted proposal.');
    }
  };

  const handleCreateContract = (proposal: ProposalViewModel) => {
    setCreateContractProposal(proposal);
  };

  const handleContractSubmit = async (contractData: ContractData) => {
    console.log('Creating contract:', contractData);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

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
        </div>

        {(error || successMessage || competitionError) && (
          <div className={`proposal-feedback ${error || competitionError ? 'error' : 'success'}`}>
            {error || competitionError || successMessage}
          </div>
        )}

        {!isClient && (
          <FreelancerProposalView
            loading={loading}
            proposals={proposals}
            statusFilter={proposalStatusFilter}
            jobGroups={jobGroups}
            onStatusFilterChange={setProposalStatusFilter}
            onViewDetail={handleViewDetail}
            onEditDraft={handleEditDraft}
            onViewAnswers={handleViewAnswers}
            onWithdraw={handleWithdraw}
            onViewContract={handleViewContract}
            onCompetitionMatrix={openCompetitionMatrix}
          />
        )}

        {isClient && (
          <div className="proposals-split-layout">
            <ClientProposalSidebar
              loading={loading}
              jobGroups={jobGroups}
              managingJob={managingJob}
              jobMenuOpen={jobMenuOpen}
              onJobSelect={setManagingJob}
              onJobMenuToggle={setJobMenuOpen}
            />

            {managingJob && (
              <div className="proposals-content-panel">
                <div className="proposals-panel-header">
                  <button className="proposals-back-btn" onClick={() => setManagingJob(null)}>
                    <span>←</span>
                  </button>
                  <div>
                    <h2>{managingJob.jobTitle}</h2>
                    <span>{managingJob.proposals.length} proposal{managingJob.proposals.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <ProposalToolbar
                  showToolbars={showToolbars}
                  proposalStatusFilter={proposalStatusFilter}
                  proposalSortBy={proposalSortBy}
                  onStatusFilterChange={setProposalStatusFilter}
                  onSortByChange={setProposalSortBy}
                />

                <PaginationToolbar
                  showToolbars={showToolbars}
                  proposalsPerPage={proposalsPerPage}
                  currentPage={currentProposalPage}
                  totalItems={visibleManagingProposals.length}
                  totalPages={totalProposalPages}
                  onPerPageChange={handleProposalsPerPageChange}
                  onPrevPage={() => setCurrentProposalPage(prev => Math.max(1, prev - 1))}
                  onNextPage={() => setCurrentProposalPage(prev => Math.min(totalProposalPages, prev + 1))}
                />

                <div className="proposal-cards" ref={proposalCardsRef}>
                  {paginatedProposals.map(proposal => (
                    <ProposalCard
                      key={proposal.proposalsId}
                      proposal={proposal}
                      isClient={isClient}
                      onViewDetail={handleViewDetail}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onViewAnswers={handleViewAnswers}
                      onCreateContract={handleCreateContract}
                    />
                  ))}

                  {paginatedProposals.length === 0 && (
                    <div className="proposals-empty compact">
                      <Users size={28} />
                      <p>No proposals match this filter</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {proposalDetail && (
          <ProposalDetailModal
            proposal={proposalDetail.proposal}
            mode={proposalDetail.mode}
            onClose={() => setProposalDetail(null)}
          />
        )}

        {createContractProposal && (
          <CreateContractModal
            proposal={createContractProposal}
            onClose={() => setCreateContractProposal(null)}
            onSubmit={handleContractSubmit}
          />
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
