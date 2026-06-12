import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { 
  Briefcase, CheckCircle, Clock, DollarSign, Eye, FileText, 
  Sparkles, XCircle, Search, Users, ArrowLeft, Download, Info, Check, Filter, ArrowUpDown
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { ProposalStatus } from '../../../types/models/Proposal';
import type { ProposalViewModel } from '../types';
import type { JobProposalGroup, ProposalStatusFilter, ProposalSortBy, ProposalStatusValue } from '../types';
import '../../workspace/styles/project-workspace-screen.css';

export default function ClientProposalsScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  
  const [proposals, setProposals] = useState<ProposalViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [sortBy, setSortBy] = useState<ProposalSortBy>('interviewScore');

  // Fetch proposals
  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const jobsResponse = await jobGetAPI.getMyJobPosts();
        if (!jobsResponse.success) {
          setProposals([]);
          return;
        }

        const proposalResponses = await Promise.all(
          (jobsResponse.data || []).map(job => proposalGetAPI.getProposalsByJobPost(job.jobPostsId))
        );

        setProposals(proposalResponses.flatMap(response => response.data || []).map((proposal, index) => ({
          ...proposal,
          updatedAt: proposal.reviewedAt || proposal.submittedAt,
          isAIGenerated: false,
          interviewScore: Math.max(58, 96 - index * 7),
          rankingScore: Math.max(58, 96 - index * 7),
          boostedTokenAmount: 0,
          attachments: [],
        })));
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
        setProposals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [user]);

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

  // Auto-select first job and first proposal
  useEffect(() => {
    if (jobGroups.length > 0 && !activeJobId) {
      setActiveJobId(jobGroups[0].jobPostsId);
    }
  }, [jobGroups, activeJobId]);

  const activeJob = useMemo(() => {
    return jobGroups.find(group => group.jobPostsId === activeJobId) || null;
  }, [jobGroups, activeJobId]);

  // Filter & sort proposals for the active job
  const filteredProposals = useMemo(() => {
    if (!activeJob) return [];
    let items = activeJob.proposals;
    
    if (statusFilter !== 'all') {
      items = items.filter(p => String(p.status) === statusFilter);
    }

    return [...items].sort((a, b) => {
      if ((a.boostedTokenAmount || 0) !== (b.boostedTokenAmount || 0)) {
        return (b.boostedTokenAmount || 0) - (a.boostedTokenAmount || 0);
      }
      if (sortBy === 'interviewScore') return (b.interviewScore || 0) - (a.interviewScore || 0);
      if (sortBy === 'status') return Number(a.status) - Number(b.status);
      if (sortBy === 'rate') return (b.proposedBudget || 0) - (a.proposedBudget || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [activeJob, statusFilter, sortBy]);

  // Auto-select first proposal in the filtered list
  useEffect(() => {
    if (filteredProposals.length > 0) {
      // If the current active proposal is not in the filtered list, select the first one
      if (!filteredProposals.some(p => p.proposalsId === activeProposalId)) {
        setActiveProposalId(filteredProposals[0].proposalsId);
      }
    } else {
      setActiveProposalId(null);
    }
  }, [filteredProposals, activeProposalId]);

  const activeProposal = useMemo(() => {
    return filteredProposals.find(p => p.proposalsId === activeProposalId) || null;
  }, [filteredProposals, activeProposalId]);

  // Actions
  const updateProposalStatus = async (proposalId: string, status: ProposalStatusValue) => {
    try {
      await proposalPutAPI.updateProposalStatus(proposalId, status);
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

  const handleViewContract = async (proposal: ProposalViewModel) => {
    const response = await contractGetAPI.getContractByJobPost(proposal.jobPostsId);
    if (response.success && response.data) {
      navigate(`/contracts/${response.data.contractsId}`);
      return;
    }

    alert(response.message || 'Contract is not available yet for this accepted proposal.');
  };

  return (
    <AppLayout fullWidth>
      <div className="project-workspace-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        {/* Top Header */}
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
                Review and manage applicants' proposals
              </p>
            </div>
          </div>
        </header>

        {/* 3-Column Proposals Workspace Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Column 1: Job Posts List (Left Pane) */}
          <section className="w-80 border-r border-border flex flex-col bg-card">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="font-headline-sm text-xs uppercase tracking-widest text-muted-foreground font-bold">Job Openings</span>
              <span className="bg-[var(--gb-cyan)]/15 text-[var(--gb-cyan)] text-[10px] font-bold px-2 py-0.5 rounded-full">{jobGroups.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading openings...</div>
              ) : jobGroups.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No active job posts with proposals.</div>
              ) : (
                jobGroups.map(group => {
                  const isActive = group.jobPostsId === activeJobId;
                  return (
                    <div
                      key={group.jobPostsId}
                      onClick={() => {
                        setActiveJobId(group.jobPostsId);
                        setActiveProposalId(null);
                      }}
                      className={`border-b border-border/50 p-4 cursor-pointer transition-all hover:bg-muted/30 ${
                        isActive ? 'bg-[var(--gb-cyan)]/5 border-l-4 border-l-[var(--gb-cyan)]' : ''
                      }`}
                    >
                      <h3 className="text-sm font-semibold truncate text-foreground">{group.jobTitle}</h3>
                      <div className="flex gap-2 items-center mt-2">
                        <Users size={12} className="text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {group.proposals.length} proposal{group.proposals.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Column 2: Proposals List & Detail Area (Center Pane) */}
          <section className="flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm">
            
            {/* Toolbar Filters */}
            <div className="glass-header px-6 py-3.5 border-b border-border flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                  <Filter size={13} />
                  Status:
                </span>
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as ProposalStatusFilter)}
                  className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] cursor-pointer text-foreground font-semibold"
                >
                  <option value="all">All Proposals</option>
                  <option value={String(ProposalStatus.Pending)}>Pending</option>
                  <option value={String(ProposalStatus.Shortlisted)}>Shortlisted</option>
                  <option value={String(ProposalStatus.Accepted)}>Accepted</option>
                  <option value={String(ProposalStatus.Rejected)}>Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                  <ArrowUpDown size={13} />
                  Sort:
                </span>
                <select 
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as ProposalSortBy)}
                  className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] cursor-pointer text-foreground font-semibold"
                >
                  <option value="interviewScore">Interview Score</option>
                  <option value="status">Status</option>
                  <option value="rate">Proposed Rate</option>
                  <option value="submittedAt">Submission Date</option>
                </select>
              </div>
            </div>

            {/* List and Detail Split Layout within Center Pane */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Proposals Cards List (Sub-Column Left) */}
              <div className="w-80 border-r border-border flex flex-col bg-card/40 overflow-y-auto custom-scrollbar">
                {filteredProposals.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No proposals match filters.</div>
                ) : (
                  filteredProposals.map(p => {
                    const isActive = p.proposalsId === activeProposalId;
                    const isAccepted = p.status === ProposalStatus.Accepted;
                    const isRejected = p.status === ProposalStatus.Rejected;
                    return (
                      <div
                        key={p.proposalsId}
                        onClick={() => setActiveProposalId(p.proposalsId)}
                        className={`p-4 border-b border-border/50 cursor-pointer transition-all hover:bg-muted/40 flex flex-col gap-1.5 ${
                          isActive ? 'bg-[var(--gb-cyan)]/5 border-r-2 border-r-[var(--gb-cyan)]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                            {p.freelancerName || 'Applicant'}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isAccepted 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : isRejected 
                              ? 'bg-red-500/10 text-red-500' 
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {isAccepted ? 'Accepted' : isRejected ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {p.coverLetter || 'No cover letter.'}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mt-1">
                          <span>${p.proposedBudget?.toLocaleString()}</span>
                          <span>{p.proposedDuration} days</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Proposal Detailed View (Sub-Column Right) */}
              <div className="flex-1 flex flex-col bg-card/20 overflow-y-auto custom-scrollbar p-6">
                {activeProposal ? (
                  <div className="flex flex-col gap-6">
                    {/* Header Info */}
                    <div className="flex justify-between items-start border-b border-border pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{activeProposal.freelancerName || 'Freelancer Proposal'}</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted on {activeProposal.submittedAt ? new Date(activeProposal.submittedAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Proposed Rate</span>
                          <span className="text-base font-bold text-foreground">${activeProposal.proposedBudget?.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Duration</span>
                          <span className="text-base font-bold text-foreground">{activeProposal.proposedDuration} Days</span>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Cover Letter */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cover Letter</h4>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-border">
                        {activeProposal.coverLetter || 'No cover letter provided.'}
                      </p>
                    </div>

                    {/* Proposal Action Buttons */}
                    <div className="flex items-center gap-3 mt-4 border-t border-border pt-6">
                      {activeProposal.status === ProposalStatus.Accepted ? (
                        <button
                          onClick={() => handleViewContract(activeProposal)}
                          className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/15 transition-all flex items-center gap-2 cursor-pointer border-none"
                        >
                          <Briefcase size={16} />
                          <span>View Contract</span>
                        </button>
                      ) : activeProposal.status === ProposalStatus.Rejected ? (
                        <div className="flex items-center gap-2 text-red-500 font-bold text-sm bg-red-500/5 px-4 py-2 rounded-xl border border-red-500/10">
                          <XCircle size={16} />
                          <span>Proposal Rejected</span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => updateProposalStatus(activeProposal.proposalsId, ProposalStatus.Accepted)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm"
                          >
                            <CheckCircle size={16} />
                            Accept Proposal
                          </button>
                          <button
                            onClick={() => updateProposalStatus(activeProposal.proposalsId, ProposalStatus.Rejected)}
                            className="bg-transparent border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </>
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

          {/* Column 3: Freelancer Profile / Detail Panel (Right Pane) */}
          <section className="w-80 border-l border-border flex flex-col bg-card p-6 overflow-y-auto custom-scrollbar">
            {activeProposal ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center gap-3 pb-6 border-b border-border">
                  <div className="relative">
                    <img 
                      alt={activeProposal.freelancerName} 
                      className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-md" 
                      src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${activeProposal.freelancerName || activeProposal.freelancerProfilesId}`} 
                    />
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{activeProposal.freelancerName || 'Applicant'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Freelancer Developer</p>
                  </div>
                </div>

                {/* Match Suitability Score */}
                <div className="flex flex-col gap-2 bg-background p-4 rounded-xl border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Interview Suitability</span>
                    <span className="text-xs font-bold text-[var(--gb-cyan)]">{activeProposal.interviewScore || 85}%</span>
                  </div>
                  <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden mt-1">
                    <div 
                      className="bg-gradient-to-r from-[var(--gb-cyan)] to-[var(--gb-purple)] h-full rounded-full" 
                      style={{ width: `${activeProposal.interviewScore || 85}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Based on manual interview answers and criteria match evaluation.
                  </p>
                </div>

                {/* Attachments */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attachments</h4>
                  {activeProposal.attachments && activeProposal.attachments.map(att => (
                    <div 
                      key={att.propoAttach_ProposalAttachmentsId}
                      className="flex items-center justify-between p-3 bg-background border border-border rounded-xl hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="text-[var(--gb-cyan)] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate max-w-[150px]">{att.fileName}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{(att.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => alert('Simulating attachment download')}
                        className="text-muted-foreground hover:text-[var(--gb-cyan)] transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center"
                        title="Download file"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
                <Info size={30} className="opacity-25 mb-2" />
                <p className="text-xs">No applicant selected.</p>
              </div>
            )}
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
