import { ContractStatus } from '../../../types/models/Contract';
import '../styles/contract-status-filter.css';

interface StatusOption {
  value: ContractStatus | 'All';
  label: string;
  count?: number;
}

interface ContractStatusFilterProps {
  statuses: StatusOption[];
  selectedStatus: ContractStatus | 'All';
  onStatusChange: (status: ContractStatus | 'All') => void;
  isCompact?: boolean;
}

/**
 * ContractStatusFilter Component
 * 
 * Reusable filter component for contract status selection.
 * Displays status options as buttons with optional badge counts.
 * 
 * Usage:
 * ```tsx
 * <ContractStatusFilter
 *   statuses={[
 *     { value: 'All', label: 'All', count: 10 },
 *     { value: ContractStatus.Active, label: 'Active', count: 5 },
 *   ]}
 *   selectedStatus={selectedStatus}
 *   onStatusChange={setSelectedStatus}
 * />
 * ```
 */
export function ContractStatusFilter({
  statuses,
  selectedStatus,
  onStatusChange,
  isCompact = false,
}: ContractStatusFilterProps) {
  return (
    <div className={`contract-status-filter ${isCompact ? 'compact' : ''}`}>
      {statuses.map((status) => (
        <button
          key={`${status.value}`}
          onClick={() => onStatusChange(status.value)}
          className={`status-filter-btn ${selectedStatus === status.value ? 'active' : ''}`}
          aria-label={`Filter by ${status.label}`}
          aria-pressed={selectedStatus === status.value}
        >
          <span className="filter-label">{status.label}</span>
          {status.count !== undefined && (
            <span className="filter-count">{status.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default ContractStatusFilter;
