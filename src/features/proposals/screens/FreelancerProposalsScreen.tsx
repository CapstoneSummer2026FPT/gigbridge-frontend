import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  Briefcase, CheckCircle, Clock, DollarSign, Eye, FileText, 
  Sparkles, XCircle, Search, ArrowLeft, Send, ShieldAlert, Rocket, ArrowRightLeft
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { DB } from '../../../mock_backend';
import { MOCK_PROPOSALS, type ProposalViewModel } from '../mock/data-for-ProposalsInboxScreen';
import type { ProposalStatusFilter } from '../types';
import { getStatusLabel, getStatusClass } from '../utils/statusHelpers';
import '../../workspace/styles/project-workspace-screen.css';

export default function FreelancerProposalsScreen() {
  const navigate = useNavigate();
  const { user } = useApp();

  const [proposals, setProposals] = useState<ProposalViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [tokenBalance, setTokenBalance] = useState(120);
  const [boostAmount, setBoostAmount] = useState(10);
  const [boostError, setBoostError] = useState('');
  const [boostSuccess, setBoostSuccess] = useState('');

  // Fetch proposals
  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const response = await proposalGetAPI.getMyProposals();
        setProposals(response.data?.length ? response.data.map((proposal, index) => ({
          ...proposal,
          updatedAt: proposal.reviewedAt || proposal.submittedAt,
          isAIGenerated: index % 2 === 0,
          interviewScore: Math.max(58, 96 - index * 7),
          rankingScore: Math.max(58, 96 - index * 7),
          boostedTokenAmount: 0,
        })) : MOCK_PROPOSALS.filter(p => p.freelancerProfilesId === 'freelancer_1')); // Filter to show freelancer's mock proposals
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
        setProposals(MOCK_PROPOSALS);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [user]);

  // Filter proposals
  const filteredProposals = useMemo(() => {
    let items = proposals;
    if (statusFilter !== 'all') {
      items = items.filter(p => String(p.status) === statusFilter);
    }
    return [...items].sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  }, [proposals, statusFilter]);

  // Auto-select first proposal
  useEffect(() => {
    if (filteredProposals.length > 0 && !activeProposalId) {
      setActiveProposalId(filteredProposals[0].proposalsId);
    }
  }, [filteredProposals, activeProposalId]);

  const activeProposal = useMemo(() => {
    return filteredProposals.find(p => p.proposalsId === activeProposalId) || null;
  }, [filteredProposals, activeProposalId]);

  // Fetch related job details from DB
  const relatedJobDetails = useMemo(() => {
    if (!activeProposal) return null;
    return DB.getJobById(activeProposal.jobPostsId || '') || null;
  }, [activeProposal]);

  const handleBoost = (proposal: ProposalViewModel) => {
    setBoostError('');
    setBoostSuccess('');

    if (getStatusLabel(proposal.status) !== 'Pending') {
      setBoostError('Only pending proposals can be boosted.');
      return;
    }

    if (tokenBalance < boostAmount) {
      setBoostError('Insufficient token balance.');
      return;
    }

    setTokenBalance(prev => prev - boostAmount);
    setProposals(prev => prev.map(item => item.proposalsId === proposal.proposalsId
      ? {
          ...item,
          boostedTokenAmount: (item.boostedTokenAmount || 0) + boostAmount,
          rankingScore: (item.rankingScore || item.interviewScore || 0) + boostAmount,
        }
      : item
    ));
    setBoostSuccess(`Successfully boosted proposal using ${boostAmount} tokens!`);
  };

  const handleGoToNegotiation = (proposal: ProposalViewModel) => {
    const conversations = DB.getConversations();
    let existingConv = conversations.find(
      c =>
        (c.participantId === proposal.freelancerProfilesId || c.participantName === proposal.freelancerName) &&
        (c.job.id === proposal.jobPostsId || c.job.title === proposal.jobTitle)
    );

    let convId = existingConv?.id;

    if (existingConv) {
      existingConv.roomType = 'negotiation';
      existingConv.roomId = 'room_negotiation';
      existingConv.conversationType = 0; // 0 = JobNegotiation
    } else {
      convId = `conv_${Date.now()}`;
      // Find client user if possible, else default
      const client = DB.getUsers().find(u => u.role === 0) || { id: 'u_client_1', full_name: 'Client' };

      const newConv = {
        id: convId,
        roomType: 'negotiation' as const,
        roomId: 'room_negotiation',
        participantId: client.id,
        participantName: client.full_name,
        participantAvatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${client.full_name}`,
        participantRole: 'Client',
        participantCompany: 'TechCorp',
        participantOnline: true,
        job: {
          id: proposal.jobPostsId || 'job_1',
          title: proposal.jobTitle || 'Untitled Job',
          budget: proposal.proposedBudget ? `$${proposal.proposedBudget.toLocaleString()}` : '$3,000',
          category: 'Development',
        },
        lastMessage: 'Cuộc trò chuyện đàm phán đã được tạo.',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        isMuted: false,
        conversationType: 0, // 0 = JobNegotiation
      };

      DB.addConversation(newConv);

      const initMessage = {
        id: `msg_${Date.now()}`,
        conversationId: convId,
        senderId: client.id,
        content: `Hi ${user?.full_name || 'Freelancer'}! Đề xuất của bạn đã được chấp nhận. Hãy thảo luận chi tiết về phạm vi công việc và giá cả ở đây.`,
        type: 'text' as const,
        createdAt: new Date().toISOString(),
        isRead: true,
      };
      DB.addMessage(initMessage);
    }

    navigate('/messages', { state: { activeConvId: convId } });
  };

  return (
    <AppLayout fullWidth>
      <div className="project-workspace-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        {/* Top Header */}
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
                Track and manage your submitted applications
              </p>
            </div>
          </div>

          {/* Premium Token Balance */}
          <div className="flex items-center gap-4 bg-card px-4 py-1.5 rounded-xl border border-border">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase font-bold">Token Balance</span>
              <span className="text-xs font-bold text-[var(--gb-purple)]">{tokenBalance} Tokens</span>
            </div>
          </div>
        </header>

        {/* Dynamic Alerts */}
        {(boostError || boostSuccess) && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            boostError ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'
          }`}>
            <ShieldAlert size={14} />
            <span>{boostError || boostSuccess}</span>
          </div>
        )}

        {/* 3-Column proposals workspace */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Column 1: Proposals List (Left Pane) */}
          <section className="w-80 border-r border-border flex flex-col bg-card">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="font-headline-sm text-xs uppercase tracking-widest text-muted-foreground font-bold">Applications</span>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ProposalStatusFilter)}
                className="bg-background border border-border rounded-lg text-[10px] px-2 py-1 focus:outline-none cursor-pointer text-foreground font-bold"
              >
                <option value="all">All</option>
                <option value="0">Pending</option>
                <option value="1">Shortlisted</option>
                <option value="2">Accepted</option>
                <option value="3">Rejected</option>
              </select>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading applications...</div>
              ) : filteredProposals.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No applications found.</div>
              ) : (
                filteredProposals.map(p => {
                  const isActive = p.proposalsId === activeProposalId;
                  const accepted = p.status === 2;
                  const rejected = p.status === 3;
                  return (
                    <div
                      key={p.proposalsId}
                      onClick={() => setActiveProposalId(p.proposalsId)}
                      className={`border-b border-border/50 p-4 cursor-pointer transition-all hover:bg-muted/30 ${
                        isActive ? 'bg-[var(--gb-cyan)]/5 border-l-4 border-l-[var(--gb-cyan)]' : ''
                      }`}
                    >
                      <h3 className="text-sm font-semibold truncate text-foreground">{p.jobTitle || 'Untitled JobPost'}</h3>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-[11px] font-bold text-foreground">${p.proposedBudget?.toLocaleString()}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          accepted ? 'bg-emerald-500/10 text-emerald-500' : rejected ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>{accepted ? 'Accepted' : rejected ? 'Rejected' : 'Pending'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Column 2: Proposal Details (Center Pane) */}
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
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Your Bid</span>
                      <span className="text-base font-bold text-foreground">${activeProposal.proposedBudget?.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Duration</span>
                      <span className="text-base font-bold text-foreground">{activeProposal.proposedDuration} Days</span>
                    </div>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Cover Letter</h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-border">
                    {activeProposal.coverLetter || 'No cover letter provided.'}
                  </p>
                </div>

                {/* Status banner */}
                <div className="flex flex-col gap-2 mt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Application Status</h4>
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    activeProposal.status === 2 
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' 
                      : activeProposal.status === 3 
                      ? 'bg-red-500/5 border-red-500/10 text-red-500' 
                      : 'bg-amber-500/5 border-amber-500/10 text-amber-500'
                  }`}>
                    <Clock size={16} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold capitalize">{getStatusLabel(activeProposal.status)}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {activeProposal.status === 2 
                          ? 'Congratulations! The client has accepted your proposal. Click below to enter the negotiation room.' 
                          : activeProposal.status === 3 
                          ? 'The client decided to go with another freelancer.' 
                          : 'The client is currently reviewing your application.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action controls */}
                <div className="flex items-center gap-3 mt-4 border-t border-border pt-6">
                  {activeProposal.status === 2 ? (
                    <button
                      onClick={() => handleGoToNegotiation(activeProposal)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm shadow-teal-500/10 active:scale-[0.98]"
                    >
                      <ArrowRightLeft size={16} />
                      <span>Vào đàm phán</span>
                    </button>
                  ) : activeProposal.status === 0 ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          value={boostAmount} 
                          onChange={e => setBoostAmount(Math.max(1, Number(e.target.value) || 1))}
                          className="w-16 bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] text-foreground text-center"
                        />
                        <button
                          onClick={() => handleBoost(activeProposal)}
                          className="bg-[var(--gb-purple)] hover:bg-[var(--gb-purple)]/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <Rocket size={13} />
                          <span>Boost Application</span>
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Boost bids to improve your ranking score in client views.</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                <FileText size={40} className="opacity-30 mb-3" />
                <p className="text-sm">Select an application to view details.</p>
              </div>
            )}
          </section>

          {/* Column 3: Job Requirements (Right Pane) */}
          <section className="w-80 border-l border-border flex flex-col bg-card p-6 overflow-y-auto custom-scrollbar">
            {relatedJobDetails ? (
              <div className="flex flex-col gap-5">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-1">Job Details</h3>
                  <h2 className="text-base font-bold text-foreground leading-snug">{relatedJobDetails.title}</h2>
                  <div className="flex items-center gap-1 text-[var(--gb-cyan)] font-bold text-xs mt-2.5">
                    <DollarSign size={13} />
                    <span>${relatedJobDetails.budgetMin?.toLocaleString()} Fixed budget</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role Description</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background p-3 rounded-xl border border-border whitespace-pre-wrap">
                    {relatedJobDetails.description}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedJobDetails.skills && relatedJobDetails.skills.map(skill => (
                      <span 
                        key={skill}
                        className="bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] px-2.5 py-1 rounded-full text-[10px] font-bold border border-[var(--gb-cyan)]/10"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
                <Briefcase size={30} className="opacity-25 mb-2" />
                <p className="text-xs">No job information available.</p>
              </div>
            )}
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
