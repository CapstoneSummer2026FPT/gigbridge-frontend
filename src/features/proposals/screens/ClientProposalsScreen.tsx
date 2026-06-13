import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Filter,
  Info,
  Users,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import type { JobPostSummaryDto } from '../../../types/models/Job';
import {
  ProposalStatus,
  type ProposalDetailDto,
  type ProposalDto,
} from '../../../types/models/Proposal';
import type { ProposalStatusFilter, ProposalStatusValue } from '../types';
import { getStatusLabel } from '../utils/statusHelpers';
import '../../workspace/styles/project-workspace-screen.css';

type SortBy = 'submittedAt' | 'status' | 'rate';

const statusBadgeClass = (status: number | string | null | undefined) => {
  const value = Number(status);
  if (value === ProposalStatus.Accepted) return 'bg-emerald-500/10 text-emerald-500';
  if (value === ProposalStatus.Rejected || value === ProposalStatus.Withdrawn) return 'bg-red-500/10 text-red-500';
  if (value === ProposalStatus.Shortlisted) return 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]';
  return 'bg-amber-500/10 text-amber-500';
};

const formatCurrency = (value?: number | null) =>
  typeof value === 'number' ? `$${value.toLocaleString()}` : 'Not specified';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const canClientUpdateStatus = (status: number | string | null | undefined) => {
  const value = Number(status);
  return value === ProposalStatus.Pending || value === ProposalStatus.Shortlisted;
};

