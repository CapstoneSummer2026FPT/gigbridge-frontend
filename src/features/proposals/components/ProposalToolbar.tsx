import type { ProposalSortBy, ProposalStatusFilter } from '../types';

interface ProposalToolbarProps {
  showToolbars: boolean;
  proposalStatusFilter: ProposalStatusFilter;
  proposalSortBy: ProposalSortBy;
  onStatusFilterChange: (status: ProposalStatusFilter) => void;
  onSortByChange: (sortBy: ProposalSortBy) => void;
}

export function ProposalToolbar({
  showToolbars,
  proposalStatusFilter,
  proposalSortBy,
  onStatusFilterChange,
  onSortByChange,
}: ProposalToolbarProps) {
  return (
    <div className={`proposal-manage-toolbar ${showToolbars ? 'visible' : 'hidden'}`}>
      <div className="proposal-filter-group">
        <label>
          <span>Filter</span>
          <div className="proposal-filter-pills">
            {['all', '0', '2', '3'].map(status => {
              const label = status === 'all' ? 'All' : status === '0' ? 'Pending' : status === '2' ? 'Accepted' : 'Rejected';
              return (
                <button
                  key={status}
                  className={`proposal-filter-pill ${proposalStatusFilter === status ? 'active' : ''}`}
                  onClick={() => onStatusFilterChange(status as ProposalStatusFilter)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </label>
      </div>

      <div className="proposal-sort-group">
        <label>
          <span>Sort by</span>
          <select value={proposalSortBy} onChange={event => onSortByChange(event.target.value as ProposalSortBy)}>
            <option value="interviewScore">Score</option>
            <option value="status">Status</option>
            <option value="submittedAt">Submitted date</option>
            <option value="rate">Proposed rate</option>
          </select>
        </label>
      </div>
    </div>
  );
}
