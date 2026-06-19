import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Edit3, FileText, MessageSquare, Send, ShieldAlert, XCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import type { ProposalStatusFilter } from '../types';
import { canEditProposal, canViewProposalAnswers, canWithdrawProposal, getStatusLabel } from '../utils/statusHelpers';
import '../../workspace/styles/project-workspace-screen.css';

type ProposalItem = ProposalDto & {
  updatedAt?: string | null;
};

export default function FreelancerProposalsScreen() {
  const navigate = useNavigate();
  const { user } = useApp();

  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [message, setMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [openingNegotiationId, setOpeningNegotiationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setMessage('');
        const response = await proposalGetAPI.getMyProposals();
        if (!response.success) {
          setMessage(response.message || 'Proposals could not be loaded.');
          setProposals([]);
          return;
        }

        setProposals((response.data || []).map(proposal => ({
          ...proposal,
          updatedAt: proposal.reviewedAt || proposal.submittedAt,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [user]);

  const filteredProposals = useMemo(() => {
    const items = statusFilter === 'all'
      ? proposals
      : proposals.filter(proposal => String(proposal.status) === statusFilter);

    return [...items].sort((a, b) =>
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );
  }, [proposals, statusFilter]);

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

  const handleWithdraw = async (proposal: ProposalItem) => {
    setActionLoadingId(proposal.proposalsId);
    setMessage('');

    const response = await proposalPatchAPI.updateProposalStatus(proposal.proposalsId, {
      status: ProposalStatus.Withdrawn,
    });

    setActionLoadingId(null);

    if (!response.success) {
      setMessage(response.message || 'Proposal could not be withdrawn.');
      return;
    }

    setProposals(prev => prev.map(item => item.proposalsId === proposal.proposalsId
      ? { ...item, status: ProposalStatus.Withdrawn, updatedAt: new Date().toISOString() }
      : item
    ));
    setMessage('Proposal withdrawn.');
  };

  const openAcceptedNegotiation = (proposal: ProposalItem) => {
    setOpeningNegotiationId(proposal.proposalsId);
    navigate('/messages', { state: { proposalId: proposal.proposalsId } });
  };

  const statusBadgeClass = (status: number | string) => {
    const value = Number(status);
    if (value === ProposalStatus.Accepted) return 'bg-emerald-500/10 text-emerald-500';
    if (value === ProposalStatus.Rejected || value === ProposalStatus.Withdrawn) return 'bg-red-500/10 text-red-500';
    if (value === ProposalStatus.Shortlisted) return 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]';
    if (value === ProposalStatus.Draft) return 'bg-muted/40 text-muted-foreground';
    return 'bg-amber-500/10 text-amber-500';
  };

  return (
    <AppLayout fullWidth>
      <div className="project-workspace-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        <header className="glass-header sticky top-0 z-50 flex justify-between items-center px-8 py-3 border-b border-border shadow-sm">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/freelancer/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-[var(--gb-cyan)] transition-colors group cursor-pointer"
            >
              <ArrowLeft size={18} />
              <span className="font-semibold text-sm">Dashboard</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-base font-bold text-foreground">My Proposals</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-left mt-0.5">
                Track and manage your applications
              </p>
            </div>
          </div>
        </header>

        {message && (
          <div className="mx-6 mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-medium bg-amber-500/10 border-amber-500/20 text-amber-600">
            <ShieldAlert size={14} />
            <span>{message}</span>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <section className="w-80 border-r border-border flex flex-col bg-card">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="font-headline-sm text-xs uppercase tracking-widest text-muted-foreground font-bold">Applications</span>
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as ProposalStatusFilter)}
                className="bg-background border border-border rounded-lg text-[10px] px-2 py-1 focus:outline-none cursor-pointer text-foreground font-bold"
              >
                <option value="all">All</option>
                <option value="0">Draft</option>
                <option value="1">Pending</option>
                <option value="2">Shortlisted</option>
                <option value="3">Accepted</option>
                <option value="4">Rejected</option>
                <option value="5">Withdrawn</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading applications...</div>
              ) : filteredProposals.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No applications found.</div>
              ) : (
                filteredProposals.map(proposal => {
                  const isActive = proposal.proposalsId === activeProposalId;
                  return (
                    <div
                      key={proposal.proposalsId}
                      onClick={() => setActiveProposalId(proposal.proposalsId)}
                      className={`border-b border-border/50 p-4 cursor-pointer transition-all hover:bg-muted/30 ${
                        isActive ? 'bg-[var(--gb-cyan)]/5 border-l-4 border-l-[var(--gb-cyan)]' : ''
                      }`}
                    >
                      <h3 className="text-sm font-semibold truncate text-foreground">{proposal.jobTitle || 'Untitled JobPost'}</h3>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-[11px] font-bold text-foreground">${proposal.proposedBudget?.toLocaleString()}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${statusBadgeClass(proposal.status)}`}>
                          {getStatusLabel(proposal.status)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm p-6 overflow-y-auto custom-scrollbar">
            {activeProposal ? (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{activeProposal.jobTitle || 'Job Proposal'}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted on {activeProposal.submittedAt ? new Date(activeProposal.submittedAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded ${statusBadgeClass(activeProposal.status)}`}>
                    {getStatusLabel(activeProposal.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Your Bid</span>
                    <p className="text-base font-bold text-foreground mt-1">${activeProposal.proposedBudget?.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Duration</span>
                    <p className="text-base font-bold text-foreground mt-1">{activeProposal.proposedDuration || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Cover Letter</h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-border">
                    {activeProposal.coverLetter || 'No cover letter provided.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2 border-t border-border pt-6">
                  {canEditProposal(activeProposal.status) && (
                    <button
                      onClick={() => navigate(`/proposals/${activeProposal.proposalsId}/edit`)}
                      className="btn-cyan text-sm px-5 py-2.5 flex items-center gap-2"
                    >
                      <Edit3 size={16} />
                      Continue Editing
                    </button>
                  )}

                  {canWithdrawProposal(activeProposal.status) && (
                    <button
                      onClick={() => handleWithdraw(activeProposal)}
                      disabled={actionLoadingId === activeProposal.proposalsId}
                      className="bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle size={16} />
                      Withdraw
                    </button>
                  )}

                  {canViewProposalAnswers(activeProposal.status) && (
                    <button
                      onClick={() => navigate(`/proposals/${activeProposal.proposalsId}/answers`)}
                      className="bg-background border border-border text-foreground hover:bg-muted/20 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <FileText size={16} />
                      View Answers
                    </button>
                  )}

                  {Number(activeProposal.status) === ProposalStatus.Accepted && (
                    <button
                      onClick={() => openAcceptedNegotiation(activeProposal)}
                      disabled={openingNegotiationId === activeProposal.proposalsId}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm"
                    >
                      <MessageSquare size={16} />
                      {openingNegotiationId === activeProposal.proposalsId ? 'Opening...' : 'Vào đàm phán'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                <FileText size={40} className="opacity-30 mb-3" />
                <p className="text-sm">Select an application to view details.</p>
              </div>
            )}
          </section>

          <section className="w-80 border-l border-border flex flex-col bg-card p-6 overflow-y-auto custom-scrollbar">
            {activeProposal ? (
              <div className="flex flex-col gap-5">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-1">Proposal Status</h3>
                  <div className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded ${statusBadgeClass(activeProposal.status)}`}>
                    {getStatusLabel(activeProposal.status)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground leading-relaxed">
                  {Number(activeProposal.status) === ProposalStatus.Accepted
                    ? 'Accepted proposals stay in this proposal workspace for status and answer review.'
                    : Number(activeProposal.status) === ProposalStatus.Draft
                    ? 'Draft proposals can be edited and submitted when ready.'
                    : Number(activeProposal.status) === ProposalStatus.Withdrawn
                    ? 'This proposal has been withdrawn.'
                    : 'Use the available actions to manage this proposal.'}
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
                <Send size={30} className="opacity-25 mb-2" />
                <p className="text-xs">No proposal selected.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
