import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Eye,
  Calendar,
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
  ChevronDown,
  ChevronRight,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ContractDto, ContractQueryParams, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import {
  getContractStatusLabel,
  getContractStatusClass,
  formatContractAmount,
  formatContractDate,
  calculateMilestoneCompletion,
} from '../../../shared/utils/contractUtils';
import { MilestoneDetailCard } from '../components/MilestoneDetailCard';
import '../styles/freelancer-contract-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { ContractAreaTabs } from '../components/ContractAreaTabs';

interface MilestoneDisplay extends Milestone {
  percentageComplete: number;
  isOverdue: boolean;
}

interface ContractWithMilestones extends ContractDto {
  milestones?: MilestoneDisplay[];
  clientName?: string;
}

const mapMilestoneForDisplay = (milestone: Milestone): MilestoneDisplay => {
  const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
  const isCompleted = milestone.status === MilestoneStatus.Approved;

  return {
    ...milestone,
    percentageComplete: calculateMilestoneCompletion(milestone.status),
    isOverdue: Boolean(dueDate && !isCompleted && dueDate < new Date()),
  };
};

export default function FreelancerContractScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<ContractWithMilestones[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'completed'>('active');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [expandedContractIds, setExpandedContractIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

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

        if (!response.success) {
          setContracts([]);
          setError(response.message || 'Failed to load contracts.');
          return;
        }

        const contractsWithMilestones = await Promise.all(
          (response.data || []).map(async (contract): Promise<ContractWithMilestones> => {
            const milestonesResponse = await contractGetAPI.getMilestonesByContract(contract.contractsId);

            return {
              ...contract,
              milestones: milestonesResponse.success
                ? (milestonesResponse.data || []).map(mapMilestoneForDisplay)
                : [],
            };
          })
        );

        setContracts(contractsWithMilestones);
      } catch (err: unknown) {
        setContracts([]);
        setError(err instanceof Error ? err.message : 'Failed to load contracts.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadContracts();
    } else {
      setContracts([]);
      setLoading(false);
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
          (c.clientName && c.clientName.toLowerCase().includes(query)) ||
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
    setCurrentPage(1); // Reset page to 1 on filter/tab changes
  }, [contracts, activeTab, searchQuery, sortBy]);

  const calculateMilestoneProgress = (contract: ContractWithMilestones) => {
    if (!contract.milestones || contract.milestones.length === 0) return 0;
    const completed = contract.milestones.filter(m => m.status === MilestoneStatus.Approved).length;
    return Math.round((completed / contract.milestones.length) * 100);
  };

  const getMilestoneStats = (contract: ContractWithMilestones) => {
    if (!contract.milestones || contract.milestones.length === 0) {
      return { total: 0, completed: 0, pending: 0 };
    }
    const completed = contract.milestones.filter(m => m.status === MilestoneStatus.Approved).length;
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
          <p>{t('contracts.loading')}</p>
        </div>
      </AppLayout>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / itemsPerPage));
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AppLayout>
      <div className="contract-screen-wrapper">
        <ContractAreaTabs />

        {/* Header Section */}
        <div
          className="contract-header-section"
        >
          <div className="header-content">
            <div className="header-title-group">
              <h1>{t('contracts.myContracts')}</h1>
              <p>{t('contracts.manageSubtitle')}</p>
            </div>

            <div className="header-stats">
              <div className="stat">
                <span className="stat-icon"><Clock size={16} /></span>
                <div>
                  <span className="stat-label">{t('contracts.active')}</span>
                  <span className="stat-number">{contracts.filter(c => c.status === ContractStatus.Active).length}</span>
                </div>
              </div>
              <div className="stat">
                <span className="stat-icon"><TrendingUp size={16} /></span>
                <div>
                  <span className="stat-label">{t('contracts.totalValue')}</span>
                  <span className="stat-number">{formatContractAmount(contracts.reduce((s, c) => s + (c.totalBudget || 0), 0))}</span>
                </div>
              </div>
              <div className="stat">
                <span className="stat-icon"><Award size={16} /></span>
                <div>
                  <span className="stat-label">{t('contracts.completed')}</span>
                  <span className="stat-number">{contracts.filter(c => c.status === ContractStatus.Completed).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-1 mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

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
                    {tab === 'active' && t('contracts.tabActive')}
                    {tab === 'pending' && t('contracts.tabPending')}
                    {tab === 'completed' && t('contracts.tabCompleted')}
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
                placeholder={t('contracts.searchPlaceholder')}
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
              {sortBy === 'date' ? t('contracts.sortByDate') : t('contracts.sortByValue')}
            </button>
          </div>
        </motion.div>

        {/* Contracts List / Rows */}
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
                <h3>{searchQuery ? t('contracts.noContractsFound') : t('contracts.noContractsCategory')}</h3>
                <p>{searchQuery ? t('contracts.tryDifferentSearch') : t('contracts.contractsAppearHere')}</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginatedContracts.map((contract, index) => {
                  const progress = calculateMilestoneProgress(contract);
                  const milestoneStats = getMilestoneStats(contract);
                  const isExpanded = expandedContractIds.has(contract.contractsId);
                  const name = contract.clientName || contract.clientProfilesId || t('projects.unknownClient');
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const getStatusColorHex = (status: ContractStatus) => {
                    switch(status) {
                      case ContractStatus.Active: return '#0077FF';
                      case ContractStatus.Completed: return '#22C55E';
                      case ContractStatus.Cancelled: return '#EF4444';
                      case ContractStatus.Disputed: return '#F59E0B';
                      default: return '#9F4BFF';
                    }
                  };
                  const statusColor = getStatusColorHex(contract.status);

                  return (
                    <motion.div
                      key={contract.contractsId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: (index % itemsPerPage) * 0.05 }}
                      className="bg-card hover:bg-card/95 border border-border/55 hover:border-blue-500/20 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative flex flex-col"
                    >
                      {/* Left vertical border for status */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1.5" 
                        style={{ backgroundColor: statusColor }}
                      />

                      {/* Main Row Content */}
                      <div className="p-5 pl-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left Section: Avatar Initials & Info */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div 
                            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white shadow-sm"
                            style={{ 
                              background: `linear-gradient(135deg, ${statusColor}dd, ${statusColor})`,
                            }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h3 
                              onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                              className="text-base font-bold text-foreground truncate hover:text-blue-500 transition-colors cursor-pointer"
                            >
                              {contract.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground font-semibold">
                              <span className="text-foreground flex items-center gap-1.5">
                                <User size={13} className="text-muted-foreground" />
                                {name}
                              </span>
                              <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                              <span className="flex items-center gap-1.5">
                                <Calendar size={13} />
                                {formatContractDate(contract.startDate)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Center Section: Budget & Progress */}
                        <div className="flex flex-wrap items-center gap-6 lg:gap-10 shrink-0">
                          {/* Budget */}
                          <div className="flex flex-col min-w-[90px]">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{t('contracts.budget')}</span>
                            <span className="text-sm font-black text-foreground mt-0.5">
                              {formatContractAmount(contract.totalBudget)}
                            </span>
                          </div>

                          {/* Progress */}
                          {milestoneStats.total > 0 && (
                            <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider mb-1">
                                <span className="text-muted-foreground">{t('contracts.milestones', { progress })}</span>
                                <span className="text-blue-500 font-bold">{t('contracts.milestonesPaid', { completed: milestoneStats.completed, total: milestoneStats.total })}</span>
                              </div>
                              <div className="h-1.5 bg-secondary border border-border/40 rounded-full overflow-hidden w-full">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Section: Status & Actions */}
                        <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 border-t border-border/20 pt-3 lg:border-t-0 lg:pt-0">
                          <span className={`status-badge ${getContractStatusClass(contract.status)}`}>
                            {t(`contracts.status.${contract.status}`, { defaultValue: getContractStatusLabel(contract.status) })}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                              className="p-2 bg-secondary/50 hover:bg-blue-500/10 border border-border/50 hover:border-blue-500/30 rounded-xl flex items-center justify-center text-muted-foreground hover:text-blue-500 transition-all duration-200 cursor-pointer"
                              title={t('contracts.viewDetails')}
                            >
                              <Eye size={16} />
                            </button>

                            {contract.status === ContractStatus.Active && (
                              <button
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
                                className={`p-2 bg-secondary/50 border border-border/50 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer
                                  ${isExpanded ? 'bg-secondary border-foreground/30 rotate-180' : ''}`}
                                title={isExpanded ? t('contracts.collapse') : t('contracts.expand')}
                              >
                                <ChevronDown size={16} />
                              </button>
                            )}

                            {contract.canReview && (
                              <button
                                onClick={() => navigate(`/reviews/create?contractId=${contract.contractsId}`)}
                                className="p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-xl flex items-center justify-center text-amber-500 transition-all duration-200 cursor-pointer"
                                title={t('contracts.leaveReview')}
                              >
                                <Star size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Milestones Section */}
                      <AnimatePresence>
                        {isExpanded && contract.milestones && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden border-t border-border/50 bg-secondary/10"
                          >
                            <div className="p-5 pl-7 flex flex-col gap-4">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                {t('contracts.milestoneBreakdown')}
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                              
                              {/* Quick Actions */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                                >
                                  {t('contracts.viewPortal')}
                                  <ChevronRight size={14} />
                                </button>
                                
                                {contract.status === ContractStatus.PendingSignature && (
                                  <button
                                    onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)}
                                    className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                                  >
                                    <PenTool size={13} />
                                    {t('contracts.signContract')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        {filteredContracts.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            {/* Left side: showing items text */}
            <div className="text-xs text-muted-foreground font-semibold">
              {t('contracts.showingContracts', {
                start: (currentPage - 1) * itemsPerPage + 1,
                end: Math.min(currentPage * itemsPerPage, filteredContracts.length),
                total: filteredContracts.length
              })}
            </div>

            {/* Center side: Page buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 border border-border/50 rounded-lg text-xs font-bold bg-secondary/20 hover:bg-secondary disabled:opacity-40 disabled:hover:bg-secondary/20 cursor-pointer transition-colors"
                title="First Page"
              >
                &laquo;
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-border/50 rounded-lg text-xs font-bold bg-secondary/20 hover:bg-secondary disabled:opacity-40 disabled:hover:bg-secondary/20 cursor-pointer transition-colors"
              >
                {t('contracts.prev')}
              </button>

              {/* Dynamic Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsis && <span className="text-muted-foreground px-1 text-xs">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-500/10'
                            : 'border-border/50 bg-secondary/20 hover:bg-secondary'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-border/50 rounded-lg text-xs font-bold bg-secondary/20 hover:bg-secondary disabled:opacity-40 disabled:hover:bg-secondary/20 cursor-pointer transition-colors"
              >
                {t('contracts.next')}
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 border border-border/50 rounded-lg text-xs font-bold bg-secondary/20 hover:bg-secondary disabled:opacity-40 disabled:hover:bg-secondary/20 cursor-pointer transition-colors"
                title="Last Page"
              >
                &raquo;
              </button>
            </div>

            {/* Right side: Items per page dropdown */}
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span>{t('contracts.show')}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-secondary/40 border border-border/50 rounded-lg py-1.5 px-3 focus:outline-none focus:border-blue-500 font-bold text-foreground cursor-pointer transition-colors"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} {t('contracts.rows')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
