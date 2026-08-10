import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ContractDto, ContractQueryParams, Milestone } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
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

export function useFreelancerContracts() {
  const navigate = useNavigate();
  const { t } = useTranslation(['contracts', 'common']);
  const [contracts, setContracts] = useState<ContractWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'completed'>('active');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [expandedContractIds, setExpandedContractIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadContracts = useCallback(async () => {
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

      setContracts(contractsWithMilestones);
    } catch {
      setError(t('contracts.alerts.errorOccurred'));
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  // Reset pagination when search, tab, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, sortBy]);

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

      // Filter by Tab
      const status = Number(contract.status);
      if (activeTab === 'active') {
        return status === 7; // Active
      }
      if (activeTab === 'pending') {
        return status === 0 || status === 6; // Draft or PendingSignature
      }
      if (activeTab === 'completed') {
        return status === 8; // Completed
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'value') {
        return (Number(b.totalBudget) || 0) - (Number(a.totalBudget) || 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [contracts, searchQuery, activeTab, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / itemsPerPage));

  const pagedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    const activeCount = contracts.filter(c => Number(c.status) === 7).length;
    const completedCount = contracts.filter(c => Number(c.status) === 8).length;
    const pendingCount = contracts.filter(c => Number(c.status) === 0 || Number(c.status) === 6).length;
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
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    expandedContractIds,
    toggleExpand,
    stats,
    loadContracts,
  };
}
