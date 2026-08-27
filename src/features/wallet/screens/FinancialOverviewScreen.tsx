import { useEffect, useMemo, useState } from 'react';
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Landmark,
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

/* ── Custom Chart Tooltips ───────────────────────────────────────────────── */

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color?: string }>;
  label?: string;
}

function CustomBarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="fno-chart-tooltip">
      <p className="fno-tooltip-title">{label}</p>
      {payload.map((item, index) => (
        <div key={index} className="fno-tooltip-row">
          <span className="fno-tooltip-name">
            <span className="fno-tooltip-dot" style={{ background: item.color || 'var(--brand)' }} />
            {item.name}:
          </span>
          <span className="fno-tooltip-val">{formatGigCoin(Number(item.value))}</span>
        </div>
      ))}
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
  const [overview, setOverview] = useState<FinancialOverviewResponse | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | FinancialTransactionCategory>('all');

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

  /* Wallet pool breakdown (visual budget bar + legend list). */
  const walletPoolRows = useMemo(() => {
    if (!wallet) return [];
    const pools: Array<{
      id: 'withdrawable' | 'deposited' | 'held' | 'pending';
      label: string;
      value: number;
      icon: JSX.Element;
    }> = [
      {
        id: 'withdrawable',
        label: t('financialOverview.poolWithdrawable', { defaultValue: 'Thu nhập có thể rút' }),
        value: wallet.withdrawableGigCoin,
        icon: <Banknote size={16} />,
      },
      {
        id: 'deposited',
        label: t('financialOverview.poolDeposited', { defaultValue: 'GigCoin đã nạp' }),
        value: wallet.depositedGigCoin,
        icon: <Coins size={16} />,
      },
      {
        id: 'held',
        label: t('financialOverview.poolHeld', { defaultValue: 'Ký quỹ dự án' }),
        value: wallet.heldGigCoin,
        icon: <Lock size={16} />,
      },
      {
        id: 'pending',
        label: t('financialOverview.poolPending', { defaultValue: 'Chờ rút về ngân hàng' }),
        value: wallet.pendingWithdrawalGigCoin,
        icon: <Clock size={16} />,
      },
    ];
    return pools
      .filter(pool => pool.value > 0)
      .sort((a, b) => POOL_ORDER.indexOf(a.id) - POOL_ORDER.indexOf(b.id));
  }, [wallet, t]);

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

  const filteredTransactions = useMemo(() => {
    if (!overview?.recentTransactions) return [];
    return overview.recentTransactions.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || item.project.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [overview?.recentTransactions, selectedCategory, searchQuery]);

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
      {/* ═══ WALLET STRUCTURE (POOLS) ═════════════════════════════════════ */}
      {wallet && walletPoolRows.length > 0 && (
        <section className="fno-card fno-pools fno-rise" style={{ '--d': '80ms' } as CSSProperties}>
          <div className="fno-pools-head">
            <div>
              <h2 className="fno-panel-title">
                {t('financialOverview.walletStructure', { defaultValue: 'Cấu trúc ví' })}
              </h2>
              <p className="fno-panel-sub">
                {t('financialOverview.walletStructureDesc', { defaultValue: 'Phân bổ GigCoin theo các nguồn trong ví của bạn' })}
              </p>
            </div>
            <div className="fno-pools-total">
              <span className="fno-pools-total-label">
                {t('financialOverview.totalBalance', { defaultValue: 'Tổng số dư' })}
              </span>
              <span className="fno-pools-total-value">
                <AnimatedNumber value={poolTotal} />
              </span>
            </div>
          </div>

          <div className="fno-pools-bar" role="img" aria-label={t('financialOverview.walletStructure', { defaultValue: 'Cấu trúc ví' })}>
            {walletPoolRows.map(pool => (
              <span
                key={pool.id}
                className="fno-pool-seg"
                style={{
                  width: `${(pool.value / Math.max(1, poolTotal)) * 100}%`,
                  background: POOL_COLORS[pool.id],
                }}
                title={pool.label}
              />
            ))}
          </div>

          <div className="fno-pools-grid">
            {walletPoolRows.map(pool => {
              const pct = poolTotal > 0 ? Math.round((pool.value / poolTotal) * 100) : 0;
              return (
                <div key={pool.id} className="fno-pool-item">
                  <span className={`fno-pool-icon is-${pool.id}`}>{pool.icon}</span>
                  <div className="fno-pool-meta">
                    <span className="fno-pool-name">{pool.label}</span>
                    <span className="fno-pool-vnd">{vndLabel(pool.value)}</span>
                  </div>
                  <div className="fno-pool-right">
                    <span className="fno-pool-amount" style={{ color: POOL_COLORS[pool.id] }}>
                      {formatGigCoinNumber(pool.value)}
                    </span>
                    <span className="fno-pool-pct">{pct}%</span>
                  </div>
                  <span className="fno-pool-track" aria-hidden="true">
                    <span
                      className="fno-pool-fill"
                      style={{ width: `${pct}%`, background: POOL_COLORS[pool.id] }}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ BENTO KPI GRID ══════════════════════════════════════════════ */}
      <section className={`fno-bento-stats ${loading ? 'is-loading' : ''}`}>
        {/* Card 1: Total Spent / Earned */}
        <article
          className="fno-card fno-stat-card fno-stat-hero fno-card-hover fno-rise"
          style={{ '--d': '120ms' } as CSSProperties}
        >
          <div className="fno-stat-top">
            <span className="fno-stat-label">
              {isClient ? t('financialOverview.totalSpent') : t('financialOverview.totalEarnings')}
            </span>
            <span className="fno-stat-icon is-hero">
              {isClient ? <TrendingDown size={17} /> : <TrendingUp size={17} />}
            </span>
          </div>
          <div className="fno-stat-main">
            <AnimatedNumber value={overview?.totalAmount ?? 0} className="fno-stat-value is-brand" />
            <p className="fno-stat-sub">
              {t('financialOverview.equivalentVnd', {
                amount: formatVndNumber((overview?.totalAmount ?? 0) * 1000),
                defaultValue: `≈ ${formatVndNumber((overview?.totalAmount ?? 0) * 1000)} VNĐ`,
              })}
            </p>
          </div>
          <span className="fno-stat-foot">
            <Sparkles size={12} />
            {t(`financialOverview.periods.${period}`)}
          </span>
        </article>

        {/* Card 2: Average per Project */}
        <article
          className="fno-card fno-stat-card fno-card-hover fno-rise"
          style={{ '--d': '180ms' } as CSSProperties}
        >
          <div className="fno-stat-top">
            <span className="fno-stat-label">
              {isClient ? t('financialOverview.averageSpending') : t('financialOverview.averageEarnings')}
            </span>
            <span className="fno-stat-icon is-success">
              <Coins size={17} />
            </span>
          </div>
          <div className="fno-stat-main">
            <AnimatedNumber value={overview?.averageAmount ?? 0} className="fno-stat-value" />
            <p className="fno-stat-sub">
              {t('financialOverview.basedOnJobs', {
                count: overview?.averageDivisorJobCount ?? 0,
                defaultValue: `Dựa trên ${overview?.averageDivisorJobCount ?? 0} dự án`,
              })}
            </p>
          </div>
        </article>

        {/* Card 3: Contract Settlement / Payment Progress */}
        <article
          className="fno-card fno-stat-card fno-card-hover fno-rise"
          style={{ '--d': '240ms' } as CSSProperties}
        >
          <div className="fno-stat-top">
            <span className="fno-stat-label">
              {isClient ? t('financialOverview.paymentProgress') : t('financialOverview.earningsProgress')}
            </span>
            <span className="fno-stat-icon is-warning">
              <ShieldCheck size={17} />
            </span>
          </div>
          <div className="fno-stat-main">
            <div className="flex items-center justify-between gap-2">
              <AnimatedNumber value={overview?.progressPercentage ?? 0} className="fno-stat-value" suffix="%" />
              <span className="fno-stat-badge">
                {formatGigCoinNumber(overview?.progressAmount ?? 0)}
              </span>
            </div>
            <div className="fno-progress-track">
              <div
                className="fno-progress-bar"
                style={{ width: `${Math.min(100, overview?.progressPercentage ?? 0)}%` }}
              />
            </div>
            <p className="fno-stat-sub">
              {t('financialOverview.progressOf', {
                current: formatGigCoin(overview?.progressAmount ?? 0),
                total: formatGigCoin(overview?.totalContractValue ?? 0),
              })}
            </p>
          </div>
        </article>

        {/* Card 4: Platform Service Fee */}
        <article
          className="fno-card fno-stat-card fno-card-hover fno-rise"
          style={{ '--d': '300ms' } as CSSProperties}
        >
          <div className="fno-stat-top">
            <span className="fno-stat-label">{t('financialOverview.serviceFeePaid')}</span>
            <span className="fno-stat-icon">
              <Receipt size={17} />
            </span>
          </div>
          <div className="fno-stat-main">
            <AnimatedNumber value={overview?.totalServiceFeePaid ?? 0} className="fno-stat-value" />
            <p className="fno-stat-sub">
              {t('financialOverview.platformFeeHint', { defaultValue: 'Phí dịch vụ nền tảng tiêu chuẩn 1%' })}
            </p>
          </div>
        </article>
      </section>

      {/* ═══ ANALYTICS GRID ═══════════════════════════════════════════════ */}
      <section className="fno-analytics-grid">
        {/* Column 1: Cashflow trends */}
        <div
          className="fno-card fno-panel-card fno-rise"
          style={{ '--d': '140ms' } as CSSProperties}
        >
          <div className="fno-panel-head">
            <h2 className="fno-panel-title">
              {isClient ? t('financialOverview.paymentTrends') : t('financialOverview.earningsTrends')}
            </h2>
            <p className="fno-panel-sub">
              {t('financialOverview.trendsDescription', { period: periodLabel.toLocaleLowerCase(i18n.resolvedLanguage) })}
            </p>
          </div>

          <div className="fno-chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.trendPoints ?? []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
                <Bar
                  dataKey="paidOrReceivedAmount"
                  name={isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received')}
                  fill="url(#fnoBarBrand)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={38}
                  animationDuration={900}
                />
                {isClient && (
                  <Bar
                    dataKey="escrowFundedAmount"
                    name={t('financialOverview.status.escrowFunded')}
                    fill="url(#fnoBarAmber)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={38}
                    animationDuration={900}
                  />
                )}
                <Bar
                  dataKey="serviceFeeAmount"
                  name={t('financialOverview.status.serviceFee')}
                  fill="url(#fnoBarPurple)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={38}
                  animationDuration={900}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="fno-legend">
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

        {/* Column 2: Contract allocation donut */}
        <div
          className="fno-card fno-panel-card fno-rise"
          style={{ '--d': '180ms' } as CSSProperties}
        >
          <div className="fno-panel-head">
            <h2 className="fno-panel-title">{t('financialOverview.contractProgress')}</h2>
            <p className="fno-panel-sub">
              {t('financialOverview.securedByEscrow', { defaultValue: 'Được bảo vệ bởi GigBridge Escrow' })}
            </p>
          </div>

          {progressData.length > 0 && overview ? (
            <div className="flex flex-col justify-between flex-1 gap-3">
              <div className="fno-donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={progressData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="68%"
                      outerRadius="92%"
                      paddingAngle={4}
                      cornerRadius={7}
                      stroke="none"
                      animationDuration={900}
                    >
                      {progressData.map(item => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomBarTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="fno-donut-center">
                  <AnimatedNumber value={overview.progressPercentage} className="fno-donut-metric" suffix="%" />
                  <span className="fno-donut-sub">
                    {t('financialOverview.status.paid', { defaultValue: 'Hoàn tất' })}
                  </span>
                  <span className="fno-donut-total">
                    {t('financialOverview.totalContractValue', { defaultValue: 'Tổng giá trị hợp đồng' })}
                  </span>
                </div>
              </div>

              <div className="fno-donut-breakdown">
                {progressData.map(item => (
                  <div key={item.name} className="fno-breakdown-box">
                    <div className="fno-breakdown-tag">
                      <span className="fno-breakdown-dot" style={{ background: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="fno-breakdown-amount">{formatGigCoin(item.value)}</span>
                    <span className="fno-breakdown-pct">
                      {overview.totalContractValue > 0
                        ? Math.round((item.value / overview.totalContractValue) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="fno-panel-empty">
              <ShieldCheck size={30} />
              <p>{t('financialOverview.noProgress')}</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ RECENT TRANSACTIONS LEDGER ═══════════════════════════════════ */}
      <section
        className="fno-card fno-ledger-card fno-rise"
        style={{ '--d': '220ms' } as CSSProperties}
      >
        <div className="fno-ledger-top">
          <div>
            <h2 className="fno-panel-title">{t('financialOverview.recentTransactions')}</h2>
            <p className="fno-panel-sub">{t('financialOverview.transactionsDescription')}</p>
          </div>

          <div className="fno-ledger-tools">
            <div className="fno-search-wrap">
              <Search size={14} className="fno-search-icon" />
              <input
                type="text"
                className="fno-search-field"
                placeholder={t('financialOverview.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="fno-cat-pills">
              {(['all', 'released', 'escrow', 'refund', 'serviceFee'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`fno-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? t('financialOverview.all') : statusLabels[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="fno-tx-list">
            {filteredTransactions.map(transaction => {
              const isPositive = transaction.signedAmount > 0;
              const badgeClass =
                transaction.category === 'released'
                  ? 'success'
                  : transaction.category === 'escrow'
                  ? 'warning'
                  : transaction.category === 'refund'
                  ? 'info'
                  : 'brand';

              return (
                <article key={transaction.walletTransactionId} className="fno-tx-row">
                  <div className="fno-tx-left">
                    <div className={`fno-tx-icon-square ${badgeClass}`}>
                      {getCategoryIcon(transaction.category)}
                    </div>
                    <div className="fno-tx-details">
                      <h4 className="fno-tx-name" title={transaction.project}>
                        {transaction.project || t('financialOverview.accountFinance')}
                      </h4>
                      <div className="fno-tx-date-wrap">
                        <Calendar size={12} />
                        <span>
                          {new Date(transaction.occurredAt).toLocaleString(
                            i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US',
                            { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="fno-tx-right">
                    <span className={`fno-status-badge ${badgeClass}`}>
                      {statusLabels[transaction.category]}
                    </span>
                    <span className={`fno-tx-amt ${isPositive ? 'positive' : 'negative'}`}>
                      {isPositive ? `+${formatGigCoinNumber(transaction.signedAmount)}` : formatGigCoinNumber(transaction.signedAmount)}
                    </span>
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

        <div className="fno-ledger-foot">
          <span className="fno-ledger-count">
            {overview?.recentTransactions.length ?? 0} {t('financialOverview.recentTransactions').toLowerCase()}
          </span>
          <button
            type="button"
            onClick={() => navigate('/wallet/history')}
            className="fno-link-btn"
          >
            <span>{t('financialOverview.viewAllHistory')}</span>
            <ArrowUpRight size={14} />
          </button>
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
                <span className="fno-vault-unit">G-coin</span>
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