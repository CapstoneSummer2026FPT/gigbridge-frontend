import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bot, Star, DollarSign, Clock, CheckCircle, XCircle, ChevronRight, Filter, Users } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import { DB, SEED_JOBS } from '../../../mock_backend';
import type { ProposalDto } from '../../../types/models/Proposal';
import '../styles/proposals-inbox-screen.css';

const STATUS_COLORS: Record<string, string> = {
  pending: 'amber', shortlisted: 'cyan', accepted: 'green', rejected: 'red', withdrawn: 'gray',
};

const AI_TOP_TALENT = [
  { name: 'Alex Johnson', title: 'Senior React Dev', match: 96, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alex&backgroundColor=c0aede', bid: '$6,500', rate: 4.9 },
  { name: 'Sarah Chen', title: 'UI/UX Designer', match: 98, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=sarah&backgroundColor=d1d4f9', bid: '$4,800', rate: 5.0 },
  { name: 'Marcus Rivera', title: 'Data Scientist', match: 79, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=marcus&backgroundColor=ffd5dc', bid: '$8,200', rate: 4.7 },
  { name: 'David Kim', title: 'DevOps Engineer', match: 85, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=david&backgroundColor=b6e3f4', bid: '$5,100', rate: 4.8 },
  { name: 'Priya Patel', title: 'ML Engineer', match: 91, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=priya&backgroundColor=ffdfbf', bid: '$7,800', rate: 4.9 },
];

export default function ProposalsInboxScreen() {
  const navigate = useNavigate();
  const { user, role } = useApp();
  const [filter, setFilter] = useState('all');
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isClient = role === 0; // 0 = client role

  // Fetch proposals from API
  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        let data;
        if (isClient) {
          // For clients, we need to get proposals for their jobs
          data = await proposalGetAPI.getAllProposals();
        } else {
          // For freelancers, get their proposals
          data = await proposalGetAPI.getMyProposals();
        }
        
        // Extract data from ApiResponse wrapper
        setProposals(data?.data || []);
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
        setProposals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [user, isClient]);

  const filteredProposals = filter === 'all' 
    ? proposals 
    : proposals.filter(p => {
        const status = typeof p.status === 'number' ? p.status : p.status;
        const filterMap: Record<string, number | string> = {
          pending: 0,
          shortlisted: 1,
          accepted: 1,
          rejected: 2,
        };
        return status === filterMap[filter] || p.status === filter;
      });

  const updateProposalStatus = async (proposalId: string, status: string) => {
    try {
      await proposalPutAPI.updateProposalStatus(proposalId, status);
      setProposals(prev => 
        prev.map(p => p.proposalsId === proposalId ? { ...p, status: status as any } : p)
      );
    } catch (error) {
      console.error('Failed to update proposal status:', error);
    }
  };

  const getFreelancer = (id: string) => DB.getUserById(id);
  const getJob = (id: string) => SEED_JOBS.find(j => j.id === id);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-primary mb-1">
              {isClient ? 'Proposals Inbox' : 'My Proposals'}
            </h1>
            <p className="text-secondary">
              {isClient ? `${proposals.filter(p => p.status === 0 || p.status === 'Pending').length} new proposals awaiting review` : `${proposals.length} proposals submitted`}
            </p>
          </div>
          {isClient && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(159,75,255,0.08)', border: '1px solid rgba(159,75,255,0.2)', color: '#9F4BFF' }}>
              <Bot size={14} />
              AI Ranked by Match Score
            </div>
          )}
        </div>

        {/* AI Smart Talent Section (Clients only) */}
        {isClient && (
          <div className="glass-card p-6 mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(159,75,255,0.06), rgba(0,240,255,0.04))', border: '1px solid rgba(159,75,255,0.2)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center animate-orb"
                style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
                <Bot size={14} style={{ color: '#0A0F1C' }} />
              </div>
              <h2 className="text-primary font-semibold">AI Smart Talent Matching</h2>
              <span className="badge-purple text-xs ml-auto">Top 5 Matches</span>
            </div>
            <p className="text-sm mb-4 text-secondary">
              Our AI analyzed 847 freelancer profiles and found these exceptional matches for your active jobs:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {AI_TOP_TALENT.map((talent, i) => (
                <div key={i} className="p-3 rounded-xl cursor-pointer transition-all text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onClick={() => navigate(`/profile/freelancer/u_freelancer_1`)}>
                  <div className="relative inline-block mb-2">
                    <img src={talent.avatar} alt={talent.name} className="w-12 h-12 rounded-xl mx-auto" />
                    <div className="absolute -bottom-1 -right-1">
                      <span className="match-score high text-[9px] px-1 py-0">{talent.match}%</span>
                    </div>
                  </div>
                  <p className="text-primary text-xs font-semibold">{talent.name.split(' ')[0]}</p>
                  <p className="text-[10px] mb-1 text-secondary">{talent.title.split(' ').slice(0, 2).join(' ')}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Star size={10} fill="#F59E0B" className="text-amber" />
                    <span className="text-[10px] text-primary">{talent.rate}</span>
                  </div>
                  <p className="text-xs font-bold mt-1 text-green">{talent.bid}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Proposals List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'shortlisted', 'accepted', 'rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                  style={{
                    background: filter === f ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: filter === f ? '1px solid rgba(0,240,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: filter === f ? '#0077FF' : '#8892A4',
                  }}>
                  {f} {f === 'all' && `(${proposals.length})`}
                  {f === 'pending' && `(${proposals.filter(p => p.status === 0 || p.status === 'Pending').length})`}
                  {f === 'shortlisted' && `(${proposals.filter(p => p.status === 1).length})`}
                  {f === 'accepted' && `(${proposals.filter(p => p.status === 1).length})`}
                  {f === 'rejected' && `(${proposals.filter(p => p.status === 2).length})`}
                </button>
              ))}
            </div>

            {filteredProposals.map(proposal => {
              const freelancer = proposal.freelancerName ? { name: proposal.freelancerName } : null;
              const job = proposal.jobTitle ? { title: proposal.jobTitle } : null;
              const isExpanded = expandedProposal === proposal.proposalsId;

              return (
                <div key={proposal.proposalsId} className="glass-card overflow-hidden">
                  <div className="p-5 cursor-pointer" onClick={() => setExpandedProposal(isExpanded ? null : proposal.proposalsId)}>
                    <div className="flex items-start gap-4">
                      <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${proposal.freelancerName}`} alt={proposal.freelancerName}
                        className="w-12 h-12 rounded-xl flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-primary font-semibold">{isClient ? proposal.freelancerName : proposal.jobTitle}</p>
                              <span className={`badge-${STATUS_COLORS[proposal.status || 'pending'] || 'cyan'} text-[10px] capitalize`}>
                                {proposal.status || 'pending'}
                              </span>
                            </div>
                            <p className="text-xs mt-0.5 text-secondary">
                              {isClient ? proposal.jobTitle : `Client: Unknown`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-primary font-bold">${(proposal.proposedRate || 0).toLocaleString()}</p>
                            <p className="text-xs text-secondary">{proposal.proposedDuration || '0'} days</p>
                          </div>
                        </div>

                        <p className="text-sm line-clamp-2 text-secondary">
                          {proposal.coverLetter}
                        </p>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-sm leading-relaxed mb-4 text-secondary">{proposal.coverLetter}</p>

                        <div className="flex gap-3">
                          {isClient && (proposal.status === 0 || proposal.status === 'Pending') && (
                            <>
                              <button className="btn-cyan flex-1 py-2 text-sm flex items-center justify-center gap-2"
                                onClick={() => updateProposalStatus(proposal.proposalsId, '1')}>
                                <CheckCircle size={14} /> Shortlist
                              </button>
                              <button className="flex-1 py-2 rounded-xl text-sm transition-all"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
                                onClick={() => updateProposalStatus(proposal.proposalsId, '2')}>
                                <XCircle size={14} className="inline mr-1" /> Decline
                              </button>
                              <button className="btn-ghost-cyan px-3 py-2 text-sm"
                                onClick={() => navigate(`/profile/freelancer/${proposal.freelancerProfilesId}`)}>
                                View Profile
                              </button>
                            </>
                          )}
                          {isClient && (proposal.status === 1 || proposal.status === 'Accepted') && (
                            <button className="btn-purple flex-1 py-2 text-sm">Hire Freelancer</button>
                          )}
                          {!isClient && (
                            <button className="btn-ghost-cyan px-4 py-2 text-sm"
                              onClick={() => navigate(`/jobs/${proposal.jobPostsId}`)}>
                              View Job
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProposals.length === 0 && (
              <div className="text-center py-16 glass-card">
                <Users size={40} className="mx-auto mb-3 opacity-20 text-secondary" />
                <p className="text-primary font-medium">No proposals found</p>
                <p className="text-sm mt-1 text-secondary">
                  {isClient ? 'Post a job to start receiving proposals' : 'Browse jobs and submit proposals to get started'}
                </p>
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-primary font-semibold mb-4 text-sm">Summary</h2>
              <div className="space-y-3">
                {[
                  { label: 'Total Proposals', value: proposals.length, color: 'white' },
                  { label: 'Pending Review', value: proposals.filter(p => p.status === 0 || p.status === 'Pending').length, color: '#F59E0B' },
                  { label: 'Shortlisted', value: proposals.filter(p => p.status === 1 || p.status === 'Accepted').length, color: '#0077FF' },
                  { label: 'Accepted', value: proposals.filter(p => p.status === 1 || p.status === 'Accepted').length, color: '#22C55E' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="text-xs text-secondary">{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {isClient && (
              <div className="glass-card p-5"
                style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.15)' }}>
                <p className="text-sm font-semibold text-primary mb-2">🤖 AI Tip</p>
                <p className="text-xs leading-relaxed text-secondary">
                  Proposals with AI scores above 90% have a 3x higher success rate. Consider shortlisting Alex Johnson's proposal first.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}