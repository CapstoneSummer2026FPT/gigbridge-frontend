import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ContractDto, ContractQueryParams, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import { calculateMilestoneCompletion } from '../../../shared/utils/contractUtils';

export interface MilestoneDisplay extends Milestone {
  percentageComplete: number;
  isOverdue: boolean;
}

export interface ContractWithMilestones extends ContractDto {
  milestones?: MilestoneDisplay[];
  clientName?: string;
}

export const mapMilestoneForDisplay = (milestone: Milestone): MilestoneDisplay => {
  const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
  const isCompleted =
    milestone.status === MilestoneStatus.Approved || milestone.status === MilestoneStatus.Completed;

  return {
    ...milestone,
    percentageComplete: calculateMilestoneCompletion(milestone.status),
    isOverdue: Boolean(dueDate && !isCompleted && dueDate < new Date()),
  };
};

let cachedFreelancerContracts: ContractWithMilestones[] | null = null;
let lastFreelancerContractsFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export function useFreelancerContracts() {
  const navigate = useNavigate();
  const { t } = useTranslation(['contracts', 'common']);
  const [contracts, setContracts] = useState<ContractWithMilestones[]>(() => cachedFreelancerContracts || []);
  const [loading, setLoading] = useState(() => !cachedFreelancerContracts);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [expandedContractIds, setExpandedContractIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadContracts = useCallback(async (isSilent = Boolean(cachedFreelancerContracts)) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);

      const params: ContractQueryParams = {
        pageIndex: 0,
        pageSize: 50,
      };

      const response = await contractGetAPI.getMyContracts(params);

      if (!response.success) {
        if (!cachedFreelancerContracts) setContracts([]);
        setError(response.message || t('contracts.unableToLoadContract'));
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

      cachedFreelancerContracts = contractsWithMilestones;
      lastFreelancerContractsFetchTime = Date.now();
      setContracts(contractsWithMilestones);
    } catch {
      if (!cachedFreelancerContracts) {
        setError(t('contracts.alerts.errorOccurred'));
        setContracts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isFresh = cachedFreelancerContracts && (Date.now() - lastFreelancerContractsFetchTime < CACHE_TTL_MS);
    if (!isFresh || !cachedFreelancerContracts) {
      void loadContracts(Boolean(cachedFreelancerContracts));
    }
  }, [loadContracts]);

  // Reset pagination when search, status, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, sortBy]);

  const toggleExpand = (contractId: string) => {
    setExpandedContractIds(prev => {
      const next = new Set(prev);
      if (next.has(contractId)) {
        next.delete(contractId);
      } else {
        next.add(contractId);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('All');
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      // Filter by Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        contract.title?.toLowerCase().includes(query) ||
        contract.contractsId?.toLowerCase().includes(query) ||
        contract.clientName?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Filter by Status
      if (selectedStatus !== 'All' && Number(contract.status) !== Number(selectedStatus)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'value') {
        return (Number(b.totalBudget) || 0) - (Number(a.totalBudget) || 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [contracts, searchQuery, selectedStatus, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / itemsPerPage));

  const pagedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    const activeCount = contracts.filter(c => Number(c.status) === ContractStatus.Active).length;
    const completedCount = contracts.filter(c => Number(c.status) === ContractStatus.Completed).length;
    const pendingCount = contracts.filter(c => Number(c.status) === ContractStatus.PendingSignature).length;
    const totalValue = contracts.reduce((sum, c) => sum + (Number(c.totalBudget) || 0), 0);

    return {
      activeCount,
      completedCount,
      pendingCount,
      totalValue,
      totalCount: contracts.length,
    };
  }, [contracts]);

  return {
    t,
    navigate,
    contracts,
    filteredContracts,
    pagedContracts,
    totalPages,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedStatus,
    setSelectedStatus,
    sortBy,
    setSortBy,
    expandedContractIds,
    toggleExpand,
    resetFilters,
    stats,
    loadContracts,
  };
}
