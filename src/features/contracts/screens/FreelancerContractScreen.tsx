import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Eye,
  Calendar,
  DollarSign,
  User,
  FileUp,
  PenTool,
  TrendingUp,
  Award,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MoreVertical,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

export default function FreelancerContractScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [contracts, setContracts] = useState<ContractWithMilestones[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'completed'>('active');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [expandedContractIds, setExpandedContractIds] = useState<Set<string>>(new Set());

  // Load freelancer contracts
  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoading(true);

        const params: ContractQueryParams = {
          pageIndex: 0,
          pageSize: 50,
        };

        const response = await contractGetAPI.getMyContracts(params);

        if (response.success && response.data) {
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

  // Filter & sort contracts
  useEffect(() => {
    let result = contracts;

    // Tab filter
    if (activeTab === 'active') {
      result = result.filter(c => c.status === ContractStatus.Active);
    } else if (activeTab === 'pending') {
      result = result.filter(c => c.status === ContractStatus.PendingSignature);
    } else if (activeTab === 'completed') {
      result = result.filter(c => c.status === ContractStatus.Completed);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(query) ||
          (c.clientProfilesId && c.clientProfilesId.toLowerCase().includes(query))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        comparison = dateB - dateA;
      } else if (sortBy === 'value') {
        comparison = (b.totalBudget || 0) - (a.totalBudget || 0);
      }
      return comparison;
    });

    setFilteredContracts(result);
  }, [contracts, activeTab, searchQuery, sortBy]);

  const calculateMilestoneProgress = (contract: ContractWithMilestones) => {
    if (!contract.milestones || contract.milestones.length === 0) return 0;
    const completed = contract.milestones.filter(m => m.status === MilestoneStatus.Paid).length;
    return Math.round((completed / contract.milestones.length) * 100);
  };

  const getMilestoneStats = (contract: ContractWithMilestones) => {
    if (!contract.milestones || contract.milestones.length === 0) {
      return { total: 0, completed: 0, pending: 0 };
    }
    const completed = contract.milestones.filter(m => m.status === MilestoneStatus.Approved || m.status === MilestoneStatus.Paid).length;
    const total = contract.milestones.length;
    return { total, completed, pending: total - completed };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="contract-loader">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="spinner"
          />
          <p>Loading your contracts...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="contract-screen-wrapper">
        {/* Header Section */}
        <div
          className="contract-header-section"
        >
          <div className="header-content">
            <div className="header-title-group">
              <h1>My Contracts</h1>
              <p>Manage projects, track milestones, submit deliverables</p>
            </div>

            <div className="header-stats">
              <div className="stat">
                <span className="stat-icon"><Clock size={16} /></span>
                <div>
                  <span className="stat-label">Active</span>
                  <span className="stat-number">{contracts.filter(c => c.status === ContractStatus.Active).length}</span>
                </div>
              </div>
              <div className="stat">
                <span className="stat-icon"><TrendingUp size={16} /></span>
                <div>
                  <span className="stat-label">Total Value</span>
                  <span className="stat-number">{formatContractAmount(contracts.reduce((s, c) => s + (c.totalBudget || 0), 0))}</span>
                </div>
              </div>
              <div className="stat">
                <span className="stat-icon"><Award size={16} /></span>
                <div>
                  <span className="stat-label">Completed</span>
                  <span className="stat-number">{contracts.filter(c => c.status === ContractStatus.Completed).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Controls */}
        <motion.div
          className="contract-controls-section"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="tabs-wrapper">
            {(['active', 'pending', 'completed'] as const).map((tab) => {
              const tabCount = contracts.filter(c => 
                tab === 'active' ? c.status === ContractStatus.Active :
                tab === 'pending' ? c.status === ContractStatus.PendingSignature :
                c.status === ContractStatus.Completed
              ).length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                >
                  {tab === 'active' && <Clock size={16} />}
                  {tab === 'pending' && <AlertTriangle size={16} />}
                  {tab === 'completed' && <CheckCircle2 size={16} />}
                  <span className="tab-label">
                    {tab === 'active' && 'Active'}
                    {tab === 'pending' && 'Pending'}
                    {tab === 'completed' && 'Completed'}
                  </span>
                  <span className="tab-count">{tabCount}</span>
                </button>
              );
            })}
          </div>

          <div className="controls-toolbar">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contracts..."
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-btn">✕</button>
              )}
            </div>

            <button
              className="sort-button"
              onClick={() => setSortBy(sortBy === 'date' ? 'value' : 'date')}
            >
              <ArrowUpDown size={14} />
              {sortBy === 'date' ? 'By Date' : 'By Value'}
            </button>
          </div>
        </motion.div>

        {/* Contracts Grid */}
        <div className="contracts-grid-section">
          <AnimatePresence mode="wait">
            {filteredContracts.length === 0 ? (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Zap size={48} />
                <h3>{searchQuery ? 'No contracts found' : 'No contracts in this category'}</h3>
                <p>{searchQuery ? 'Try a different search' : 'Contracts you accept will appear here'}</p>
              </motion.div>
            ) : (
              <motion.div
                className="contracts-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredContracts.map((contract, idx) => {
                  const progress = calculateMilestoneProgress(contract);
                  const milestoneStats = getMilestoneStats(contract);

                  return (
                    <motion.div
                      key={contract.contractsId}
                      className="contract-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {/* Card Header */}
                      <div className="card-header">
                        <div className="header-left">
                          <h3 className="contract-title">{contract.title}</h3>
                          <span className={`status-badge ${getContractStatusClass(contract.status)}`}>
                            {getContractStatusLabel(contract.status)}
                          </span>
                        </div>
                        <button className="menu-btn">
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {/* Card Body */}
                      <div className="card-body">
                        {/* Info Grid */}
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">
                              <User size={14} />
                              Client
                            </span>
                            <span className="info-value">{contract.clientName || contract.clientProfilesId}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">
                              <DollarSign size={14} />
                              Budget
                            </span>
                            <span className="info-value">{formatContractAmount(contract.totalBudget)}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">
                              <Calendar size={14} />
                              Started
                            </span>
                            <span className="info-value">{formatContractDate(contract.startDate)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {milestoneStats.total > 0 && (
                          <div className="progress-section">
                            <div className="progress-header">
                              <span className="progress-label">Milestones</span>
                              <span className="progress-text">{milestoneStats.completed}/{milestoneStats.total}</span>
                            </div>
                            <div className="progress-bar">
                              <motion.div
                                className="progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Milestone Stats */}
                        {milestoneStats.total > 0 && (
                          <div className="milestone-stats">
                            <div className="stat-badge completed">
                              <CheckCircle2 size={14} />
                              {milestoneStats.completed} Completed
                            </div>
                            <div className="stat-badge pending">
                              <Clock size={14} />
                              {milestoneStats.pending} Pending
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="card-footer">
                        <button
                          className="action-btn view-btn"
                          onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                        >
                          <Eye size={14} />
                          View Details
                        </button>
                        {contract.status === ContractStatus.PendingSignature && (
                          <button
                            className="action-btn sign-btn"
                            onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)}
                          >
                            <PenTool size={14} />
                            Sign
                          </button>
                        )}
                        {contract.status === ContractStatus.Active && (
                          <button
                            className="action-btn expand-btn"
                            onClick={() => {
                              setExpandedContractIds(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(contract.contractsId)) {
                                  newSet.delete(contract.contractsId);
                                } else {
                                  newSet.add(contract.contractsId);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <FileUp size={14} />
                            {expandedContractIds.has(contract.contractsId) ? 'Collapse' : 'Milestones'}
                          </button>
                        )}
                      </div>

                      {/* Expanded Milestones */}
                      <AnimatePresence>
                        {expandedContractIds.has(contract.contractsId) && contract.milestones && (
                          <motion.div
                            className="expanded-milestones"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <div className="milestones-list">
                              {contract.milestones.map((milestone, i) => (
                                <MilestoneDetailCard
                                  key={milestone.id || `${contract.contractsId}-milestone-${i}`}
                                  milestone={milestone}
                                  index={i}
                                  onSubmitDeliverable={() => navigate(`/contracts/${contract.contractsId}/deliverables/${milestone.id || i}`)}
                                  isSubmittingFor={false}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Info */}
        {filteredContracts.length > 0 && (
          <motion.div
            className="results-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Removed - moved filter stats to header */}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
