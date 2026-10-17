import { useState, useMemo, useEffect } from 'react';
import {
  History,
  Search,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  XCircle,
  Loader2,
  SlidersHorizontal,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  Copy,
  Check,
  X,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import type { WalletTransactionResponse, WalletTransactionsSummaryResponse } from '../../../types/models/Financial';
import { WalletBalanceSource } from '../../../types/models/Financial';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import '../../admin/styles/admin-users-screen.css';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { useTranslation } from '../../../hooks/useTranslation';
import { toast } from 'sonner';

interface StatCard {
  key: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  border: string;
  bg: string;
}

export default function WalletHistoryScreen() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [summary, setSummary] = useState<WalletTransactionsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all'); // 'all' | 'credit' | 'debit'
  const [balanceSourceFilter, setBalanceSourceFilter] = useState<string>('all'); // WalletBalanceSource
  const [datePreset, setDatePreset] = useState<string>('all'); // 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom'
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Interaction States
  const [viewTransaction, setViewTransaction] = useState<WalletTransactionResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // CustomSelect Options Arrays
  const typeSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: t('walletHistory.filterAllTypes') },
    { value: '1', label: t('walletHistory.filterTopUp'), badge: 'TopUp' },
    { value: '2', label: t('walletHistory.filterHold'), badge: 'Hold' },
    { value: '3', label: t('walletHistory.filterRelease'), badge: 'Payout' },
    { value: '4', label: t('walletHistory.filterRefund'), badge: 'Refund' },
    { value: '6', label: 'Khóa rút (Withdrawal Lock)', badge: 'Lock' },
    { value: '7', label: 'Rút tiền (Withdrawal)', badge: 'Payout' },
    { value: '8', label: 'Hoàn tiền rút (Withdrawal Refund)', badge: 'Refund' },
    { value: '9', label: 'Phí rút tiền (Withdrawal Fee)', badge: 'Fee' },
    { value: '0', label: t('walletHistory.filterAdmin'), badge: 'Admin' },
    { value: '5', label: t('walletHistory.filterAdjustment'), badge: 'Adjust' },
  ], [t]);

  const statusSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: t('walletHistory.filterAllStatuses') },
    { value: '1', label: t('walletHistory.statusSuccess'), badge: 'Succeeded' },
    { value: '0', label: t('walletHistory.statusPending'), badge: 'Pending' },
    { value: '2', label: t('walletHistory.statusFailed'), badge: 'Failed' },
    { value: '3', label: t('walletHistory.statusCancelled'), badge: 'Cancelled' },
  ], [t]);

  const directionSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'Tất cả dòng tiền (+ / -)' },
    { value: 'credit', label: 'Tiền cộng (+) / Nhận vào', badge: '+' },
    { value: 'debit', label: 'Tiền trừ (-) / Chi ra', badge: '-' },
  ], []);

  const sortSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'newest', label: 'Mới nhất trước' },
    { value: 'oldest', label: 'Cũ nhất trước' },
    { value: 'highest', label: 'Số tiền cao nhất' },
    { value: 'lowest', label: 'Số tiền thấp nhất' },
  ], []);

  const balanceSourceSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'Tất cả nguồn ví' },
    { value: '0', label: 'Ví Nạp tiền (Deposited)' },
    { value: '1', label: 'Ví Có thể rút (Earned)' },
    { value: '2', label: 'Ví Ký quỹ (Escrow Held)' },
    { value: '4', label: 'Ví Đợi rút (Pending Payout)' },
    { value: '5', label: 'Kết hợp ví (Combined)' },
  ], []);

  const datePresetSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'Tất cả thời gian' },
    { value: 'today', label: 'Hôm nay' },
    { value: '7days', label: '7 ngày qua' },
    { value: '30days', label: '30 ngày qua' },
    { value: 'thisMonth', label: 'Tháng này' },
    { value: 'custom', label: 'Tùy chọn mốc ngày...' },
  ], []);

  const pageSizeSelectOptions: SelectOption[] = useMemo(() => [
    { value: '10', label: '10 dòng/trang' },
    { value: '25', label: '25 dòng/trang' },
    { value: '50', label: '50 dòng/trang' },
    { value: '100', label: '100 dòng/trang' },
  ], []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setErrorText(null);
      // 100 is the server's hard cap; the lifetime stat figures come from the summary call.
      const [res, summaryRes] = await Promise.all([
        walletGetAPI.getTransactions(100),
        walletGetAPI.getTransactionsSummary(),
      ]);
      // Clear on failure: stale figures outliving a failed refresh is worse than none.
      setSummary(summaryRes.success && summaryRes.data ? summaryRes.data : null);
      if (res.success && res.data) {
        setTransactions(res.data);

        // Auto-sync pending TopUp transactions (type = 1, status = 0)
        const pendingTopUps = res.data.filter(t => t.type === 1 && t.status === 0 && t.gatewayOrderCode);
        if (pendingTopUps.length > 0) {
          Promise.all(
            pendingTopUps.map(async (t) => {
              try {
                const orderCode = Number(t.gatewayOrderCode);
                if (Number.isSafeInteger(orderCode) && orderCode > 0) {
                  await walletPostAPI.syncPayOsTopUp({ orderCode });
                }
              } catch (e) {
                console.error(`Failed to sync pending top-up order ${t.gatewayOrderCode}:`, e);
              }
            })
          ).then(async () => {
            try {
              const [silentRes, silentSummaryRes] = await Promise.all([
                walletGetAPI.getTransactions(100),
                walletGetAPI.getTransactionsSummary(),
              ]);
              if (silentRes.success && silentRes.data) {
                setTransactions(silentRes.data);
              }
              setSummary(
                silentSummaryRes.success && silentSummaryRes.data ? silentSummaryRes.data : null
              );
            } catch (e) {
              console.error('Failed to silently refresh transactions:', e);
            }
          });
        }
      } else {
        setErrorText(res.message || t('walletHistory.errorLoadHistory'));
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setErrorText(err instanceof Error ? err.message : t('walletHistory.errorServer'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTransactions();
  }, []);

  const handleSyncOrder = async (orderCodeStr: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const orderCode = Number(orderCodeStr);
      if (!Number.isSafeInteger(orderCode) || orderCode <= 0) return;
      setSyncingOrderId(orderCodeStr);
      const res = await walletPostAPI.syncPayOsTopUp({ orderCode });
      if (res.success) {
        toast.success(res.message || 'Đã đồng bộ trạng thái giao dịch PayOS!');
        await fetchTransactions();
      } else {
        toast.error(res.message || 'Đồng bộ không thành công');
      }
    } catch (err) {
      toast.error('Lỗi khi đồng bộ giao dịch PayOS');
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    void navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Đã sao chép mã giao dịch!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDescription = (trans: WalletTransactionResponse) => {
    if (trans.note) return trans.note;
    switch (trans.type) {
      case 0:
        return t('walletHistory.descAdmin');
      case 1:
        return t('walletHistory.descTopUp', { provider: trans.gatewayProvider || 'PayOS' });
      case 2:
        return t('walletHistory.descHold');
      case 3:
        return t('walletHistory.descRelease');
      case 4:
        return t('walletHistory.descRefund');
      case 5:
        return t('walletHistory.descAdjustment');
      case 6:
        return t('walletHistory.descWithdrawalLock');
      case 7:
        return t('walletHistory.descWithdrawalSuccess');
      case 8:
        return t('walletHistory.descWithdrawalRefund');
      case 9:
        return t('walletHistory.descWithdrawalFee');
      default:
        return t('walletHistory.descDefault');
    }
  };

  // The stat cards come only from the summary endpoint. There is deliberately no client-side
  // fallback: totals computed over the 100-row window are not lifetime totals, and the old
  // fallback also disagreed with the server on what counts as a withdrawal.
  const statCards = useMemo((): StatCard[] => {
    if (!summary) return [];

    const topUps: StatCard = {
      key: 'topUps',
      label: t('walletHistory.statTopUps'),
      value: <GigCoinAmount amount={summary.totalTopUps} />,
      icon: <ArrowUpRight size={16} className="sm:w-[18px] sm:h-[18px]" />,
      border: 'border-emerald-500/25',
      bg: 'from-emerald-500/15 via-surface to-surface',
    };

    const transactionsCard: StatCard = {
      key: 'transactions',
      label: t('walletHistory.statTransactions'),
      value: summary.totalTransactions.toString(),
      sub: summary.pendingTransactionCount > 0
        ? t('walletHistory.statPendingSub', { count: summary.pendingTransactionCount })
        : undefined,
      icon: <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" />,
      border: 'border-brand/25',
      bg: 'from-brand/15 via-surface to-surface',
    };

    if (summary.role === 'Client') {
      const { client } = summary;
      return [
        topUps,
        {
          key: 'escrowFunded',
          label: t('walletHistory.statEscrowFunded'),
          value: <GigCoinAmount amount={client.totalEscrowFunded} />,
          icon: <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-rose-500/25',
          bg: 'from-rose-500/15 via-surface to-surface',
        },
        {
          key: 'currentEscrow',
          label: t('walletHistory.statCurrentEscrow'),
          value: <GigCoinAmount amount={client.currentEscrowHeld} />,
          icon: <Loader2 size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-amber-500/25',
          bg: 'from-amber-500/15 via-surface to-surface',
        },
        {
          key: 'paidToFreelancers',
          label: t('walletHistory.statPaidToFreelancers'),
          value: <GigCoinAmount amount={client.totalReleasedToFreelancers} />,
          icon: <ArrowDownRight size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-rose-500/25',
          bg: 'from-rose-500/15 via-surface to-surface',
        },
        {
          key: 'escrowRefunds',
          label: t('walletHistory.statEscrowRefunds'),
          value: <GigCoinAmount amount={client.totalEscrowRefunds} />,
          icon: <RefreshCw size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-cyan-500/25',
          bg: 'from-cyan-500/15 via-surface to-surface',
        },
        transactionsCard,
      ];
    }

    if (summary.role === 'Freelancer') {
      const { freelancer } = summary;
      return [
        topUps,
        {
          key: 'totalEarned',
          label: t('walletHistory.statTotalEarned'),
          value: <GigCoinAmount amount={freelancer.totalEarnedFromEscrow} />,
          icon: <ArrowUpRight size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-emerald-500/25',
          bg: 'from-emerald-500/15 via-surface to-surface',
        },
        {
          key: 'awaitingPayout',
          label: t('walletHistory.statAwaitingPayout'),
          value: <GigCoinAmount amount={freelancer.currentPendingWithdrawal} />,
          icon: <Loader2 size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-amber-500/25',
          bg: 'from-amber-500/15 via-surface to-surface',
        },
        {
          key: 'withdrawnToBank',
          label: t('walletHistory.statWithdrawnToBank'),
          value: <GigCoinAmount amount={freelancer.totalWithdrawnToBank} />,
          icon: <ArrowDownRight size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-rose-500/25',
          bg: 'from-rose-500/15 via-surface to-surface',
        },
        {
          key: 'serviceFees',
          label: t('walletHistory.statServiceFeesPaid'),
          value: <GigCoinAmount amount={freelancer.totalServiceFeesPaid} />,
          icon: <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px]" />,
          border: 'border-cyan-500/25',
          bg: 'from-cyan-500/15 via-surface to-surface',
        },
        transactionsCard,
      ];
    }

    return [topUps, transactionsCard];
  }, [summary, t]);

  // Filtering + Sorting
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(trans => {
        const desc = getDescription(trans);
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          desc.toLowerCase().includes(q) ||
          trans.walletTransactionId.toLowerCase().includes(q) ||
          (trans.contractId && trans.contractId.toLowerCase().includes(q)) ||
          (trans.gatewayOrderCode && trans.gatewayOrderCode.toLowerCase().includes(q)) ||
          (trans.gatewayTransactionCode && trans.gatewayTransactionCode.toLowerCase().includes(q)) ||
          (trans.note && trans.note.toLowerCase().includes(q));

        const matchesType = typeFilter === 'all' || trans.type.toString() === typeFilter;
        const matchesStatus = statusFilter === 'all' || trans.status.toString() === statusFilter;
        const matchesDirection =
          directionFilter === 'all' ||
          (directionFilter === 'credit' && trans.isCredit) ||
          (directionFilter === 'debit' && !trans.isCredit);

        const matchesBalanceSource =
          balanceSourceFilter === 'all' ||
          (trans.balanceSource !== undefined && trans.balanceSource.toString() === balanceSourceFilter);

        // Date Range Filtering
        let matchesDate = true;
        const transDate = new Date(trans.createdAt);
        const now = new Date();

        if (datePreset === 'today') {
          matchesDate = transDate.toDateString() === now.toDateString();
        } else if (datePreset === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transDate >= sevenDaysAgo;
        } else if (datePreset === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = transDate >= thirtyDaysAgo;
        } else if (datePreset === 'thisMonth') {
          matchesDate =
            transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
        } else if (datePreset === 'custom') {
          if (fromDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && transDate >= start;
          }
          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && transDate <= end;
          }
        }

        return matchesSearch && matchesType && matchesStatus && matchesDirection && matchesBalanceSource && matchesDate;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'highest') {
          return b.tokenAmount - a.tokenAmount;
        }
        if (sortBy === 'lowest') {
          return a.tokenAmount - b.tokenAmount;
        }
        // 'newest' (default)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    transactions,
    searchQuery,
    typeFilter,
    statusFilter,
    directionFilter,
    balanceSourceFilter,
    datePreset,
    fromDate,
    toDate,
    sortBy,
  ]);

  // Reset page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    typeFilter,
    statusFilter,
    directionFilter,
    balanceSourceFilter,
    datePreset,
    fromDate,
    toDate,
    sortBy,
    pageSize,
  ]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (directionFilter !== 'all') count++;
    if (balanceSourceFilter !== 'all') count++;
    if (datePreset !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [searchQuery, typeFilter, statusFilter, directionFilter, balanceSourceFilter, datePreset, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setDirectionFilter('all');
    setBalanceSourceFilter('all');
    setDatePreset('all');
    setFromDate('');
    setToDate('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(filteredTransactions.length, startIndex + pageSize);
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, startIndex, endIndex]);

  const fmtNumber = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getStatusBadge = (status: number, orderCode?: string | null) => {
    switch (status) {
      case 0:
        return (
          <div className="flex items-center gap-1.5 inline-flex">
            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5 shadow-xs">
              <Loader2 size={12} className="animate-spin" />
              {t('walletHistory.statusPending')}
            </span>
            {orderCode && (
              <button
                onClick={(e) => void handleSyncOrder(orderCode, e)}
                title="Đồng bộ lại PayOS"
                disabled={syncingOrderId === orderCode}
                className="p-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-500 transition-all shadow-xs"
              >
                <RefreshCw size={12} className={syncingOrderId === orderCode ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        );
      case 1:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('walletHistory.statusSuccess')}
          </span>
        );
      case 2:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 inline-flex items-center gap-1 shadow-xs">
            <XCircle size={12} />
            {t('walletHistory.statusFailed')}
          </span>
        );
      case 3:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 inline-flex items-center gap-1">
            {t('walletHistory.statusCancelled')}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {t('walletHistory.statusUnknown')}
          </span>
        );
    }
  };

  const getTypeBadge = (type: number) => {
    switch (type) {
      case 0:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-500/15 text-slate-300 border border-slate-500/20">{t('walletHistory.typeAdmin')}</span>;
      case 1:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">{t('walletHistory.typeTopUp')}</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">{t('walletHistory.typeHold')}</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/25">{t('walletHistory.typeRelease')}</span>;
      case 4:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/15 text-cyan border border-cyan-500/25">{t('walletHistory.typeRefund')}</span>;
      case 5:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-500/15 text-slate-300 border border-slate-500/20">{t('walletHistory.typeAdjustment')}</span>;
      case 6:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">{t('walletHistory.typeWithdrawalLock')}</span>;
      case 7:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/25">{t('walletHistory.typeWithdrawalSuccess')}</span>;
      case 8:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">{t('walletHistory.typeWithdrawalRefund')}</span>;
      case 9:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/25">{t('walletHistory.typeWithdrawalFee')}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-500/15 text-slate-300 border border-slate-500/20">{t('walletHistory.typeOther')}</span>;
    }
  };

  const getBalanceSourceBadge = (source?: WalletBalanceSource | number) => {
    if (source === undefined || source === null) return null;
    switch (source) {
      case 0:
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-xs">Ví Nạp tiền</span>;
      case 1:
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">Ví Có thể rút</span>;
      case 2:
      case 3:
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-xs">Ví Ký quỹ</span>;
      case 4:
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-xs">Ví Đợi rút</span>;
      case 5:
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xs">Kết hợp ví</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-muted text-text-muted border border-border">Ví chính</span>;
    }
  };

  const getTypeIcon = (trans: WalletTransactionResponse) => {
    if (trans.type === 0 || trans.type === 5) {
      return <RefreshCw size={16} className="text-text-muted" />;
    }
    return trans.isCredit
      ? <ArrowUpRight size={18} className="text-emerald-400" />
      : <ArrowDownRight size={18} className="text-rose-400" />;
  };

  const getAmountDisplay = (trans: WalletTransactionResponse) => {
    const prefix = trans.isCredit ? '+' : '-';
    const colorClass = trans.isCredit ? 'text-emerald-500' : 'text-rose-500';
    const bgClass = trans.isCredit ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20';

    return (
      <div className="text-right shrink-0">
        <div className={`px-3 py-1 rounded-xl border ${bgClass} inline-flex items-center justify-end gap-1 ${colorClass} font-black text-sm sm:text-base shadow-xs`}>
          <GigCoinAmount amount={trans.tokenAmount} prefix={prefix} />
        </div>
        {[1, 6, 7, 8, 9].includes(trans.type) && trans.vndAmount > 0 && (
          <p className="text-[11px] text-text-muted font-bold mt-1">
            {fmtNumber(trans.vndAmount)} đ
          </p>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden bg-background min-h-screen">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8 min-w-0">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 bg-gradient-to-r from-brand/10 via-brand-soft/20 to-transparent p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-brand/20 shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-brand/20 text-brand shadow-xs">
                  <History size={18} className="sm:w-5 sm:h-5" />
                </span>
                <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-brand/15 text-brand border border-brand/30">
                  {t('walletHistory.badgeLabel')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-text-primary tracking-tight">{t('walletHistory.title')}</h1>
              <p className="text-xs sm:text-sm font-semibold text-text-secondary mt-1">{t('walletHistory.subtitle')}</p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 flex items-center justify-center gap-1.5 transition-all shadow-xs min-h-[40px]"
                >
                  <RotateCcw size={14} />
                  <span>Xóa bộ lọc ({activeFiltersCount})</span>
                </button>
              )}
              <button
                onClick={() => void fetchTransactions()}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-xs sm:text-sm hover:bg-brand/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-brand/20 min-h-[40px]"
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                <span>{t('walletHistory.refresh')}</span>
              </button>
            </div>
          </div>

          {/* Metric Stats Cards - the set shown depends on the account's role */}
          {statCards.length > 0 ? (
            <div
              className={`grid ${
                statCards.length === 2
                  ? 'grid-cols-2'
                  : statCards.length <= 4
                  ? 'grid-cols-2 lg:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
              } gap-2.5 sm:gap-4 mb-6 sm:mb-8`}
            >
              {statCards.map(stat => (
                <div key={stat.key} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.bg} border ${stat.border} shadow-sm transition-all hover:scale-[1.02] min-w-0`}>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-1">
                    <p className="text-[11px] sm:text-xs font-bold text-text-secondary truncate">{stat.label}</p>
                    <span className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-surface/80 shadow-xs text-text-primary shrink-0">
                      {stat.icon}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg font-black text-text-primary truncate">{stat.value}</p>
                  {stat.sub && (
                    <p className="text-[10px] sm:text-[11px] font-semibold text-text-muted truncate mt-0.5">{stat.sub}</p>
                  )}
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="flex items-center justify-between gap-3 rounded-xl sm:rounded-2xl border border-border bg-surface/80 p-3 sm:p-4 mb-6 sm:mb-8">
              <p className="text-xs sm:text-sm font-semibold text-text-secondary">
                {t('walletHistory.statsUnavailable')}
              </p>
              <button
                onClick={() => void fetchTransactions()}
                className="shrink-0 px-3 py-1.5 rounded-full border border-border text-xs font-bold text-text-primary hover:bg-surface"
              >
                {t('walletHistory.refresh')}
              </button>
            </div>
          )}

          {/* Advanced Multi-filter Toolbar with CustomSelect */}
          <div className="relative z-30 rounded-2xl border border-border bg-surface/90 backdrop-blur-xl p-3.5 sm:p-5 shadow-xl space-y-3.5 sm:space-y-4 mb-6">
            
            {/* Primary Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Keyword Search Input */}
              <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã GD, hợp đồng, PayOS..."
                  className="w-full h-[46px] sm:h-[50px] rounded-xl bg-surface-muted border border-border px-4 pl-10 pr-8 text-xs sm:text-sm font-bold text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* CustomSelect 1: Type Filter */}
              <CustomSelect
                value={typeFilter}
                options={typeSelectOptions}
                onChange={setTypeFilter}
                placeholder={t('walletHistory.filterAllTypes')}
                searchable={false}
                ariaLabel="Lọc theo phân loại giao dịch"
              />

              {/* CustomSelect 2: Status Filter */}
              <CustomSelect
                value={statusFilter}
                options={statusSelectOptions}
                onChange={setStatusFilter}
                placeholder={t('walletHistory.filterAllStatuses')}
                searchable={false}
                ariaLabel="Lọc theo trạng thái giao dịch"
              />

              {/* CustomSelect 3: Flow Direction Filter */}
              <CustomSelect
                value={directionFilter}
                options={directionSelectOptions}
                onChange={setDirectionFilter}
                placeholder="Tất cả dòng tiền (+ / -)"
                searchable={false}
                ariaLabel="Lọc theo dòng tiền cộng trừ"
              />
            </div>

            {/* Expandable Options Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-xs font-extrabold text-brand hover:underline flex items-center gap-1.5 py-1"
              >
                <SlidersHorizontal size={14} />
                <span>{showAdvancedFilters ? 'Thu gọn bộ lọc nâng cao' : 'Bộ lọc nâng cao & Mốc thời gian'}</span>
                <ChevronRight size={14} className={`transition-transform duration-200 ${showAdvancedFilters ? '-rotate-90' : 'rotate-90'}`} />
              </button>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-xs font-bold text-text-muted">Sắp xếp:</span>
                <CustomSelect
                  value={sortBy}
                  options={sortSelectOptions}
                  onChange={setSortBy}
                  searchable={false}
                  className="w-48 sm:w-44 cs-compact"
                  ariaLabel="Sắp xếp danh sách giao dịch"
                />
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
                {/* CustomSelect 4: Balance Source Pool Filter */}
                <div>
                  <label className="block text-[11px] font-extrabold text-text-muted mb-1.5 uppercase tracking-wider">Nguồn ví giao dịch</label>
                  <CustomSelect
                    value={balanceSourceFilter}
                    options={balanceSourceSelectOptions}
                    onChange={setBalanceSourceFilter}
                    searchable={false}
                    ariaLabel="Lọc theo nguồn ví"
                  />
                </div>

                {/* CustomSelect 5: Date Preset Filter */}
                <div>
                  <label className="block text-[11px] font-extrabold text-text-muted mb-1.5 uppercase tracking-wider">Khoảng thời gian</label>
                  <CustomSelect
                    value={datePreset}
                    options={datePresetSelectOptions}
                    onChange={setDatePreset}
                    searchable={false}
                    ariaLabel="Lọc theo mốc thời gian"
                  />
                </div>

                {/* Custom Date Picker Inputs */}
                {datePreset === 'custom' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted mb-1">Từ ngày</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="w-full h-[46px] sm:h-[50px] rounded-xl bg-surface-muted border border-border px-3 text-xs font-bold text-text-primary outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted mb-1">Đến ngày</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="w-full h-[46px] sm:h-[50px] rounded-xl bg-surface-muted border border-border px-3 text-xs font-bold text-text-primary outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end pb-2">
                    <p className="text-xs font-semibold text-text-muted italic">Đang lọc nhanh theo mốc thời gian đã chọn</p>
                  </div>
                )}
              </div>
            )}

            {/* Active Filter Badges Bar */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-3 border-t border-border text-xs">
                <span className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Đang lọc:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand/10 text-brand border border-brand/20 font-bold text-xs">
                    Từ khóa: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-xs">
                    Loại: {typeFilter}
                    <button onClick={() => setTypeFilter('all')} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-xs">
                    Trạng thái: {statusFilter === '1' ? 'Thành công' : statusFilter === '0' ? 'Đang xử lý' : statusFilter === '2' ? 'Thất bại' : 'Đã hủy'}
                    <button onClick={() => setStatusFilter('all')} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
                {directionFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-xs">
                    Dòng tiền: {directionFilter === 'credit' ? 'Tiền cộng (+)' : 'Tiền trừ (-)'}
                    <button onClick={() => setDirectionFilter('all')} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
                {balanceSourceFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-xs">
                    Nguồn ví: {balanceSourceFilter}
                    <button onClick={() => setBalanceSourceFilter('all')} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
                {datePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan border border-cyan-500/20 font-bold text-xs">
                    Thời gian: {datePreset}
                    <button onClick={() => { setDatePreset('all'); setFromDate(''); setToDate(''); }} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Interactive Table Container */}
          {loading ? (
            <div className="rounded-2xl border border-border bg-surface/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xl">
              <Loader2 size={36} className="text-brand animate-spin mb-3" />
              <p className="text-text-secondary text-xs sm:text-sm font-bold">{t('walletHistory.loadingText')}</p>
            </div>
          ) : errorText ? (
            <div className="rounded-2xl p-6 sm:p-8 border border-rose-500/25 bg-rose-500/5 text-center shadow-xl">
              <p className="text-rose-500 font-bold mb-3 text-xs sm:text-sm">{errorText}</p>
              <button onClick={() => void fetchTransactions()} className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-md">
                {t('walletHistory.retry')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface/90 shadow-xl overflow-hidden backdrop-blur-xl">
                {/* 1. Mobile Card List (< md: 768px) */}
                <div className="block md:hidden divide-y divide-border/50">
                  {paginatedTransactions.map(trans => (
                    <div
                      key={trans.walletTransactionId}
                      onClick={() => setViewTransaction(trans)}
                      className="p-3.5 sm:p-4 hover:bg-brand-soft/10 transition-colors cursor-pointer space-y-2.5"
                    >
                      {/* Top Row: Icon + Type Badge + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-surface-muted border border-border flex items-center justify-center shrink-0 shadow-2xs">
                            {getTypeIcon(trans)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-text-primary text-xs truncate block">
                              {getDescription(trans)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {getStatusBadge(trans.status, trans.gatewayOrderCode)}
                        </div>
                      </div>

                      {/* Center Row: Amount & Badges */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getTypeBadge(trans.type)}
                          {getBalanceSourceBadge(trans.balanceSource)}
                        </div>
                        <div className="text-right shrink-0">
                          {getAmountDisplay(trans)}
                        </div>
                      </div>

                      {/* Bottom Row: Date & Actions */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted pt-1.5 border-t border-border/40">
                        <span>{formatDate(trans.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(trans.walletTransactionId, e)}
                            className="p-1 hover:text-brand text-text-muted flex items-center gap-1 text-[10px] font-mono"
                            title="Sao chép ID"
                          >
                            <span>ID: {trans.walletTransactionId.substring(0, 8)}...</span>
                            {copiedId === trans.walletTransactionId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                          <span className="text-brand font-bold flex items-center gap-0.5 text-xs">
                            {t('walletHistory.detailBtn')} <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table (>= md: 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/90 text-[11px] text-text-muted uppercase font-black tracking-wider">
                        <th className="py-4 px-5">Giao Dịch / Loại</th>
                        <th className="py-4 px-5">Nguồn Ví</th>
                        <th className="py-4 px-5">Thời Gian</th>
                        <th className="py-4 px-5">Trạng Thái</th>
                        <th className="py-4 px-5 text-right">Số Tiền (GigCoin)</th>
                        <th className="py-4 px-5 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-sm">
                      {paginatedTransactions.map(trans => (
                        <tr
                          key={trans.walletTransactionId}
                          onClick={() => setViewTransaction(trans)}
                          className="hover:bg-brand-soft/15 transition-all cursor-pointer group"
                        >
                          {/* Transaction Type & Description */}
                          <td className="py-4 px-5">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-surface-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-brand/40 transition-colors shadow-xs">
                                {getTypeIcon(trans)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-extrabold text-text-primary text-sm group-hover:text-brand transition-colors">
                                    {getDescription(trans)}
                                  </span>
                                  {getTypeBadge(trans.type)}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-text-muted font-medium">
                                  <span className="font-mono">ID: {trans.walletTransactionId.substring(0, 13)}...</span>
                                  <button
                                    onClick={(e) => handleCopyId(trans.walletTransactionId, e)}
                                    className="p-1 hover:text-brand text-text-muted"
                                    title="Sao chép Mã Giao Dịch"
                                  >
                                    {copiedId === trans.walletTransactionId ? (
                                      <Check size={13} className="text-emerald-500" />
                                    ) : (
                                      <Copy size={13} />
                                    )}
                                  </button>
                                  {trans.contractId && (
                                    <span className="truncate max-w-[120px] text-brand font-bold">
                                      HD: {trans.contractId.substring(0, 8)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Balance Source Pool */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {getBalanceSourceBadge(trans.balanceSource)}
                          </td>

                          {/* Date & Time */}
                          <td className="py-4 px-5 whitespace-nowrap text-xs">
                            <p className="text-text-primary font-bold">{formatDate(trans.createdAt)}</p>
                            {trans.completedAt && (
                              <p className="text-[10px] text-text-muted font-medium mt-0.5">Xử lý: {formatDate(trans.completedAt)}</p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {getStatusBadge(trans.status, trans.gatewayOrderCode)}
                          </td>

                          {/* Amount */}
                          <td className="py-4 px-5 whitespace-nowrap text-right">
                            {getAmountDisplay(trans)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setViewTransaction(trans)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-brand bg-brand/10 hover:bg-brand hover:text-white transition-all shadow-xs inline-flex items-center gap-1.5"
                            >
                              <Eye size={14} />
                              {t('walletHistory.detailBtn')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {filteredTransactions.length === 0 && (
                  <div className="p-8 sm:p-12 text-center">
                    <History size={44} className="mx-auto mb-3 text-text-muted opacity-50" />
                    <p className="text-base sm:text-lg font-black text-text-primary mb-1.5">{t('walletHistory.noTransactions')}</p>
                    <p className="text-xs sm:text-sm font-semibold text-text-secondary mb-4">{t('walletHistory.noTransactionsDesc')}</p>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-brand/20 min-h-[38px]"
                      >
                        <RotateCcw size={14} />
                        <span>Xóa tất cả bộ lọc</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Complete Pagination Controls with CustomSelect */}
              {filteredTransactions.length > 0 && (
                <div className="relative z-20 rounded-2xl border border-border bg-surface/90 px-3.5 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-xl">
                  {/* Left: Summary Info & CustomSelect Page Size */}
                  <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 text-xs font-bold text-text-secondary flex-wrap">
                    <span className="text-[11px] sm:text-xs">
                      Hiển thị <strong className="text-text-primary">{startIndex + 1}</strong>–<strong className="text-text-primary">{endIndex}</strong> / <strong className="text-brand">{filteredTransactions.length}</strong> GD
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-muted font-semibold text-[11px]">Xem:</span>
                      <CustomSelect
                        value={String(pageSize)}
                        options={pageSizeSelectOptions}
                        onChange={val => setPageSize(Number(val))}
                        searchable={false}
                        className="w-32 sm:w-36 cs-compact"
                        ariaLabel="Chọn số hàng trên mỗi trang"
                      />
                    </div>
                  </div>

                  {/* Right: Page Navigation Buttons */}
                  <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Trang đầu"
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Trang trước"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* Page Number Buttons */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          return (
                            <span key={page} className="flex items-center">
                              {showEllipsis && <span className="px-1 text-text-muted font-bold">...</span>}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black transition-all text-xs flex items-center justify-center ${
                                  currentPage === page
                                    ? 'bg-brand text-white shadow-md shadow-brand/30 ring-2 ring-brand/50 scale-105'
                                    : 'hover:bg-surface-muted text-text-secondary border border-border'
                                }`}
                              >
                                {page}
                              </button>
                            </span>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Trang sau"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Trang cuối"
                    >
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal (Clean Modern Digital Receipt Layout) */}
      {viewTransaction && (
        <div
          role="presentation"
          className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          onClick={() => setViewTransaction(null)}
        >
          {/* Decorative ambient background */}
          <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-emerald-500/20" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tx-detail-title"
            onClick={e => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-border/80 bg-background text-text-primary backdrop-blur-2xl my-0 sm:my-auto animate-in fade-in zoom-in-95 duration-200"
          >
            {/* 1. Modal Header */}
            <header className="flex items-center justify-between border-b border-border/70 px-4 sm:px-6 py-3.5 shrink-0 bg-surface/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div className="min-w-0">
                  <h2 id="tx-detail-title" className="text-xs sm:text-sm font-black text-text-primary truncate">
                    {t('walletHistory.detailTitle', 'Chi tiết Giao Dịch')}
                  </h2>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground block truncate">
                    #{viewTransaction.walletTransactionId.substring(0, 12)}...
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewTransaction(null)}
                aria-label={t('common.close', 'Đóng')}
                className="p-1.5 rounded-xl border border-border hover:bg-muted text-muted-foreground transition hover:text-foreground cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
              >
                <X size={17} />
              </button>
            </header>

            {/* 2. Scrollable Body */}
            <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4 flex-1 min-h-0">
              {/* Hero Centerpiece: Icon + Amount + Status Badges */}
              <div className="text-center py-2 bg-gradient-to-b from-brand/5 to-transparent rounded-2xl p-4 border border-brand/10">
                <div className="w-14 h-14 rounded-2xl bg-surface border-2 border-brand/30 shadow-md flex items-center justify-center mx-auto mb-3 text-brand">
                  {getTypeIcon(viewTransaction)}
                </div>

                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  Giá trị giao dịch
                </p>

                <div className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary flex items-center justify-center gap-1.5">
                  <GigCoinAmount
                    amount={viewTransaction.tokenAmount}
                    prefix={viewTransaction.isCredit ? '+' : '-'}
                  />
                </div>

                {viewTransaction.vndAmount > 0 && (
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    ≈ {fmtNumber(viewTransaction.vndAmount)} VNĐ
                  </p>
                )}

                {/* Badges strip */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3">
                  {getTypeBadge(viewTransaction.type)}
                  {getStatusBadge(viewTransaction.status, viewTransaction.gatewayOrderCode)}
                  {getBalanceSourceBadge(viewTransaction.balanceSource)}
                </div>

                {/* Description */}
                <p className="text-xs font-medium text-text-secondary mt-3 max-w-sm mx-auto leading-relaxed bg-background/60 p-2.5 rounded-xl border border-border/50">
                  {getDescription(viewTransaction)}
                </p>
              </div>

              {/* Structured Key-Value Receipt Details */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 divide-y divide-border/50 text-xs overflow-hidden">
                {/* Thời gian khởi tạo */}
                <div className="flex items-center justify-between p-3 gap-2">
                  <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Thời gian tạo</span>
                  <span className="font-bold text-text-primary text-right">{formatDate(viewTransaction.createdAt)}</span>
                </div>

                {/* Thời gian hoàn tất */}
                {viewTransaction.completedAt && (
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Hoàn tất xử lý</span>
                    <span className="font-bold text-emerald-500 text-right">{formatDate(viewTransaction.completedAt)}</span>
                  </div>
                )}

                {/* Mã Giao Dịch */}
                <div className="flex items-center justify-between p-3 gap-2">
                  <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Mã Giao Dịch</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-text-primary min-w-0">
                    <span className="truncate break-all">{viewTransaction.walletTransactionId}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(viewTransaction.walletTransactionId, e)}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-brand transition shrink-0"
                      title="Sao chép ID"
                    >
                      {copiedId === viewTransaction.walletTransactionId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Mã Ví Giao Dịch */}
                <div className="flex items-center justify-between p-3 gap-2">
                  <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Mã Ví</span>
                  <span className="font-mono text-[11px] font-bold text-text-primary truncate break-all">{viewTransaction.walletId}</span>
                </div>

                {/* Hợp Đồng Liên Quan */}
                {viewTransaction.contractId && (
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-brand font-semibold text-[11px] shrink-0">Hợp đồng</span>
                    <span className="font-mono text-[11px] font-bold text-brand truncate break-all">{viewTransaction.contractId}</span>
                  </div>
                )}

                {/* Mã Ký Quỹ Escrow */}
                {viewTransaction.contractEscrowId && (
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] shrink-0">Ký quỹ Escrow</span>
                    <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate break-all">{viewTransaction.contractEscrowId}</span>
                  </div>
                )}

                {/* Mã Đơn PayOS */}
                {viewTransaction.gatewayOrderCode && (
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Mã đơn PayOS</span>
                    <span className="font-mono text-[11px] font-bold text-text-primary truncate break-all">{viewTransaction.gatewayOrderCode}</span>
                  </div>
                )}

                {/* Mã Tham Chiếu Ngân Hàng */}
                {viewTransaction.gatewayTransactionCode && (
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Tham chiếu NH</span>
                    <span className="font-mono text-[11px] font-bold text-text-primary truncate break-all">{viewTransaction.gatewayTransactionCode}</span>
                  </div>
                )}

                {/* Idempotency Key */}
                {viewTransaction.idempotencyKey && (
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Khóa bảo mật</span>
                    <span className="font-mono text-[10px] font-bold text-text-primary truncate break-all">{viewTransaction.idempotencyKey}</span>
                  </div>
                )}

                {/* Ghi chú */}
                {viewTransaction.note && (
                  <div className="p-3 space-y-1">
                    <span className="text-muted-foreground font-semibold text-[11px] block">Ghi chú bổ sung</span>
                    <p className="text-xs font-semibold text-text-primary leading-relaxed bg-background p-2 rounded-lg border border-border/50">{viewTransaction.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Sticky Action Footer */}
            <footer className="border-t border-border/70 bg-surface/90 px-4 sm:px-6 py-3 shrink-0 flex items-center gap-2.5 backdrop-blur-md">
              <button
                type="button"
                onClick={(e) => handleCopyId(viewTransaction.walletTransactionId, e)}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-brand bg-brand/10 hover:bg-brand/20 border border-brand/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 min-h-[40px]"
              >
                {copiedId === viewTransaction.walletTransactionId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedId === viewTransaction.walletTransactionId ? 'Đã sao chép' : 'Sao chép ID'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTransaction(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-brand hover:bg-brand/90 shadow-md shadow-brand/20 transition-all cursor-pointer flex-1 text-center min-h-[40px]"
              >
                {t('walletHistory.closeBtn', 'Đóng lại')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
