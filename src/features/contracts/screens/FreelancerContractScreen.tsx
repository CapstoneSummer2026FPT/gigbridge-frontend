import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Filter,
  Eye,
  AlertCircle,
  ChevronDown,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  Clock,
  FileUp,
  PenTool,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, ContractQueryParams, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import {
  getContractStatusLabel,
  getContractStatusClass,
  formatContractAmount,
  formatContractDate,
} from '../../../shared/utils/contractUtils';
import { MilestoneDetailCard } from '../components/MilestoneDetailCard';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
import '../styles/freelancer-contract-screen.css';

interface MilestoneDisplay extends Milestone {
  percentageComplete: number;
  isOverdue: boolean;
}

interface ContractWithMilestones extends ContractDto {
  milestones?: MilestoneDisplay[];
  clientName?: string;
}

const CONTRACT_STATUSES = [
  { value: ContractStatus.Draft, label: 'Draft' },
  { value: ContractStatus.PendingSignature, label: 'Pending Signature' },
  { value: ContractStatus.Active, label: 'Active' },
  { value: ContractStatus.Completed, label: 'Completed' },
  { value: ContractStatus.Cancelled, label: 'Cancelled' },
  { value: ContractStatus.Disputed, label: 'Disputed' },
];

export default function FreelancerContractScreen() {
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

  // Load freelancer contracts
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
          // Filter for freelancer contracts (user is freelancerProfilesId)
          const userProfileId = (user as any)?.profileId || user?.id;
          const freelancerContracts = Array.isArray(response.data)
            ? response.data.filter((c: ContractDto) => c.freelancerProfilesId === userProfileId)
            : [];

          setContracts((freelancerContracts.length > 0 ? freelancerContracts : MOCK_CONTRACTS_FOR_SCREENS) as ContractWithMilestones[]);
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
      result = result.filter((c) => c.status === selectedStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          (c.clientProfilesId && c.clientProfilesId.toLowerCase().includes(query))
      );
    }

    setFilteredContracts(result);
  }, [contracts, selectedStatus, searchQuery]);

  const getStatusBadgeClass = (status: ContractStatus) => {
    return `status-badge ${getContractStatusClass(status)}`;
  };

  const calculateMilestoneStats = (contract: ContractWithMilestones) => {
    if (!contract.milestones || contract.milestones.length === 0) {
      return { total: 0, completed: 0, pending: 0, total_budget: 0, escrowed: 0, released: 0 };
    }

    const completed = contract.milestones.filter((m) => m.status === MilestoneStatus.Approved || m.status === MilestoneStatus.Paid).length;
    const pending = contract.milestones.filter((m) => m.status !== MilestoneStatus.Approved && m.status !== MilestoneStatus.Paid).length;
    const total = contract.milestones.length;
    const total_budget = contract.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    const escrowed = contract.milestones
      .filter((m) => m.status === MilestoneStatus.Approved || m.status === MilestoneStatus.SubmittedForReview)
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const released = contract.milestones
      .filter((m) => m.status === MilestoneStatus.Paid)
      .reduce((sum, m) => sum + (m.amount || 0), 0);

    return { total, completed, pending, total_budget, escrowed, released };
  };

  const handleViewDetails = (contractId: string) => {
    navigate(`/contracts/${contractId}`, { state: { tab: 'details', role: 'freelancer' } });
  };

  const handleMilestoneDeliverableSubmit = (milestoneId: string) => {
    if (!expandedContractId) return;
    navigate(`/contracts/${expandedContractId}/deliverables/${milestoneId}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="freelancer-contract-wrapper">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your contracts...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="freelancer-contract-wrapper">
        {/* Header */}
        <div className="freelancer-contract-header">
          <h1 className="freelancer-contract-title">My Contracts</h1>
          <p className="freelancer-contract-subtitle">
            Track your contracts and submit deliverables - {contracts.length} total
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="success-close">
              ✕
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="error-close">
              ✕
            </button>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="freelancer-contract-controls glass-card">
          <div className="freelancer-contract-search">
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by contract title or client..."
              className="freelancer-contract-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="freelancer-contract-search-clear"
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
                {CONTRACT_STATUSES.map((status) => (
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
        <div className="freelancer-contract-container">
          {filteredContracts.length === 0 ? (
            <div className="freelancer-contract-empty">
              <Search size={48} />
              <p className="freelancer-contract-empty-title">
                {searchQuery ? 'No contracts found' : 'No contracts yet'}
              </p>
              <p className="freelancer-contract-empty-subtitle">
                {searchQuery ? 'Try a different search term' : 'Your accepted contracts will appear here'}
              </p>
            </div>
          ) : (
            <div className="freelancer-contract-list">
              {filteredContracts.map((contract) => {
                const milestoneStats = calculateMilestoneStats(contract);
                const isExpanded = expandedContractId === contract.contractsId;

                return (
                  <div key={contract.contractsId} className="freelancer-contract-card glass-card">
                    {/* Card Header */}
                    <div className="freelancer-contract-card-header">
                      <div className="freelancer-contract-card-title-section">
                        <h3 className="freelancer-contract-card-title">{contract.title}</h3>
                        <span className={getStatusBadgeClass(contract.status)}>
                          {getContractStatusLabel(contract.status)}
                        </span>
                      </div>

                      <div className="freelancer-contract-card-actions">
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
                          className={`contract-action-btn contract-action-expand ${
                            isExpanded ? 'expanded' : ''
                          }`}
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="freelancer-contract-card-body">
                      <div className="contract-info-grid">
                        <div className="info-item">
                          <div className="info-label">
                            <User size={16} />
                            Client
                          </div>
                          <p className="info-value">{contract.clientName || contract.clientProfilesId}</p>
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
                          <div className="milestone-stat">
                            <span className="milestone-label">Escrow / Released</span>
                            <span className="milestone-value amount">
                              {formatContractAmount(milestoneStats.escrowed)} / {formatContractAmount(milestoneStats.released)}
                            </span>
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
                              <div className="freelancer-milestones-list">
                                {contract.milestones.map((milestone, idx) => (
                                  <MilestoneDetailCard
                                    key={milestone.id}
                                    milestone={milestone}
                                    index={idx}
                                    onSubmitDeliverable={() =>
                                      handleMilestoneDeliverableSubmit(milestone.id)
                                    }
                                    isSubmittingFor={false}
                                  />
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
                              <FileUp size={16} />
                              View Full Details
                            </button>
                            {contract.status === ContractStatus.PendingSignature && (
                              <button
                                onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)}
                                className="action-btn action-view-full"
                              >
                                <PenTool size={16} />
                                Sign Contract
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
          <div className="freelancer-contract-results-info">
            <p>
              Showing <strong>{filteredContracts.length}</strong> of <strong>{contracts.length}</strong>{' '}
              contracts
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
