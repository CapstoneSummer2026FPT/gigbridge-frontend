import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Download,
  Landmark,
  LineChart,
  Loader2,
  Lock,
  PlusCircle,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import type {
  FinancialOverviewPeriod,
  FinancialOverviewResponse,
  FinancialTransactionCategory,
  WalletResponse,
} from '../../../types/models/Financial';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { formatGigCoin, formatGigCoinNumber, formatVndNumber } from '../../../shared/utils/gigcoin';
import '../styles/financial-overview-screen.css';

const PERIODS: FinancialOverviewPeriod[] = ['day', 'month', 'year'];

/* Chart color palette (mirrors brand tokens, literal values for Recharts fills). */
const C_BRAND = '#494be7';
const C_PURPLE = '#7c3aed';
const C_AMBER = '#d97706';

/* DOM-oriented pool colors (CSS vars so they adapt to light/dark theme). */
const POOL_COLORS: Record<'withdrawable' | 'deposited' | 'held' | 'pending', string> = {
  withdrawable: 'var(--success)',
  deposited: 'var(--brand)',
  held: 'var(--warning)',
  pending: 'var(--info)',
};

const POOL_ORDER: Array<'withdrawable' | 'deposited' | 'held' | 'pending'> = [
  'withdrawable',
  'deposited',
  'held',
  'pending',
];

/* ── Small utilities ─────────────────────────────────────────────────────── */

const formatAxisAmount = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const vndLabel = (gigcoin: number) => `≈ ${formatVndNumber(gigcoin * 1000)} VNĐ`;

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue((target - 0) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  suffix?: string;
  className?: string;
  ariaLabel?: string;
}

function AnimatedNumber({ value, format = formatGigCoinNumber, suffix = '', className = '', ariaLabel }: AnimatedNumberProps) {
  const animated = useCountUp(Number.isFinite(value) ? value : 0);
  const display = format(animated);
  return (
    <span className={`fno-animated-number ${className}`.trim()} aria-label={ariaLabel}>
      {display}
      {suffix}
    </span>
  );
}

interface RadialGlowRingProps {
  pct: number;
  size?: number;
  stroke?: number;
}

/** Glowing Cyber Radial Progress Ring for Cell 03. */
function RadialGlowRing({ pct, size = 48, stroke = 5 }: RadialGlowRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.min(100, Math.max(0, pct));
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="fno-micro-ring-wrapper" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="fno-ring"
        role="img"
        aria-label={`${Math.round(safe)}%`}
      >
        <defs>
          <linearGradient id="fnoRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#494be7" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} className="fno-ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fno-ring-fill"
          stroke="url(#fnoRingGrad)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="fno-micro-ring-label">{Math.round(safe)}%</span>
    </div>
  );
}

interface RadialHalfGaugeProps {
  pct: number;
  isClient: boolean;
  caption?: string;
}

