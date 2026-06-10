import { useNavigate } from 'react-router';
import { BarChart2, Briefcase, CheckCircle, Clock, Eye, FileText } from 'lucide-react';
import { ProposalCard } from './ProposalCard';
import type { JobProposalGroup, ProposalDetailMode, ProposalStatusFilter, ProposalViewModel } from '../types';
import { getStatusLabel, getStatusClass } from '../utils/statusHelpers';

interface FreelancerProposalViewProps {
  loading: boolean;
  proposals: ProposalViewModel[];
  statusFilter: ProposalStatusFilter;
  jobGroups: JobProposalGroup[];
  onStatusFilterChange: (status: ProposalStatusFilter) => void;
  onViewDetail: (proposal: ProposalViewModel, mode: ProposalDetailMode) => void;
  onCreateContract: (proposal: ProposalViewModel) => void;
  onCompetitionMatrix: (job: JobProposalGroup) => void;
}

export function FreelancerProposalView({
  loading,
  proposals,
  statusFilter,
  jobGroups,
  onStatusFilterChange,
  onViewDetail,
  onCreateContract,
  onCompetitionMatrix,
}: FreelancerProposalViewProps) {
  const navigate = useNavigate();

  const filteredProposals = statusFilter === 'all'
    ? proposals
    : proposals.filter(proposal => String(proposal.status) === statusFilter);

  const sortedProposals = [...filteredProposals].sort((a, b) =>
    new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );

  return (
    <div className="freelancer-proposals-shell">
      <div className="freelancer-proposals-toolbar">
        <div>
          <h2>My Proposals & Applications</h2>
          <p>Sorted by submitted date, newest first. Accepted proposals link to their contract.</p>
        </div>
        <label>
          <span>Filter by status</span>
          <select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value as ProposalStatusFilter)}>
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
      ) : sortedProposals.length === 0 ? (
        <div className="proposals-empty">
          <FileText size={32} />
          <p>No proposals found</p>
          <span>Your submitted applications will appear here.</span>
        </div>
      ) : (
        <div className="freelancer-proposal-list">
          {sortedProposals.map(proposal => {
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
                  {proposal.isAIGenerated !== undefined && (
                    <div>
                      <span>•</span>
                      <span>{proposal.isAIGenerated ? 'AI Generated' : 'Manual proposal'}</span>
                    </div>
                  )}
                </div>

                <div className="freelancer-proposal-actions">
                  <button className="proposal-view-btn" onClick={() => navigate(`/jobs/${proposal.jobPostsId}`)}>
                    <Eye size={15} />
                    View JobPost
                  </button>
                  <button className="proposal-view-btn" onClick={() => onViewDetail(proposal, 'detail')}>
                    <FileText size={15} />
                    Proposal Details
                  </button>
                  {accepted && (
                    <button className="proposal-accepted-contract-btn" onClick={() => navigate('/contracts')}>
                      <CheckCircle size={15} />
                      View Contract
                    </button>
                  )}
                  {relatedJob && (
                    <button className="proposal-view-btn" onClick={() => onCompetitionMatrix(relatedJob)}>
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
  );
}
