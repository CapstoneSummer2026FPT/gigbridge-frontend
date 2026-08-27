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

let cachedManageContracts: ContractWithMilestones[] | null = null;
let lastManageContractsFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export function useManageContracts() {
  const navigate = useNavigate();
  const { t } = useTranslation(['contracts', 'common']);
  const [contracts, setContracts] = useState<ContractWithMilestones[]>(() => cachedManageContracts || []);
  const [loading, setLoading] = useState(() => !cachedManageContracts);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'All'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadContracts = useCallback(async (isSilent = Boolean(cachedManageContracts)) => {
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
        if (!cachedManageContracts) setContracts([]);
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

      cachedManageContracts = contractsWithMilestones;
      lastManageContractsFetchTime = Date.now();
      setContracts(contractsWithMilestones);
    } catch {
      if (!cachedManageContracts) {
        setError(t('contracts.alerts.errorOccurred'));
        setContracts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isFresh = cachedManageContracts && (Date.now() - lastManageContractsFetchTime < CACHE_TTL_MS);
    if (!isFresh || !cachedManageContracts) {
      void loadContracts(Boolean(cachedManageContracts));
    }
  }, [loadContracts]);

  // Reset pagination when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus]);

  const toggleExpand = (contractId: string) => {
    setExpandedContractId(prev => (prev === contractId ? null : contractId));
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
        contract.contractsId?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Filter by Status
      if (selectedStatus !== 'All' && Number(contract.status) !== Number(selectedStatus)) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [contracts, searchQuery, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / itemsPerPage));

  const pagedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    const activeCount = contracts.filter(c => Number(c.status) === ContractStatus.Active).length;
    const pendingCount = contracts.filter(c => Number(c.status) === ContractStatus.PendingSignature).length;
    const completedCount = contracts.filter(c => Number(c.status) === ContractStatus.Completed).length;
    const totalCommittedValue = contracts.reduce((sum, c) => sum + (Number(c.totalBudget) || 0), 0);

    return {
      activeCount,
      pendingCount,
      completedCount,
      totalCommittedValue,
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
    showFilters,
    setShowFilters,
    expandedContractId,
    toggleExpand,
    resetFilters,
    stats,
    loadContracts,
  };
}
