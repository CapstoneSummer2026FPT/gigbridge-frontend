import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, Eye, AlertCircle, ChevronDown, Calendar, DollarSign, User, CheckCircle2, Clock, PenTool, ListChecks, Star, ShieldAlert } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, ContractQueryParams, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import { getContractStatusLabel, getContractStatusClass, getMilestoneStatusLabel, formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
import '../styles/manage-contract-screen.css';

interface MilestoneDisplay extends Milestone {
  percentageComplete: number;
  isOverdue: boolean;
}

interface ContractWithMilestones extends ContractDto {
  milestones?: MilestoneDisplay[];
  freelancerName?: string;
}

const CONTRACT_STATUSES = [
  { value: ContractStatus.Draft, label: 'Draft' },
  { value: ContractStatus.PendingSignature, label: 'Pending Signature' },
  { value: ContractStatus.Active, label: 'Active' },
  { value: ContractStatus.Completed, label: 'Completed' },
  { value: ContractStatus.Cancelled, label: 'Cancelled' },
  { value: ContractStatus.Disputed, label: 'Disputed' },
];

export default function ManageContractScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [contracts, setContracts] = useState<ContractWithMilestones[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'All'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // Load contracts
  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: ContractQueryParams = {
          pageIndex: 0,
          pageSize: 50,
        };

        const response = await contractGetAPI.getMyContracts(params);

        if (response.success && response.data) {
          // Filter for client contracts (user is clientProfilesId)
          const userProfileId = (user as any)?.profileId || user?.id;
          const clientContracts = Array.isArray(response.data) 
            ? response.data.filter((c: ContractDto) => c.clientProfilesId === userProfileId)
            : [];

          setContracts((clientContracts.length > 0 ? clientContracts : MOCK_CONTRACTS_FOR_SCREENS) as ContractWithMilestones[]);
        } else {
          setContracts(MOCK_CONTRACTS_FOR_SCREENS as ContractWithMilestones[]);
        }
      } catch (err) {
        setContracts(MOCK_CONTRACTS_FOR_SCREENS as ContractWithMilestones[]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadContracts();
    }
  }, [user?.id]);

  // Filter contracts
  useEffect(() => {
    let result = contracts;

    // Status filter
    if (selectedStatus !== 'All') {
      result = result.filter(c => c.status === selectedStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(query) ||
        (c.freelancerProfilesId && c.freelancerProfilesId.toLowerCase().includes(query))
      );
    }

    setFilteredContracts(result);
  }, [contracts, selectedStatus, searchQuery]);

  const handleStatusChange = async (contractId: string, newStatus: ContractStatus) => {
    try {
      const response = await contractPutAPI.updateContractStatus(contractId, newStatus);
      
      if (response.success) {
        setContracts(prev =>
          prev.map(c =>
            c.contractsId === contractId
              ? { ...c, status: newStatus }
              : c
          )
        );
        setSuccessMessage('Contract status updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || 'Failed to update contract status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getStatusBadgeClass = (status: ContractStatus) => {
    return `status-badge ${getContractStatusClass(status)}`;
  };

  const calculateMilestoneStats = (contract: ContractWithMilestones) => {
    if (!contract.milestones || contract.milestones.length === 0) {
      return { total: 0, completed: 0, pending: 0, total_budget: 0, progress: 0 };
    }

    const completed = contract.milestones.filter(m => m.status === MilestoneStatus.Paid || m.status === MilestoneStatus.Approved).length;
    const pending = contract.milestones.filter(m => m.status !== MilestoneStatus.Paid && m.status !== MilestoneStatus.Approved).length;
    const total = contract.milestones.length;
    const total_budget = contract.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    const progress = Math.round((completed / total) * 100);

    return { total, completed, pending, total_budget, progress };
  };

  const handleViewDetails = (contractId: string) => {
    navigate(`/contracts/${contractId}`, { state: { tab: 'details' } });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="manage-contract-wrapper">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading contracts...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="manage-contract-wrapper">
        {/* Header */}
        <div className="manage-contract-header">
          <h1 className="manage-contract-title">Contract Management</h1>
          <p className="manage-contract-subtitle">
            Monitor your contracts and track milestones - {contracts.length} total
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="success-close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="error-close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="manage-contract-controls glass-card">
          <div className="manage-contract-search">
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by contract title or freelancer..."
              className="manage-contract-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="manage-contract-search-clear"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
          >
            <Filter size={18} />
            Filter
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="filter-options glass-card">
            <div className="filter-group">
              <label className="filter-label">Contract Status</label>
              <div className="filter-buttons">
                <button
                  onClick={() => setSelectedStatus('All')}
                  className={`filter-btn ${selectedStatus === 'All' ? 'active' : ''}`}
                >
                  All
                </button>
                {CONTRACT_STATUSES.map(status => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`filter-btn ${selectedStatus === status.value ? 'active' : ''}`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contracts List */}
        <div className="manage-contract-container">
          {filteredContracts.length === 0 ? (
            <div className="manage-contract-empty">
              <Search size={48} />
              <p className="manage-contract-empty-title">
                {searchQuery ? 'No contracts found' : 'No contracts yet'}
              </p>
              <p className="manage-contract-empty-subtitle">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Your accepted proposals will appear here'}
              </p>
            </div>
          ) : (
            <div className="manage-contract-list">
              {filteredContracts.map((contract) => {
                const milestoneStats = calculateMilestoneStats(contract);
                const isExpanded = expandedContractId === contract.contractsId;

                return (
                  <div key={contract.contractsId} className="contract-card glass-card">
                    {/* Card Header */}
                    <div className="contract-card-header">
                      <div className="contract-card-title-section">
                        <h3 className="contract-card-title">{contract.title}</h3>
                        <span className={getStatusBadgeClass(contract.status)}>
                          {getContractStatusLabel(contract.status)}
                        </span>
                      </div>

                      <div className="contract-card-actions">
                        <button
                          onClick={() => handleViewDetails(contract.contractsId)}
                          className="contract-action-btn contract-action-view"
                          title="View contract details"
                        >
                          <Eye size={18} />
                        </button>

                        <button
                          onClick={() =>
                            setExpandedContractId(isExpanded ? null : contract.contractsId)
                          }
                          className={`contract-action-btn contract-action-expand ${isExpanded ? 'expanded' : ''}`}
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="contract-card-body">
                      <div className="contract-info-grid">
                        <div className="info-item">
                          <div className="info-label">
                            <User size={16} />
                            Freelancer
                          </div>
                          <p className="info-value">{contract.freelancerName || contract.freelancerProfilesId}</p>
                        </div>

                        <div className="info-item">
                          <div className="info-label">
                            <DollarSign size={16} />
                            Budget
                          </div>
                          <p className="info-value">{formatContractAmount(contract.totalBudget)}</p>
                        </div>

                        <div className="info-item">
                          <div className="info-label">
                            <Calendar size={16} />
                            Start Date
                          </div>
                          <p className="info-value">{formatContractDate(contract.startDate)}</p>
                        </div>

                        {contract.endDate && (
                          <div className="info-item">
                            <div className="info-label">
                              <Calendar size={16} />
                              End Date
                            </div>
                            <p className="info-value">{formatContractDate(contract.endDate)}</p>
                          </div>
                        )}
                      </div>

                      {/* Milestone Summary */}
                      {milestoneStats.total > 0 && (
                        <div className="milestone-summary">
                          <div className="milestone-stat">
                            <span className="milestone-label">Total Milestones</span>
                            <span className="milestone-value">{milestoneStats.total}</span>
                          </div>
                          <div className="milestone-stat">
                            <span className="milestone-label">Completed</span>
                            <span className="milestone-value completed">{milestoneStats.completed}</span>
                          </div>
                          <div className="milestone-stat">
                            <span className="milestone-label">Pending</span>
                            <span className="milestone-value pending">{milestoneStats.pending}</span>
                          </div>
                          <div className="milestone-stat">
                            <span className="milestone-label">Total Amount</span>
                            <span className="milestone-value amount">
                              {formatContractAmount(milestoneStats.total_budget)}
                            </span>
                          </div>
                        </div>
                      )}
                      {milestoneStats.total > 0 && (
                        <div className="contract-progress-strip">
                          <div className="contract-progress-header">
                            <span>Milestone progress</span>
                            <strong>{milestoneStats.progress}%</strong>
                          </div>
                          <div className="contract-progress-track">
                            <span style={{ width: `${milestoneStats.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="contract-expanded-content">
                          {/* Milestones List */}
                          {contract.milestones && contract.milestones.length > 0 && (
                            <div className="milestones-section">
                              <h4 className="milestones-title">Milestones</h4>
                              <div className="milestones-list">
                                {contract.milestones.map((milestone, idx) => (
                                  <div key={milestone.id} className="milestone-item">
                                    <div className="milestone-header">
                                      <div className="milestone-number">#{idx + 1}</div>
                                      <div className="milestone-info">
                                        <h5 className="milestone-name">{milestone.title}</h5>
                                        <p className="milestone-amount">
                                          {formatContractAmount(milestone.amount)}
                                        </p>
                                      </div>
                                      <div className="milestone-status-badge">
                                        {milestone.status === MilestoneStatus.Approved || milestone.status === MilestoneStatus.Paid ? (
                                          <>
                                            <CheckCircle2 size={16} className="status-icon success" />
                                            <span>{getMilestoneStatusLabel(milestone.status)}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock size={16} className="status-icon pending" />
                                            <span>{getMilestoneStatusLabel(milestone.status)}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="milestone-details">
                                      <span className="due-date">
                                        Due: {formatContractDate(milestone.due_date)}
                                      </span>
                                      {milestone.paid_at && (
                                        <span className="paid-date">
                                          Paid: {formatContractDate(milestone.paid_at)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          {contract.description && (
                            <div className="description-section">
                              <h4 className="description-title">Description</h4>
                              <p className="description-text">{contract.description}</p>
                            </div>
                          )}

                          {/* Contract Actions */}
                          <div className="contract-actions-expanded">
                            <button
                              onClick={() => handleViewDetails(contract.contractsId)}
                              className="action-btn action-view-full"
                            >
                              View Full Details
                            </button>
                            {contract.status === ContractStatus.PendingSignature && (
                              <button
                                onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)}
                                className="action-btn action-sign"
                              >
                                <PenTool size={16} />
                                Sign Contract
                              </button>
                            )}
                            {contract.status === ContractStatus.Active && (
                              <button
                                onClick={() => navigate(`/contracts/${contract.contractsId}/milestones`)}
                                className="action-btn action-milestones"
                              >
                                <ListChecks size={16} />
                                Manage Milestones
                              </button>
                            )}
                            {contract.status === ContractStatus.Completed && (
                              <button className="action-btn action-review">
                                <Star size={16} />
                                Leave Review
                              </button>
                            )}
                            {contract.status === ContractStatus.Disputed && (
                              <button
                                onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                                className="action-btn action-dispute"
                              >
                                <ShieldAlert size={16} />
                                View Dispute
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Results Info */}
        {filteredContracts.length > 0 && (
          <div className="manage-contract-results-info">
            <p>
              Showing <strong>{filteredContracts.length}</strong> of{' '}
              <strong>{contracts.length}</strong> contracts
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
