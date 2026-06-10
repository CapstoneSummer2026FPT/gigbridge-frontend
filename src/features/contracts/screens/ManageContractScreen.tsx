import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Eye, AlertCircle, ChevronDown, Calendar, 
  DollarSign, User, CheckCircle2, Clock, PenTool, ListChecks, 
  Star, ShieldAlert, X, ChevronRight, TrendingUp, Award, Layers
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, ContractQueryParams, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import { 
  getContractStatusLabel, 
  getContractStatusClass, 
  getMilestoneStatusLabel, 
  formatContractAmount, 
  formatContractDate 
} from '../../../shared/utils/contractUtils';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Load contracts from API with fallback to mock data
  useEffect(() => {
    const loadContracts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: ContractQueryParams = {
          pageIndex: 0,
          pageSize: 50,
        };
        const response = await contractGetAPI.getMyContracts(params);

        if (response.success && response.data && response.data.length > 0) {
          setContracts(response.data as ContractWithMilestones[]);
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
    } else {
      setContracts(MOCK_CONTRACTS_FOR_SCREENS as ContractWithMilestones[]);
      setLoading(false);
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
    setCurrentPage(1); // Reset to first page when filtering
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

  // Calculate dashboard summary metrics
  const calculateDashboardStats = () => {
    const activeContracts = contracts.filter(c => c.status === ContractStatus.Active);
    const totalBudget = contracts.reduce((sum, c) => sum + (c.totalBudget || 0), 0);
    
    let totalMilestones = 0;
    let completedMilestones = 0;
    contracts.forEach(c => {
      if (c.milestones) {
        totalMilestones += c.milestones.length;
        completedMilestones += c.milestones.filter(m => m.status === MilestoneStatus.Paid || m.status === MilestoneStatus.Approved).length;
      }
    });
    const milestoneRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return {
      activeCount: activeContracts.length,
      totalCount: contracts.length,
      totalBudget,
      milestoneRate,
    };
  };

  const dashboardStats = calculateDashboardStats();

  const getStatusColorHex = (status: ContractStatus) => {
    switch(status) {
      case ContractStatus.Active: return '#22C55E';
      case ContractStatus.Completed: return '#0077FF';
      case ContractStatus.Cancelled: return '#EF4444';
      case ContractStatus.Disputed: return '#F59E0B';
      default: return '#9F4BFF';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-10 animate-pulse">
          {/* Header Shimmer */}
          <div className="space-y-3 mb-10">
            <div className="h-12 bg-muted/65 rounded-2xl w-1/4" />
            <div className="h-5 bg-muted/40 rounded-xl w-2/5" />
          </div>

          {/* KPI Cards Shimmer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-card border border-border/50 rounded-[2.5rem] p-6 flex items-center gap-5">
                <div className="w-14 h-14 bg-muted rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>

          {/* Controls Shimmer */}
          <div className="h-16 bg-card border border-border/50 rounded-2xl w-full mb-8" />

          {/* List Shimmer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-card border border-border/50 rounded-[2.5rem] p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-1/4" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-10 bg-muted/50 rounded-xl" />
                  <div className="h-10 bg-muted/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted/50 rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
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
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-10 relative">
        
        {/* Glow decorative background elements */}
        <div className="absolute top-0 right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-[40%] left-[5%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 blur-3xl -z-10 pointer-events-none" />

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers size={12} />
            Contract Portal
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent uppercase">
            Contract Management
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base md:text-lg font-medium">
            Monitor active engagements, track payment milestones, and coordinate sign-offs in real time.
          </p>
        </motion.div>

        {/* KPI Summary Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
        >
          {/* Card 1 */}
          <motion.div 
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="kpi-card-custom group bg-card hover:bg-card/90 border border-border/50 hover:border-blue-500/30 rounded-[2rem] p-6 shadow-md hover:shadow-xl transition-all duration-300 flex items-center gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-300" />
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/15 flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Contracts</span>
              <span className="text-3xl font-black text-foreground mt-1">
                {dashboardStats.activeCount}{' '}
                <span className="text-sm text-muted-foreground font-semibold">/ {dashboardStats.totalCount} total</span>
              </span>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="kpi-card-custom group bg-card hover:bg-card/90 border border-border/50 hover:border-purple-500/30 rounded-[2rem] p-6 shadow-md hover:shadow-xl transition-all duration-300 flex items-center gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-300" />
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/15 flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Committed Value</span>
              <span className="text-3xl font-black text-foreground mt-1">
                {formatContractAmount(dashboardStats.totalBudget)}
              </span>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="kpi-card-custom group bg-card hover:bg-card/90 border border-border/50 hover:border-emerald-500/30 rounded-[2rem] p-6 shadow-md hover:shadow-xl transition-all duration-300 flex items-center gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-300" />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 flex items-center justify-center shrink-0 relative">
              <CheckCircle2 size={24} />
              <motion.span 
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-3 right-3 w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10B981]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Milestone Completion</span>
              <span className="text-3xl font-black text-foreground mt-1">
                {dashboardStats.milestoneRate}%
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Global Notifications */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} />
                <p className="font-semibold text-sm">{successMessage}</p>
              </div>
              <button 
                onClick={() => setSuccessMessage(null)}
                className="p-1 text-emerald-500/60 hover:text-emerald-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                <p className="font-semibold text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="p-1 text-destructive/60 hover:text-destructive cursor-pointer"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter Controls Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card/75 border border-border/50 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shadow-md backdrop-blur-md"
        >
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by contract title or freelancer..."
              className="w-full pl-11 pr-12 py-3 bg-secondary/30 hover:bg-secondary/40 focus:bg-card border border-border/50 focus:border-blue-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-foreground placeholder:text-muted-foreground transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Toggle Filter Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`px-5 py-3 border rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm transition-all duration-300 cursor-pointer shadow-sm
              ${showFilters 
                ? 'bg-blue-500 border-blue-500 text-white shadow-blue-500/20' 
                : 'bg-secondary/40 border-border/50 hover:bg-secondary/80 text-foreground'
              }`}
          >
            <Filter size={16} />
            Filter Status
          </motion.button>
        </motion.div>

        {/* Expandable Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden bg-card/45 border border-border/40 rounded-2xl shadow-inner backdrop-blur-sm"
            >
              <div className="p-6">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-4">
                  Filter by Contract Status
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStatus('All')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border
                      ${selectedStatus === 'All' 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
                        : 'bg-secondary/35 border-border/40 text-muted-foreground hover:text-foreground hover:border-border-hover'
                      }`}
                  >
                    All Contracts
                  </button>
                  {CONTRACT_STATUSES.map(status => (
                    <button
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border
                        ${selectedStatus === status.value 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
                          : 'bg-secondary/35 border-border/40 text-muted-foreground hover:text-foreground hover:border-border-hover'
                        }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contracts Container / List Grid */}
        <div className="w-full">
          {filteredContracts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 px-6 bg-card/30 border border-border/40 rounded-[2.5rem] border-dashed text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center mb-4 border border-border/40">
                <Search size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {searchQuery ? 'No contracts matched search' : 'No contracts found'}
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {searchQuery 
                  ? 'Try modifying your search term or select another status filter above.' 
                  : 'Contracts resulting from approved proposals will appear here.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedStatus('All'); }}
                  className="mt-5 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-all cursor-pointer shadow-md shadow-blue-500/10"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              {paginatedContracts.map((contract, index) => {
                const milestoneStats = calculateMilestoneStats(contract);
                const isExpanded = expandedContractId === contract.contractsId;
                const name = contract.freelancerName || contract.freelancerProfilesId || 'Unknown Freelancer';
                const initials = name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();
                const statusColor = getStatusColorHex(contract.status);

                return (
                  <motion.div
                    key={contract.contractsId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: (index % itemsPerPage) * 0.05 }}
                    className="bg-card hover:bg-card/95 border border-border/55 hover:border-blue-500/20 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative flex flex-col"
                  >
                    {/* Horizontal left border color depending on status */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5" 
                      style={{ backgroundColor: statusColor }}
                    />

                    {/* Main Row Content */}
                    <div className="p-5 pl-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left Block: Avatar Initials & Contract Info */}
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
                            onClick={() => handleViewDetails(contract.contractsId)}
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
                              {contract.endDate && ` - ${formatContractDate(contract.endDate)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Center Block: Budget & Progress */}
                      <div className="flex flex-wrap items-center gap-6 lg:gap-10 shrink-0">
                        {/* Budget */}
                        <div className="flex flex-col min-w-[90px]">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Budget</span>
                          <span className="text-sm font-black text-foreground mt-0.5">
                            {formatContractAmount(contract.totalBudget)}
                          </span>
                        </div>

                        {/* Progress */}
                        {milestoneStats.total > 0 && (
                          <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider mb-1">
                              <span className="text-muted-foreground">Milestones ({milestoneStats.progress}%)</span>
                              <span className="text-blue-500 font-bold">{milestoneStats.completed}/{milestoneStats.total} Paid</span>
                            </div>
                            <div className="h-1.5 bg-secondary border border-border/40 rounded-full overflow-hidden w-full">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ width: `${milestoneStats.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Block: Status & Expand Action */}
                      <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 border-t border-border/20 pt-3 lg:border-t-0 lg:pt-0">
                        <span className={getStatusBadgeClass(contract.status)}>
                          {getContractStatusLabel(contract.status)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(contract.contractsId)}
                            className="p-2 bg-secondary/50 hover:bg-blue-500/10 border border-border/50 hover:border-blue-500/30 rounded-xl flex items-center justify-center text-muted-foreground hover:text-blue-500 transition-all duration-200 cursor-pointer"
                            title="View contract details"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => setExpandedContractId(isExpanded ? null : contract.contractsId)}
                            className={`p-2 bg-secondary/50 border border-border/50 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer
                              ${isExpanded ? 'bg-secondary border-foreground/30 rotate-180' : ''}`}
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Section with Milestones List */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden border-t border-border/50 bg-secondary/10"
                        >
                          <div className="p-5 pl-7 flex flex-col gap-4">
                            {/* Milestones detail List */}
                            {contract.milestones && contract.milestones.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                  Milestone Breakdown
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {contract.milestones.map((milestone, idx) => (
                                    <div 
                                      key={milestone.id} 
                                      className="flex items-center justify-between p-3 bg-card border border-border/30 rounded-xl gap-3 text-xs"
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                                          #{idx + 1}
                                        </div>
                                        <div className="flex flex-col min-width-0 flex-1">
                                          <h5 className="font-bold text-foreground truncate">{milestone.title}</h5>
                                          <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                            Due: {formatContractDate(milestone.due_date)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-bold text-foreground">{formatContractAmount(milestone.amount)}</span>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-card border border-border/40 rounded-lg font-bold text-[10px]">
                                          {milestone.status === MilestoneStatus.Approved || milestone.status === MilestoneStatus.Paid ? (
                                            <>
                                              <CheckCircle2 size={12} className="text-emerald-500" />
                                              <span className="text-emerald-500">{getMilestoneStatusLabel(milestone.status)}</span>
                                            </>
                                          ) : (
                                            <>
                                              <Clock size={12} className="text-amber-500 animate-pulse" />
                                              <span className="text-amber-500">{getMilestoneStatusLabel(milestone.status)}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Description block */}
                            {contract.description && (
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                  Scope Summary
                                </span>
                                <p className="text-xs text-muted-foreground leading-relaxed p-3 bg-card border border-border/30 rounded-xl italic">
                                  {contract.description}
                                </p>
                              </div>
                            )}

                            {/* Contract Action Controls */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                onClick={() => handleViewDetails(contract.contractsId)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                              >
                                View Portal
                                <ChevronRight size={14} />
                              </button>
                              
                              {contract.status === ContractStatus.PendingSignature && (
                                <button
                                  onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)}
                                  className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <PenTool size={13} />
                                  Sign Contract
                                </button>
                              )}
                              
                              {contract.status === ContractStatus.Active && (
                                <button
                                  onClick={() => navigate(`/contracts/${contract.contractsId}/milestones`)}
                                  className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <ListChecks size={13} />
                                  Milestones
                                </button>
                              )}
                              
                              {contract.status === ContractStatus.Completed && (
                                <button className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5">
                                  <Star size={13} />
                                  Leave Review
                                </button>
                              )}
                              
                              {contract.status === ContractStatus.Disputed && (
                                <button
                                  onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <ShieldAlert size={13} />
                                  Dispute Hub
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
        </div>

        {/* Pagination Controls */}
        {filteredContracts.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            {/* Left side: showing items text */}
            <div className="text-xs text-muted-foreground font-semibold">
              Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredContracts.length)}</span> of{' '}
              <span className="text-foreground">{filteredContracts.length}</span> contracts
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
                Prev
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
                Next
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
              <span>Show</span>
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
                    {size} rows
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