/** High-tech 180° Half-Gauge / Arc Speedometer for Contract Progress */
function RadialHalfGauge({ pct, isClient, caption }: RadialHalfGaugeProps) {
  const safe = Math.min(100, Math.max(0, pct));
  const cx = 110;
  const cy = 94;
  const r = 78;
  const strokeWidth = 13;
  const arcLength = Math.PI * r; // ~245.04
  const strokeOffset = arcLength - (safe / 100) * arcLength;

  // Calculate pointer bead position
  const angleRad = Math.PI - (safe / 100) * Math.PI;
  const beadX = cx + r * Math.cos(angleRad);
  const beadY = cy - r * Math.sin(angleRad);

  return (
    <div className="fno-gauge-wrap">
      <svg viewBox="0 0 220 120" className="fno-gauge-svg">
        <defs>
          <linearGradient id="fnoGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#494be7" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="fnoBeadGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer subtle glow arc background */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          opacity={0.4}
        />

        {/* Track */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none"
          stroke="var(--surface-hover)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="fno-gauge-track"
        />

        {/* Active Animated Fill */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none"
          stroke="url(#fnoGaugeGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={strokeOffset}
          className="fno-gauge-fill"
        />

        {/* Glowing Head Bead */}
        {safe > 0 && (
          <circle
            cx={beadX}
            cy={beadY}
            r={6.5}
            fill="#ffffff"
            stroke="#494be7"
            strokeWidth={3}
            filter="url(#fnoBeadGlow)"
            className="fno-gauge-bead"
          />
        )}
      </svg>

      {/* Center Percentage & Label */}
      <div className="fno-gauge-center">
        <AnimatedNumber value={safe} className="fno-gauge-bigpct" suffix="%" />
        {caption && <span className="fno-gauge-caption">{caption}</span>}
      </div>

      {/* Scale milestones */}
      <div className="fno-gauge-scale">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/* ── Custom Chart Tooltips ───────────────────────────────────────────────── */

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color?: string }>;
  label?: string;
  tagLabel?: string;
}

function CustomFintechTooltip({ active, payload, label, tagLabel }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="fno-chart-tooltip fno-fintech-tooltip">
      <div className="fno-tooltip-head-row">
        <span className="fno-tooltip-title">{label}</span>
        <span className="fno-tooltip-tag">
          <Sparkles size={11} />
          <span>{tagLabel || 'Cashflow'}</span>
        </span>
      </div>
      <div className="fno-tooltip-divider" />
      {payload.map((item, index) => {
        const val = Number(item.value);
        return (
          <div key={index} className="fno-tooltip-row">
            <span className="fno-tooltip-name">
              <span className="fno-tooltip-dot" style={{ background: item.color || 'var(--brand)' }} />
              {item.name}:
            </span>
            <div className="fno-tooltip-val-group">
              <span className="fno-tooltip-val">{formatGigCoin(val)}</span>
              <span className="fno-tooltip-vnd">{vndLabel(val)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VaultSparkTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="fno-chart-tooltip fno-spark-tooltip">
      <span className="fno-tooltip-name">{label}</span>
      <span className="fno-tooltip-val">{formatGigCoinNumber(Number(payload[0].value))}</span>
    </div>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────────── */

export default function FinancialOverviewScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<FinancialOverviewPeriod>('month');
  const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');
  const [overview, setOverview] = useState<FinancialOverviewResponse | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | FinancialTransactionCategory>('all');
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const pillsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updatePillScrollState = () => {
    if (!pillsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = pillsRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    updatePillScrollState();
    const el = pillsRef.current;
    if (!el) return;
    el.addEventListener('scroll', updatePillScrollState);
    window.addEventListener('resize', updatePillScrollState);
    return () => {
      el.removeEventListener('scroll', updatePillScrollState);
      window.removeEventListener('resize', updatePillScrollState);
    };
  }, []);

  const scrollPills = (direction: 'left' | 'right') => {
    if (!pillsRef.current) return;
    pillsRef.current.scrollBy({
      left: direction === 'left' ? -130 : 130,
      behavior: 'smooth',
    });
  };

  const periodLabel = t(`financialOverview.periods.${period}`);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [overviewRes, walletRes] = await Promise.all([
        walletGetAPI.getFinancialOverview(period),
        walletGetAPI.getMyWallet().catch(() => null),
      ]);

      if (cancelled) return;

      if (!overviewRes.success || !overviewRes.data) {
        setError(overviewRes.message || t('financialOverview.loadError'));
        setLoading(false);
        return;
      }

      setOverview(overviewRes.data);
      if (walletRes && walletRes.success && walletRes.data) {
        setWallet(walletRes.data);
      }
      setLoading(false);
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [period, reloadKey, t]);

  const isClient = overview?.role === 'Client';
  const roleKicker = overview
    ? isClient
      ? t('financialOverview.clientFinance')
      : t('financialOverview.freelancerFinance')
    : t('financialOverview.accountFinance');

  const statusLabels = useMemo<Record<FinancialTransactionCategory, string>>(() => ({
    escrow: t('financialOverview.status.inEscrow'),
    released: isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'),
    refund: t('financialOverview.status.refunded'),
    serviceFee: t('financialOverview.status.serviceFee'),
  }), [isClient, t]);

  const progressData = useMemo(() => {
    if (!overview || overview.totalContractValue <= 0) return [];
    const completed = Math.min(overview.progressAmount, overview.totalContractValue);
    return [
      {
        name: isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'),
        value: completed,
        color: C_BRAND,
      },
      {
        name: t('financialOverview.status.remaining'),
        value: Math.max(0, overview.totalContractValue - completed),
        color: C_AMBER,
      },
    ].filter(item => item.value > 0);
  }, [isClient, overview, t]);

  /* Cumulative sparkline fed by the trend series (money moved across the period). */
  const sparkData = useMemo(() => {
    if (!overview) return [];
    let accumulator = 0;
    return overview.trendPoints.map(point => {
      accumulator += isClient ? point.escrowFundedAmount : point.paidOrReceivedAmount;
      return { period: point.period, cumulative: accumulator };
    });
  }, [overview, isClient]);

  /* Average spending/earnings trend series for the glowing KPI sparkline. */
  const avgSparkData = useMemo(() => {
    if (!overview) return [];
    return overview.trendPoints.map(point => ({
      period: point.period,
      amount: point.paidOrReceivedAmount,
      baseline: overview.averageAmount,
    }));
  }, [overview]);

  /* Per-period deviation from the average for secondary analysis. */
  const avgDeviationData = useMemo(() => {
    if (!overview) return [];
    return overview.trendPoints.map(point => ({
      period: point.period,
      deviation: point.paidOrReceivedAmount - overview.averageAmount,
    }));
  }, [overview]);

  /* Service-fee series for its micro bar cell. */
  const feeSeriesData = useMemo(() => {
    if (!overview) return [];
    return overview.trendPoints.map(point => ({
      period: point.period,
      fee: point.serviceFeeAmount,
    }));
  }, [overview]);

  /* Escrow funded across the whole selected period (client view). */
  const escrowFundedTotal = useMemo(
    () => (overview ? overview.trendPoints.reduce((sum, point) => sum + point.escrowFundedAmount, 0) : 0),
    [overview],
  );

  /* Wallet pool breakdown (visual asset allocation & cards). */
  const walletPoolRows = useMemo(() => {
    if (!wallet) return [];
    const pools: Array<{
      id: 'withdrawable' | 'deposited' | 'held' | 'pending';
      label: string;
      description: string;
      value: number;
      icon: JSX.Element;
      color: string;
      actionLabel?: string;
      actionPath?: string;
    }> = [
      {
        id: 'withdrawable',
        label: t('financialOverview.poolWithdrawable', { defaultValue: 'Thu nhập có thể rút' }),
        description: t('financialOverview.poolWithdrawableDesc', { defaultValue: 'Sẵn sàng rút về tài khoản ngân hàng' }),
        value: wallet.withdrawableGigCoin,
        icon: <Banknote size={16} />,
        color: '#10b981',
        actionLabel: !isClient ? t('financialOverview.withdrawNow', { defaultValue: 'Rút tiền' }) : undefined,
        actionPath: '/wallet/history',
      },
      {
        id: 'deposited',
        label: t('financialOverview.poolDeposited', { defaultValue: 'GigCoin đã nạp' }),
        description: t('financialOverview.poolDepositedDesc', { defaultValue: 'Dùng để tạo hợp đồng & ký quỹ' }),
        value: wallet.depositedGigCoin,
        icon: <Coins size={16} />,
        color: '#494be7',
        actionLabel: isClient ? t('financialOverview.depositMore', { defaultValue: 'Nạp thêm' }) : undefined,
        actionPath: '/wallet/deposit',
      },
      {
        id: 'held',
        label: t('financialOverview.poolHeld', { defaultValue: 'Ký quỹ dự án' }),
        description: t('financialOverview.poolHeldDesc', { defaultValue: 'Đang khóa bảo vệ theo Milestone' }),
        value: wallet.heldGigCoin,
        icon: <Lock size={16} />,
        color: '#f59e0b',
      },
      {
        id: 'pending',
        label: t('financialOverview.poolPending', { defaultValue: 'Chờ rút về ngân hàng' }),
        description: t('financialOverview.poolPendingDesc', { defaultValue: 'Yêu cầu rút tiền đang được xử lý' }),
        value: wallet.pendingWithdrawalGigCoin,
        icon: <Clock size={16} />,
        color: '#06b6d4',
      },
    ];
    return pools
      .filter(pool => pool.value > 0)
      .sort((a, b) => POOL_ORDER.indexOf(a.id) - POOL_ORDER.indexOf(b.id));
  }, [wallet, isClient, t]);

  const poolTotal = useMemo(
    () =>
      wallet
        ? wallet.depositedGigCoin +
          wallet.withdrawableGigCoin +
          wallet.heldGigCoin +
          wallet.pendingWithdrawalGigCoin
        : 0,
    [wallet],
  );

  const poolPieData = useMemo(() => {
    return walletPoolRows.map(pool => ({
      name: pool.label,
      value: pool.value,
      color: pool.color,
      id: pool.id,
    }));
  }, [walletPoolRows]);

  const filteredTransactions = useMemo(() => {
    if (!overview?.recentTransactions) return [];
    return overview.recentTransactions.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || item.project.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [overview?.recentTransactions, selectedCategory, searchQuery]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTransactions.length / pageSize)),
    [filteredTransactions.length, pageSize],
  );

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const handleCategoryChange = (cat: 'all' | FinancialTransactionCategory) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const isEmpty =
    Boolean(overview) &&
    overview!.totalAmount === 0 &&
    overview!.totalServiceFeePaid === 0 &&
    overview!.totalContractValue === 0 &&
    overview!.recentTransactions.length === 0;

  const exportOverview = () => {
    if (!overview) return;

    const rows: Array<Array<string | number>> = [
      [t('financialOverview.title'), overview.role],
      [t('financialOverview.csv.period'), t(`financialOverview.periods.${overview.period}`)],
      [t('financialOverview.csv.periodStartUtc'), overview.periodStartUtc],
      [t('financialOverview.csv.periodEndUtc'), overview.periodEndUtc],
      [isClient ? t('financialOverview.totalSpent') : t('financialOverview.totalEarnings'), overview.totalAmount],
      [isClient ? t('financialOverview.averageSpending') : t('financialOverview.averageEarnings'), overview.averageAmount],
      [isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'), overview.progressAmount],
      [t('financialOverview.totalContractValue'), overview.totalContractValue],
      [t('financialOverview.csv.progressPercentage'), overview.progressPercentage],
      [t('financialOverview.serviceFeePaid'), overview.totalServiceFeePaid],
      [],
      [t('financialOverview.csv.trend')],
      [t('financialOverview.csv.period'), isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'), t('financialOverview.status.escrowFunded'), t('financialOverview.status.serviceFee')],
      ...overview.trendPoints.map(point => [
        point.period,
        point.paidOrReceivedAmount,
        point.escrowFundedAmount,
        point.serviceFeeAmount,
      ]),
      [],
      [t('financialOverview.recentTransactions')],
      [t('financialOverview.csv.date'), t('financialOverview.csv.project'), t('financialOverview.csv.category'), t('financialOverview.csv.amount')],
      ...overview.recentTransactions.map(transaction => [
        transaction.occurredAt,
        transaction.project,
        statusLabels[transaction.category],
        transaction.signedAmount,
      ]),
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `financial-overview-${overview.role.toLowerCase()}-${overview.period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryIcon = (category: FinancialTransactionCategory) => {
    switch (category) {
      case 'released':
        return <CheckCircle2 size={15} />;
      case 'escrow':
        return <Lock size={15} />;
      case 'refund':
        return <RotateCcw size={15} />;
      case 'serviceFee':
        return <Receipt size={15} />;
    }
  };

  const activePeriodIndex = PERIODS.indexOf(period);

  const contentEl = (
    <>
      {/* ═══ WALLET STRUCTURE (ASSET ALLOCATION) ═════════════════════════ */}
      {wallet && walletPoolRows.length > 0 && (
        <section className="fno-card fno-pools fno-rise" style={{ '--d': '80ms' } as CSSProperties}>
          <div className="fno-pools-head">
            <div>
              <div className="fno-pools-badge-row">
                <span className="fno-pools-kicker">
                  <Wallet size={13} />
                  <span>{t('financialOverview.assetAllocation', { defaultValue: 'Phân bổ tài sản ví' })}</span>
                </span>
              </div>
              <h2 className="fno-panel-title">
                {t('financialOverview.walletStructure', { defaultValue: 'Cấu trúc ví' })}
              </h2>
              <p className="fno-panel-sub">
                {t('financialOverview.walletStructureDesc', { defaultValue: 'Phân bổ chi tiết số dư GigCoin theo từng mục đích sử dụng' })}
              </p>
            </div>

            <div className="fno-pools-total-box">
              <span className="fno-pools-total-label">
                {t('financialOverview.totalBalance', { defaultValue: 'Tổng số dư khả dụng' })}
              </span>
              <div className="fno-pools-total-val-row">
                <AnimatedNumber value={poolTotal} className="fno-pools-total-num" />
                <GigCoinLogo size={18} className="fno-coin-icon" />
                <span className="fno-pools-total-unit">G-coin</span>
              </div>
              <span className="fno-pools-total-vnd">{vndLabel(poolTotal)}</span>
            </div>
          </div>

          {/* Master-Detail Split: Left Donut + Right Rich Cards */}
          <div className="fno-pools-body">
            {/* Left: Donut Chart Wheel */}
            <div className="fno-pools-donut-panel">
              <div className="fno-pools-donut-chart">
                <ResponsiveContainer width={170} height={170}>
                  <PieChart>
                    <Pie
                      data={poolPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={74}
                      paddingAngle={4}
                      cornerRadius={5}
                      dataKey="value"
                      animationDuration={900}
                    >
                      {poolPieData.map(entry => (
                        <Cell key={entry.id} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="fno-pools-donut-center">
                  <span className="fno-pools-donut-count">{walletPoolRows.length}</span>
                  <span className="fno-pools-donut-sub">{t('financialOverview.sourcesCount', { defaultValue: 'Nguồn ví' })}</span>
                </div>
              </div>

              <div className="fno-pools-donut-bar" aria-label="Tỷ lệ phân bổ">
                {walletPoolRows.map(pool => {
                  const pct = poolTotal > 0 ? Math.round((pool.value / poolTotal) * 100) : 0;
                  return (
                    <span
                      key={pool.id}
                      className="fno-pools-bar-seg"
                      style={{
                        width: `${(pool.value / Math.max(1, poolTotal)) * 100}%`,
                        background: pool.color,
                      }}
                      title={`${pool.label}: ${pct}%`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Right: Rich Pool Breakdown Cards */}
            <div className="fno-pools-list">
              {walletPoolRows.map(pool => {
                const pct = poolTotal > 0 ? Math.round((pool.value / poolTotal) * 100) : 0;
                return (
                  <div key={pool.id} className="fno-pool-card">
                    <div className="fno-pool-card-left">
                      <span className={`fno-pool-icon is-${pool.id}`} style={{ background: pool.color }}>
                        {pool.icon}
                      </span>
                      <div className="fno-pool-info">
                        <div className="fno-pool-title-row">
                          <h4 className="fno-pool-name">{pool.label}</h4>
                          <span
                            className="fno-pool-pct-pill"
                            style={{
                              color: pool.color,
                              background: `color-mix(in srgb, ${pool.color} 12%, transparent)`,
                              borderColor: `color-mix(in srgb, ${pool.color} 30%, transparent)`,
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <p className="fno-pool-desc">{pool.description}</p>
                        <span className="fno-pool-vnd">{vndLabel(pool.value)}</span>
                      </div>
                    </div>

                    <div className="fno-pool-card-right">
                      <div className="fno-pool-amount-box">
                        <span className="fno-pool-amount" style={{ color: pool.color }}>
                          {formatGigCoinNumber(pool.value)}
                        </span>
                        <GigCoinLogo size={15} className="fno-coin-icon" />
                        <span className="fno-pool-unit">G-coin</span>
                      </div>
                      {pool.actionLabel && pool.actionPath && (
                        <button
                          type="button"
                          className="fno-pool-action-btn"
                          onClick={() => navigate(pool.actionPath!)}
                        >
                          <span>{pool.actionLabel}</span>
                          <ArrowUpRight size={12} />
                        </button>
                      )}
                    </div>

                    {/* Bottom Progress Fill */}
                    <div className="fno-pool-card-bar">
                      <span
                        className="fno-pool-card-fill"
                        style={{ width: `${pct}%`, background: pool.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ COMMAND STRIP (KPI TICKER) ═══════════════════════════════════ */}
      <section
        className={`fno-card fno-ticker fno-rise ${loading ? 'is-loading' : ''}`}
        style={{ '--d': '120ms' } as CSSProperties}
      >
        <div className="fno-ticker-head">
          <div>
            <h2 className="fno-panel-title">
              {t('financialOverview.metricsTitle', { defaultValue: 'Bảng điều khiển chỉ số' })}
            </h2>
            <p className="fno-panel-sub">
              {t('financialOverview.tickerHint', {
                period: periodLabel.toLocaleLowerCase(i18n.resolvedLanguage),
                defaultValue: `Số liệu theo ${periodLabel.toLocaleLowerCase(i18n.resolvedLanguage)}`,
              })}
            </p>
          </div>
          <span className="fno-ticker-live">
            <Activity size={13} />
            {t('financialOverview.live', { defaultValue: 'Trực tuyến' })}
          </span>
        </div>

        <div className="fno-ticker-grid">
          {/* 01 — Total Spent / Earned */}
          <article className="fno-cell is-prime">
            <span className="fno-cell-idx">01</span>
            <span className="fno-cell-label">
              {isClient ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
              {isClient ? t('financialOverview.totalSpent') : t('financialOverview.totalEarnings')}
            </span>
            <div className="fno-cell-meta">
              <AnimatedNumber value={overview?.totalAmount ?? 0} className="fno-cell-value" />
              <GigCoinLogo size={18} className="fno-coin-icon" />
              <span className="fno-cell-tag-prime">G-coin</span>
            </div>
            <span className="fno-cell-sub">{vndLabel(overview?.totalAmount ?? 0)}</span>
            <div className="fno-cell-viz">
              {sparkData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fnoCellSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#ffffff"
                      strokeWidth={2}
                      fill="url(#fnoCellSpark)"
                      animationDuration={900}
                    />
                    <XAxis dataKey="period" hide />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <span className="fno-cell-viz-empty">
                  {t('financialOverview.noTrendYet', { defaultValue: 'Chưa có xu hướng' })}
                </span>
              )}
            </div>
          </article>

          {/* 02 — Average per Project */}
          <article className="fno-cell">
            <span className="fno-cell-idx">02</span>
            <span className="fno-cell-label">
              <Coins size={13} />
              {isClient ? t('financialOverview.averageSpending') : t('financialOverview.averageEarnings')}
            </span>
            <div className="fno-cell-meta">
              <AnimatedNumber value={overview?.averageAmount ?? 0} className="fno-cell-value" />
              <GigCoinLogo size={16} className="fno-coin-icon" />
              <span className="fno-cell-tag">{t('financialOverview.perProject', { defaultValue: 'G$/dự án' })}</span>
            </div>
            <span className="fno-cell-sub">
              {t('financialOverview.basedOnJobs', {
                count: overview?.averageDivisorJobCount ?? 0,
                defaultValue: `Dựa trên ${overview?.averageDivisorJobCount ?? 0} dự án`,
              })}
            </span>
            <div className="fno-cell-viz">
              <div className="fno-benchmark-wrap">
                <div className="fno-benchmark-bar">
                  <span className="fno-benchmark-track" />
                  <span className="fno-benchmark-fill" style={{ width: '65%' }} />
                  <span className="fno-benchmark-point" style={{ left: '65%' }} />
                </div>
                <div className="fno-benchmark-labels">
                  <span>{t('financialOverview.standardScale', { defaultValue: 'Quy mô chuẩn' })}</span>
                  <span className="fno-benchmark-badge">
                    {overview?.averageDivisorJobCount ?? 0} {t('financialOverview.contracts', { defaultValue: 'HĐ' })}
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* 03 — Payment / Earnings Progress */}
          <article className="fno-cell">
            <span className="fno-cell-idx">03</span>
            <span className="fno-cell-label">
              <ShieldCheck size={13} />
              {isClient ? t('financialOverview.paymentProgress') : t('financialOverview.earningsProgress')}
            </span>
            <div className="fno-cell-meta">
              <AnimatedNumber value={overview?.progressPercentage ?? 0} className="fno-cell-value" suffix="%" />
              <span className="fno-cell-tag is-success">
                <span>{formatGigCoin(overview?.progressAmount ?? 0)}</span>
                <GigCoinLogo size={12} className="fno-coin-icon" />
              </span>
            </div>
            <span className="fno-cell-sub">
              {t('financialOverview.progressOf', {
                current: formatGigCoin(overview?.progressAmount ?? 0),
                total: formatGigCoin(overview?.totalContractValue ?? 0),
              })}
            </span>
            <div className="fno-cell-viz">
              <div className="fno-milestone-tube-wrap">
                <div className="fno-milestone-tube">
                  <span
                    className="fno-milestone-fill"
                    style={{ width: `${Math.min(100, Math.max(0, overview?.progressPercentage ?? 0))}%` }}
                  />
                </div>
                <div className="fno-milestone-labels">
                  <span className="fno-milestone-dot-item is-paid">
                    <i />
                    {isClient ? t('financialOverview.paidShare', { defaultValue: 'Đã trả' }) : t('financialOverview.receivedShare', { defaultValue: 'Đã nhận' })}: {Math.round(overview?.progressPercentage ?? 0)}%
                  </span>
                  <span className="fno-milestone-dot-item is-remaining">
                    <i />
                    {t('financialOverview.status.remaining', { defaultValue: 'Còn lại' })}: {Math.max(0, 100 - Math.round(overview?.progressPercentage ?? 0))}%
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* 04 — Platform Service Fee */}
          <article className="fno-cell">
            <span className="fno-cell-idx">04</span>
            <span className="fno-cell-label">
              <Receipt size={13} />
              {t('financialOverview.serviceFeePaid')}
            </span>
            <div className="fno-cell-meta">
              <AnimatedNumber value={overview?.totalServiceFeePaid ?? 0} className="fno-cell-value" />
              <GigCoinLogo size={16} className="fno-coin-icon" />
              <span className="fno-cell-tag is-purple">1% Fee</span>
            </div>
            <span className="fno-cell-sub">
              {t('financialOverview.platformFeeHint', { defaultValue: 'Phí dịch vụ nền tảng tiêu chuẩn 1%' })}
            </span>
            <div className="fno-cell-viz">
              <div className="fno-fee-box">
                <div className="fno-fee-ratio-bar">
                  <span className="fno-fee-seg-partner" style={{ width: '99%' }} title={t('financialOverview.paidShare', { defaultValue: 'Chi trả đối tác: 99%' })} />
                  <span className="fno-fee-seg-platform" style={{ width: '1%' }} title={t('financialOverview.status.serviceFee', { defaultValue: 'Phí nền tảng: 1%' })} />
                </div>
                <div className="fno-fee-trust-row">
                  <span className="fno-fee-trust-badge">
                    <ShieldCheck size={11} />
                    <span>{t('financialOverview.feeTransparency', { defaultValue: 'Cố định 1% minh bạch' })}</span>
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ═══ COMMAND TERMINAL (CASHFLOW + ESCROW METER) ══════════════════ */}
      <section className={`fno-terminal ${loading ? 'is-loading' : ''}`}>
        {/* Panel 1: Cashflow trends */}
        <article className="fno-card fno-term-chart fno-rise" style={{ '--d': '160ms' } as CSSProperties}>
          <div className="fno-term-head">
            <div>
              <h2 className="fno-panel-title">
                {isClient ? t('financialOverview.paymentTrends') : t('financialOverview.earningsTrends')}
              </h2>
              <p className="fno-panel-sub">
                {t('financialOverview.trendsDescription', { period: periodLabel.toLocaleLowerCase(i18n.resolvedLanguage) })}
              </p>
            </div>

            <div className="fno-term-actions">
              {/* Chart Mode Switcher */}
              <div className="fno-chart-switcher" role="radiogroup" aria-label="Kiểu biểu đồ">
                <button
                  type="button"
                  className={`fno-switch-btn ${chartMode === 'area' ? 'active' : ''}`}
                  onClick={() => setChartMode('area')}
                  title="Dạng sóng mượt mà"
                >
                  <LineChart size={13} />
                  <span>{t('financialOverview.chartArea', { defaultValue: 'Sóng mượt' })}</span>
                </button>
                <button
                  type="button"
                  className={`fno-switch-btn ${chartMode === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartMode('bar')}
                  title="Dạng cột phát quang"
                >
                  <BarChart3 size={13} />
                  <span>{t('financialOverview.chartBar', { defaultValue: 'Cột phát sáng' })}</span>
                </button>
              </div>

              <div className="fno-term-legend">
                <span className="fno-legend-item">
                  <span className="fno-legend-dot" style={{ background: C_BRAND }} />
                  {isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received')}
                </span>
                {isClient && (
                  <span className="fno-legend-item">
                    <span className="fno-legend-dot" style={{ background: C_AMBER }} />
                    {t('financialOverview.status.escrowFunded')}
                  </span>
                )}
                <span className="fno-legend-item">
                  <span className="fno-legend-dot" style={{ background: C_PURPLE }} />
                  {t('financialOverview.status.serviceFee')}
                </span>
              </div>
            </div>
          </div>

          <div className="fno-term-screen">
            <div className="fno-term-bg" aria-hidden="true" />
            {chartMode === 'area' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview?.trendPoints ?? []} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fnoAreaBrand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#494be7" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="fnoAreaAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="fnoAreaPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    dy={4}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={formatAxisAmount}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomFintechTooltip tagLabel={t('financialOverview.cashflowTag', { defaultValue: 'Dòng tiền' })} />}
                    cursor={{ stroke: 'var(--brand)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="paidOrReceivedAmount"
                    name={isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received')}
                    stroke="#6366f1"
                    strokeWidth={2.8}
                    fill="url(#fnoAreaBrand)"
                    activeDot={{ r: 6, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 3 }}
                    animationDuration={900}
                  />
                  {isClient && (
                    <Area
                      type="monotone"
                      dataKey="escrowFundedAmount"
                      name={t('financialOverview.status.escrowFunded')}
                      stroke="#f59e0b"
                      strokeWidth={2.4}
                      fill="url(#fnoAreaAmber)"
                      activeDot={{ r: 5, fill: '#ffffff', stroke: '#f59e0b', strokeWidth: 2.5 }}
                      animationDuration={900}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="serviceFeeAmount"
                    name={t('financialOverview.status.serviceFee')}
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#fnoAreaPurple)"
                    activeDot={{ r: 5, fill: '#ffffff', stroke: '#a855f7', strokeWidth: 2 }}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.trendPoints ?? []} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fnoBarBrand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7d7fff" />
                      <stop offset="100%" stopColor={C_BRAND} />
                    </linearGradient>
                    <linearGradient id="fnoBarAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor={C_AMBER} />
                    </linearGradient>
                    <linearGradient id="fnoBarPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor={C_PURPLE} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    dy={4}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={formatAxisAmount}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomFintechTooltip tagLabel={t('financialOverview.cashflowTag', { defaultValue: 'Dòng tiền' })} />}
                    cursor={{ fill: 'var(--surface-muted)' }}
                  />
                  <Bar
                    dataKey="paidOrReceivedAmount"
                    name={isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received')}
                    fill="url(#fnoBarBrand)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                    animationDuration={900}
                  />
                  {isClient && (
                    <Bar
                      dataKey="escrowFundedAmount"
                      name={t('financialOverview.status.escrowFunded')}
                      fill="url(#fnoBarAmber)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                      animationDuration={900}
                    />
                  )}
                  <Bar
                    dataKey="serviceFeeAmount"
                    name={t('financialOverview.status.serviceFee')}
                    fill="url(#fnoBarPurple)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* Panel 2: Contract settlement pressure gauge */}
        <article className="fno-card fno-term-meter fno-rise" style={{ '--d': '200ms' } as CSSProperties}>
          <div className="fno-panel-head">
            <h2 className="fno-panel-title">{t('financialOverview.contractProgress')}</h2>
            <p className="fno-panel-sub">
              {t('financialOverview.securedByEscrow', { defaultValue: 'Được bảo vệ bởi GigBridge Escrow' })}
            </p>
          </div>

          {progressData.length > 0 && overview ? (
            <div className="fno-meter-body">
              {/* Radial Half-Gauge Dial */}
              <RadialHalfGauge
                pct={overview.progressPercentage}
                isClient={isClient}
                caption={isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received')}
              />

              <div className="fno-meter-break">
                {progressData.map(item => (
                  <div key={item.name} className="fno-meter-row">
                    <span className="fno-meter-dot" style={{ background: item.color }} />
                    <span className="fno-meter-name">{item.name}</span>
                    <span className="fno-meter-amt">
                      <span>{formatGigCoin(item.value)}</span>
                      <GigCoinLogo size={13} className="fno-coin-icon" />
                    </span>
                    <span className="fno-meter-share">
                      {overview.totalContractValue > 0
                        ? Math.round((item.value / overview.totalContractValue) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>

              {isClient && escrowFundedTotal > 0 && (
                <div className="fno-meter-escrow">
                  <ShieldCheck size={14} />
                  <span>
                    {t('financialOverview.escrowFundedPeriod', {
                      defaultValue: 'Đã ký quỹ trong kỳ qua GigBridge Escrow',
                    })}
                  </span>
                  <b>
                    <span>{formatGigCoin(escrowFundedTotal)}</span>
                    <GigCoinLogo size={13} className="fno-coin-icon" />
                  </b>
                </div>
              )}
            </div>
          ) : (
            <div className="fno-panel-empty">
              <ShieldCheck size={30} />
              <p>{t('financialOverview.noProgress')}</p>
            </div>
          )}
        </article>
      </section>

      {/* ═══ TRANSACTION LOG ═════════════════════════════════════════════ */}
      <section
        className={`fno-card fno-log fno-rise ${loading ? 'is-loading' : ''}`}
        style={{ '--d': '240ms' } as CSSProperties}
      >
        <div className="fno-log-chrome">
          <span className="fno-log-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="fno-log-title">{t('financialOverview.recentTransactions')}</span>
          <span className="fno-log-hint">{t('financialOverview.transactionsDescription')}</span>

          <div className="fno-log-tools">
            <div className="fno-search-wrap">
              <Search size={14} className="fno-search-icon" />
              <input
                type="text"
                className="fno-search-field"
                placeholder={t('financialOverview.searchPlaceholder')}
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>

            <div className={`fno-cat-pills-wrap ${canScrollLeft ? 'has-left-fade' : ''} ${canScrollRight ? 'has-right-fade' : ''}`}>
              {canScrollLeft && (
                <button
                  type="button"
                  className="fno-pill-arrow is-left"
                  onClick={() => scrollPills('left')}
                  aria-label={t('financialOverview.prev', { defaultValue: 'Cuộn sang trái' })}
                >
                  <ChevronLeft size={13} />
                </button>
              )}
              <div
                ref={pillsRef}
                className="fno-cat-pills"
                onWheel={e => {
                  if (pillsRef.current && e.deltaY !== 0) {
                    pillsRef.current.scrollLeft += e.deltaY;
                  }
                }}
              >
                {(['all', 'released', 'escrow', 'refund', 'serviceFee'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`fno-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat === 'all' ? t('financialOverview.all') : statusLabels[cat]}
                  </button>
                ))}
              </div>
              {canScrollRight && (
                <button
                  type="button"
                  className="fno-pill-arrow is-right"
                  onClick={() => scrollPills('right')}
                  aria-label={t('financialOverview.next', { defaultValue: 'Cuộn sang phải' })}
                >
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="fno-log-body">
            {paginatedTransactions.map((transaction, index) => {
              const isPositive = transaction.signedAmount > 0;
              const realIndex = (currentPage - 1) * pageSize + index + 1;
              const badgeClass =
                transaction.category === 'released'
                  ? 'success'
                  : transaction.category === 'escrow'
                  ? 'warning'
                  : transaction.category === 'refund'
                  ? 'info'
                  : 'brand';

              return (
                <article key={transaction.walletTransactionId} className="fno-log-row">
                  <span className="fno-log-idx">#{String(realIndex).padStart(3, '0')}</span>
                  <div className={`fno-log-node ${badgeClass}`}>
                    {getCategoryIcon(transaction.category)}
                  </div>
                  <div className="fno-log-main">
                    <h4 className="fno-log-name" title={transaction.project}>
                      {transaction.project || t('financialOverview.accountFinance')}
                    </h4>
                    <span className="fno-log-date">
                      <Calendar size={12} />
                      {new Date(transaction.occurredAt).toLocaleString(
                        i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US',
                        { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' },
                      )}
                    </span>
                  </div>
                  <div className="fno-log-mid">
                    <span className={`fno-status-badge ${badgeClass}`}>
                      {statusLabels[transaction.category]}
                    </span>
                  </div>
                  <div className="fno-log-amt">
                    <span className={`fno-tx-amt ${isPositive ? 'positive' : ''}`}>
                      <span>{isPositive ? `+${formatGigCoinNumber(transaction.signedAmount)}` : formatGigCoinNumber(transaction.signedAmount)}</span>
                      <GigCoinLogo size={14} className="fno-coin-icon" />
                    </span>
                    <span className="fno-log-amt-sub">{vndLabel(Math.abs(transaction.signedAmount))}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="fno-ledger-empty">
            <div className="fno-ledger-empty-icon">
              <Search size={26} />
            </div>
            <p>{t('financialOverview.noTransactions')}</p>
          </div>
        )}

        <div className="fno-log-foot">
          <div className="fno-log-foot-left">
            <div className="fno-pagesize-group">
              <span className="fno-pagesize-label">{t('financialOverview.pageSize', { defaultValue: 'Hiển thị' })}:</span>
              {[5, 10, 20].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`fno-pagesize-btn ${pageSize === size ? 'active' : ''}`}
                  onClick={() => handlePageSizeChange(size)}
                  title={`${size} ${t('financialOverview.perPage', { defaultValue: '/ trang' })}`}
                >
                  {size}
                </button>
              ))}
            </div>

            <span className="fno-ledger-count">
              {filteredTransactions.length > 0
                ? t('financialOverview.showingRange', {
                    from: (currentPage - 1) * pageSize + 1,
                    to: Math.min(currentPage * pageSize, filteredTransactions.length),
                    total: filteredTransactions.length,
                    defaultValue: `Hiển thị ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredTransactions.length)} trong tổng số ${filteredTransactions.length}`,
                  })
                : `${filteredTransactions.length} giao dịch`}
            </span>
          </div>

          <div className="fno-log-foot-right">
            {totalPages > 1 && (
              <div className="fno-pagination-nav">
                <button
                  type="button"
                  className="fno-pag-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  aria-label={t('financialOverview.prev', { defaultValue: 'Trang trước' })}
                >
                  <ChevronLeft size={13} />
                  <span>{t('financialOverview.prev', { defaultValue: 'Trước' })}</span>
                </button>

                <span className="fno-pag-page-info">
                  {currentPage} <span className="fno-pag-slash">/</span> {totalPages}
                </span>

                <button
                  type="button"
                  className="fno-pag-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  aria-label={t('financialOverview.next', { defaultValue: 'Trang sau' })}
                >
                  <span>{t('financialOverview.next', { defaultValue: 'Sau' })}</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/wallet/history')}
              className="fno-link-btn"
            >
              <span>{t('financialOverview.viewAllHistory')}</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </>
  );

  return (
    <AppLayout>
      <div className="fno-page-wrapper">
        <div className="fno-page-aurora" aria-hidden="true" />
        <div className="fno-page-dots" aria-hidden="true" />
        <div className="fno-container">
          {/* ═══ HERO COMMAND CENTER ══════════════════════════════════════ */}
          <section className="fno-card fno-hero fno-rise" style={{ '--d': '0ms' } as CSSProperties}>
            <div className="fno-hero-orb fno-hero-orb-a" aria-hidden="true" />
            <div className="fno-hero-orb fno-hero-orb-b" aria-hidden="true" />
            <div className="fno-hero-orb fno-hero-orb-c" aria-hidden="true" />

            <div className="fno-hero-main">
              <div className="fno-hero-badges">
                <span className="fno-hero-kicker">
                  <Landmark size={13} />
                  <span>{roleKicker}</span>
                </span>
                <span className="fno-currency-tag">
                  <Coins size={12} />
                  <span>{t('financialOverview.rateBadge', { defaultValue: '1 G$ = 1,000 VND' })}</span>
                </span>
                <span className="fno-escrow-tag">
                  <ShieldCheck size={12} />
                  <span>{t('financialOverview.securedByEscrow', { defaultValue: 'GigBridge Escrow' })}</span>
                </span>
              </div>

              <h1 className="fno-hero-title">{t('financialOverview.title')}</h1>
              <p className="fno-hero-desc">
                {!overview
                  ? t('financialOverview.loadingDescription')
                  : isClient
                  ? t('financialOverview.clientDescription')
                  : t('financialOverview.freelancerDescription')}
                {' '}{t('financialOverview.amountsInGigCoin')}
              </p>

              <div
                className="fno-period-seg"
                role="tablist"
                aria-label={t('financialOverview.periodAriaLabel')}
              >
                <span
                  className="fno-period-thumb"
                  style={{ transform: `translateX(${activePeriodIndex * 100}%)` }}
                  aria-hidden="true"
                />
                {PERIODS.map(item => (
                  <button
                    type="button"
                    key={item}
                    role="tab"
                    aria-selected={period === item}
                    className={`fno-period-tab ${period === item ? 'active' : ''}`}
                    onClick={() => setPeriod(item)}
                    disabled={loading && period === item}
                  >
                    {t(`financialOverview.tabs.${item}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Vault panel */}
            <aside className="fno-vault">
              <div className="fno-vault-glow fno-vault-glow-a" aria-hidden="true" />
              <div className="fno-vault-glow fno-vault-glow-b" aria-hidden="true" />

              <div className="fno-vault-head">
                <span className="fno-vault-label">
                  <Wallet size={14} />
                  <span>{t('financialOverview.walletAvailable', { defaultValue: 'Số dư khả dụng' })}</span>
                </span>
                <span className="fno-vault-live">
                  <span className="fno-live-dot" aria-hidden="true" />
                  {t('financialOverview.live', { defaultValue: 'Trực tuyến' })}
                </span>
              </div>

              <div className="fno-vault-amount">
                <AnimatedNumber value={wallet?.totalSpendableGigCoin ?? 0} className="fno-vault-value" />
                <GigCoinLogo size={20} className="fno-coin-icon" />
                <span className="fno-vault-unit">GigCoin</span>
              </div>

              <div className="fno-vault-vnd">
                {wallet
                  ? `≈ ${formatVndNumber(wallet.totalSpendableGigCoinVnd)} VNĐ`
                  : '\u00A0'}
              </div>

              <div className="fno-vault-spark">
                {sparkData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fnoVaultSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#ffffff"
                        strokeWidth={2}
                        fill="url(#fnoVaultSpark)"
                        animationDuration={1100}
                      />
                      <Tooltip content={<VaultSparkTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.25)' }} />
                      <XAxis dataKey="period" hide />
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="fno-vault-spark-empty">
                    {t('financialOverview.noTrendYet', { defaultValue: 'Chưa có xu hướng dòng tiền' })}
                  </div>
                )}
              </div>

              {wallet && (
                <div className="fno-vault-chips">
                  {wallet.withdrawableGigCoin > 0 && (
                    <span className="fno-vault-chip is-earn">
                      <Banknote size={12} />
                      {t('financialOverview.poolWithdrawable', { defaultValue: 'Có thể rút' })}{' '}
                      {formatGigCoinNumber(wallet.withdrawableGigCoin)}
                    </span>
                  )}
                  {wallet.heldGigCoin > 0 && (
                    <span className="fno-vault-chip">
                      <Lock size={12} />
                      {t('financialOverview.status.inEscrow', { defaultValue: 'Ký quỹ' })}{' '}
                      {formatGigCoinNumber(wallet.heldGigCoin)}
                    </span>
                  )}
                  {wallet.pendingWithdrawalGigCoin > 0 && (
                    <span className="fno-vault-chip">
                      <Clock size={12} />
                      {t('financialOverview.poolPending', { defaultValue: 'Chờ rút' })}{' '}
                      {formatGigCoinNumber(wallet.pendingWithdrawalGigCoin)}
                    </span>
                  )}
                </div>
              )}

              <div className="fno-vault-actions">
                <button
                  type="button"
                  className="fno-btn fno-btn-ghost"
                  onClick={exportOverview}
                  disabled={!overview || loading || isEmpty}
                  title={t('financialOverview.export')}
                >
                  <Download size={15} />
                  <span>{t('financialOverview.export')}</span>
                </button>

                {isClient ? (
                  <button
                    type="button"
                    className="fno-btn fno-btn-brand"
                    onClick={() => navigate('/wallet/deposit')}
                  >
                    <PlusCircle size={15} />
                    <span>{t('financialOverview.depositFunds', { defaultValue: 'Nạp GigCoin' })}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="fno-btn fno-btn-brand"
                    onClick={() => navigate('/wallet/history')}
                  >
                    <Wallet size={15} />
                    <span>{t('financialOverview.walletHistory', { defaultValue: 'Lịch sử ví' })}</span>
                  </button>
                )}
              </div>
            </aside>
          </section>

          {/* ═══ STATE SCREENS (LOADING / ERROR / EMPTY) ══════════════════ */}
          {loading && !overview ? (
            <section className="fno-card fno-state-box fno-rise" style={{ '--d': '100ms' } as CSSProperties}>
              <div className="fno-state-icon-circle">
                <Loader2 size={26} className="animate-spin text-brand" />
              </div>
              <strong className="fno-state-heading">{t('financialOverview.loading')}</strong>
              <p className="fno-state-paragraph">{t('financialOverview.loadingDescription')}</p>
              <div className="fno-skeleton-strip" aria-hidden="true">
                <span className="fno-skeleton" />
                <span className="fno-skeleton" />
                <span className="fno-skeleton" />
              </div>
            </section>
          ) : error ? (
            <section className="fno-card fno-state-box fno-rise" style={{ '--d': '100ms' } as CSSProperties}>
              <div className="fno-state-icon-circle is-error">
                <AlertCircle size={26} />
              </div>
              <strong className="fno-state-heading">{t('financialOverview.loadErrorTitle')}</strong>
              <p className="fno-state-paragraph">{error}</p>
              <button
                type="button"
                className="fno-btn fno-btn-brand"
                onClick={() => setReloadKey(value => value + 1)}
              >
                <RefreshCw size={15} />
                <span>{t('financialOverview.retry')}</span>
              </button>
            </section>
          ) : overview && isEmpty ? (
            <section className="fno-card fno-state-box fno-rise" style={{ '--d': '100ms' } as CSSProperties}>
              <div className="fno-state-icon-circle">
                <Wallet size={26} />
              </div>
              <strong className="fno-state-heading">
                {t('financialOverview.emptyTitle', { period: periodLabel.toLocaleLowerCase(i18n.resolvedLanguage) })}
              </strong>
              <p className="fno-state-paragraph">{t('financialOverview.emptyDescription')}</p>
            </section>
          ) : overview ? (
            contentEl
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}