export default function ClientProposalsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedJobFromQuery = useMemo(
    () => new URLSearchParams(location.search).get('job'),
    [location.search]
  );

  const [jobs, setJobs] = useState<JobPostSummaryDto[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(selectedJobFromQuery);

  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalsError, setProposalsError] = useState('');
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);

  const [proposalDetail, setProposalDetail] = useState<ProposalDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<ProposalStatusValue | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('submittedAt');

  useEffect(() => {
    setSelectedJobId(selectedJobFromQuery);
  }, [selectedJobFromQuery]);

  useEffect(() => {
    const loadJobs = async () => {
      setJobsLoading(true);
      setJobsError('');

      const response = await jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 });
      if (!response.success || !response.data) {
        setJobs([]);
        setJobsError(response.message || 'Unable to load your JobPosts.');
        setJobsLoading(false);
        return;
      }

      setJobs(response.data);
      setJobsLoading(false);

      if (!selectedJobId && response.data.length > 0) {
        setSelectedJobId(response.data[0].jobPostsId);
      }
    };

    loadJobs();
  }, []);

  useEffect(() => {
    const loadProposals = async () => {
      if (!selectedJobId) {
        setProposals([]);
        setActiveProposalId(null);
        setProposalDetail(null);
        return;
      }

      setProposalsLoading(true);
      setProposalsError('');
      setStatusMessage('');
      setProposalDetail(null);

      const response = await proposalGetAPI.getProposalsByJobPost(selectedJobId, {
        pageIndex: 1,
        pageSize: 100,
      });

      if (!response.success || !response.data) {
        setProposals([]);
        setActiveProposalId(null);
        setProposalsError(response.message || 'Unable to load proposals for this JobPost.');
        setProposalsLoading(false);
        return;
      }

      setProposals(response.data);
      setActiveProposalId(response.data[0]?.proposalsId || null);
      setProposalsLoading(false);
    };

    loadProposals();
  }, [selectedJobId]);

  useEffect(() => {
    const loadProposalDetail = async () => {
      if (!activeProposalId) {
        setProposalDetail(null);
        setDetailError('');
        return;
      }

      setDetailLoading(true);
      setDetailError('');

      const response = await proposalGetAPI.getProposalDetail(activeProposalId);
      if (!response.success || !response.data) {
        setProposalDetail(null);
        setDetailError(response.message || 'Unable to load proposal detail.');
        setDetailLoading(false);
        return;
      }

      setProposalDetail(response.data);
      setDetailLoading(false);
    };

    loadProposalDetail();
  }, [activeProposalId]);

  const selectedJob = useMemo(
    () => jobs.find(job => job.jobPostsId === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const displayJobTitle = selectedJob?.title || proposals[0]?.jobTitle || 'Selected JobPost';

  const filteredProposals = useMemo(() => {
    const items = statusFilter === 'all'
      ? proposals
      : proposals.filter(proposal => String(proposal.status) === statusFilter);

    return [...items].sort((a, b) => {
      if (sortBy === 'status') return Number(a.status) - Number(b.status);
      if (sortBy === 'rate') return (b.proposedBudget || 0) - (a.proposedBudget || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [proposals, statusFilter, sortBy]);

  useEffect(() => {
    if (filteredProposals.length === 0) {
      setActiveProposalId(null);
      return;
    }

    if (!activeProposalId || !filteredProposals.some(proposal => proposal.proposalsId === activeProposalId)) {
      setActiveProposalId(filteredProposals[0].proposalsId);
    }
  }, [filteredProposals, activeProposalId]);

  const activeProposal = useMemo(
    () => filteredProposals.find(proposal => proposal.proposalsId === activeProposalId) || null,
    [filteredProposals, activeProposalId]
  );

  const handleSelectJob = (jobPostId: string) => {
    setSelectedJobId(jobPostId);
    navigate(`/proposals?job=${jobPostId}`, { replace: true });
  };

  const updateProposalStatus = async (proposalId: string, status: ProposalStatusValue) => {
    setUpdatingStatus(status);
    setStatusMessage('');

    const response = await proposalPatchAPI.updateProposalStatus(proposalId, { status });
    setUpdatingStatus(null);

    if (!response.success) {
      setStatusMessage(response.message || 'Unable to update proposal status.');
      return;
    }

    const now = new Date().toISOString();
    setProposals(prev => prev.map(proposal =>
      proposal.proposalsId === proposalId
        ? { ...proposal, status, reviewedAt: now }
        : proposal
    ));
    setProposalDetail(prev => prev && prev.proposalId === proposalId
      ? { ...prev, status, updatedAt: now }
      : prev
    );
    setStatusMessage('Proposal status updated.');
  };

  return (
    <AppLayout fullWidth>
      <div className="project-workspace-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        <header className="glass-header sticky top-0 z-50 flex justify-between items-center px-8 py-3 border-b border-border shadow-sm">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/client/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-[var(--gb-cyan)] transition-colors group cursor-pointer"
            >
              <ArrowLeft size={18} />
              <span className="font-semibold text-sm">Dashboard</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-base font-bold text-foreground">Proposals Workspace</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-left mt-0.5">
                Review proposals from real JobPost data
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <section className="w-80 border-r border-border flex flex-col bg-card">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="font-headline-sm text-xs uppercase tracking-widest text-muted-foreground font-bold">JobPosts</span>
              <span className="bg-[var(--gb-cyan)]/15 text-[var(--gb-cyan)] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {jobs.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {jobsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading JobPosts...</div>
              ) : jobsError ? (
                <div className="p-8 text-center text-xs text-red-500">{jobsError}</div>
              ) : jobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No JobPosts found.</div>
              ) : (
                jobs.map(job => {
                  const isActive = job.jobPostsId === selectedJobId;
                  return (
                    <div
                      key={job.jobPostsId}
                      onClick={() => handleSelectJob(job.jobPostsId)}
                      className={`border-b border-border/50 p-4 cursor-pointer transition-all hover:bg-muted/30 ${
                        isActive ? 'bg-[var(--gb-cyan)]/5 border-l-4 border-l-[var(--gb-cyan)]' : ''
                      }`}
                    >
                      <h3 className="text-sm font-semibold truncate text-foreground">{job.title}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {job.descriptionPreview || 'No description preview.'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm">
            <div className="glass-header px-6 py-3.5 border-b border-border flex justify-between items-center flex-wrap gap-4">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Selected JobPost</p>
                <h2 className="text-sm font-bold text-foreground truncate max-w-[360px]">{displayJobTitle}</h2>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                  <Filter size={13} />
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as ProposalStatusFilter)}
                  className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] cursor-pointer text-foreground font-semibold"
                >
                  <option value="all">All</option>
                  <option value="1">Pending</option>
                  <option value="2">Shortlisted</option>
                  <option value="3">Accepted</option>
                  <option value="4">Rejected</option>
                  <option value="5">Withdrawn</option>
                </select>

                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                  <ArrowUpDown size={13} />
                  Sort
                </span>
                <select
                  value={sortBy}
                  onChange={event => setSortBy(event.target.value as SortBy)}
                  className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] cursor-pointer text-foreground font-semibold"
                >
                  <option value="submittedAt">Submission Date</option>
                  <option value="status">Status</option>
                  <option value="rate">Proposed Budget</option>
                </select>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-80 border-r border-border flex flex-col bg-card/40 overflow-y-auto custom-scrollbar">
                {!selectedJobId ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Select a JobPost to view proposals.</div>
                ) : proposalsLoading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Loading proposals...</div>
                ) : proposalsError ? (
                  <div className="p-8 text-center text-xs text-red-500">{proposalsError}</div>
                ) : filteredProposals.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No proposals found for this JobPost.</div>
                ) : (
                  filteredProposals.map(proposal => {
                    const isActive = proposal.proposalsId === activeProposalId;
                    return (
                      <div
                        key={proposal.proposalsId}
                        onClick={() => setActiveProposalId(proposal.proposalsId)}
                        className={`p-4 border-b border-border/50 cursor-pointer transition-all hover:bg-muted/40 flex flex-col gap-1.5 ${
                          isActive ? 'bg-[var(--gb-cyan)]/5 border-r-2 border-r-[var(--gb-cyan)]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                            {proposal.freelancerName || 'Applicant'}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${statusBadgeClass(proposal.status)}`}>
                            {getStatusLabel(proposal.status)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {proposal.coverLetter || 'No cover letter.'}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mt-1">
                          <span>{formatCurrency(proposal.proposedBudget)}</span>
                          <span>{proposal.proposedDuration || 'No duration'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex-1 flex flex-col bg-card/20 overflow-y-auto custom-scrollbar p-6">
                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading proposal detail...</div>
                ) : detailError ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{detailError}</div>
                ) : activeProposal && proposalDetail ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-start border-b border-border pb-4 gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{proposalDetail.freelancerName || activeProposal.freelancerName || 'Freelancer Proposal'}</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {formatDateTime(proposalDetail.submittedAt || activeProposal.submittedAt)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded ${statusBadgeClass(proposalDetail.status)}`}>
                        {getStatusLabel(proposalDetail.status)}
                      </span>
                    </div>

                    {statusMessage && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600">
                        {statusMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Proposed Budget</span>
                        <p className="text-base font-bold text-foreground mt-1">{formatCurrency(proposalDetail.proposedBudget)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Duration</span>
                        <p className="text-base font-bold text-foreground mt-1">{proposalDetail.proposedDuration || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cover Letter</h4>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-border">
                        {proposalDetail.coverLetter || 'No cover letter provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-4 border-t border-border pt-6 flex-wrap">
                      <button
                        onClick={() => navigate(`/proposals/${proposalDetail.proposalId}/answers`)}
                        className="bg-background border border-border text-foreground hover:bg-muted/20 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <FileText size={16} />
                        View Answers
                      </button>

                      {canClientUpdateStatus(proposalDetail.status) ? (
                        <>
                          {Number(proposalDetail.status) === ProposalStatus.Pending && (
                            <button
                              onClick={() => updateProposalStatus(proposalDetail.proposalId, ProposalStatus.Shortlisted)}
                              disabled={updatingStatus !== null}
                              className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm"
                            >
                              <Users size={16} />
                              {updatingStatus === ProposalStatus.Shortlisted ? 'Shortlisting...' : 'Shortlist'}
                            </button>
                          )}
                          <button
                            onClick={() => updateProposalStatus(proposalDetail.proposalId, ProposalStatus.Accepted)}
                            disabled={updatingStatus !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm"
                          >
                            <CheckCircle size={16} />
                            {updatingStatus === ProposalStatus.Accepted ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => updateProposalStatus(proposalDetail.proposalId, ProposalStatus.Rejected)}
                            disabled={updatingStatus !== null}
                            className="bg-transparent border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <XCircle size={16} />
                            {updatingStatus === ProposalStatus.Rejected ? 'Rejecting...' : 'Reject'}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Status actions are unavailable for {getStatusLabel(proposalDetail.status)} proposals.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                    <FileText size={40} className="opacity-30 mb-3" />
                    <p className="text-sm">Select a proposal to view detailed information.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="w-80 border-l border-border flex flex-col bg-card p-6 overflow-y-auto custom-scrollbar">
            {proposalDetail ? (
              <div className="flex flex-col gap-5">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-1">Proposal Summary</h3>
                  <h2 className="text-base font-bold text-foreground leading-snug">{proposalDetail.jobPostTitle || displayJobTitle}</h2>
                  <div className={`inline-flex mt-3 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded ${statusBadgeClass(proposalDetail.status)}`}>
                    {getStatusLabel(proposalDetail.status)}
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Freelancer</span>
                    <strong className="text-foreground text-right">{proposalDetail.freelancerName || 'Unknown'}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Budget</span>
                    <strong className="text-foreground">{formatCurrency(proposalDetail.proposedBudget)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Submitted</span>
                    <strong className="text-foreground text-right">{formatDateTime(proposalDetail.submittedAt)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Reviewed</span>
                    <strong className="text-foreground text-right">{formatDateTime(proposalDetail.updatedAt || activeProposal?.reviewedAt)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
                <Info size={30} className="opacity-25 mb-2" />
                <p className="text-xs">No proposal selected.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
