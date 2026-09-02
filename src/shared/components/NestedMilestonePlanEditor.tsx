import { type ReactNode, useId, useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronRight, ChevronsUpDown, Clock3, Coins, GripVertical, Lock, Percent, Plus, RotateCcw, Trash2, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { AutoGrowTextarea } from './AutoGrowTextarea';
import { CustomSelect } from './CustomSelect';
import GCoinIcon from './GCoinIcon';
import { formatGigCoinNumber, formatGigCoinToVnd } from '../utils/gigcoin';
import { recalculateMilestonesBidirectional, resetAndEqualizeMilestones } from '../../features/jobs/utils/milestoneClamping';
import { computeWorkItemDurationSummary } from '../../features/jobs/utils/jobDuration';

export interface EditablePlanWorkItem {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  deliverables?: string | null;
  estimatedDuration?: string | null;
  orderIndex: number;
}

export interface EditableMilestonePlan {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  amount: number;
  estimatedDuration?: string | null;
  dueDate?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  orderIndex: number;
  workItems: EditablePlanWorkItem[];
}

export interface MilestonePlanFieldCopy {
  fixedProjectBudget?: string;
  milestoneTitle?: string;
  amount?: string;
  duration?: string;
  deadline?: string;
  description?: string;
  deliverables?: string;
  acceptanceCriteria?: string;
  workBreakdown?: string;
  workItemTitle?: string;
  workItemDuration?: string;
  workItemDescription?: string;
  workItemDeliverables?: string;
}

export interface MilestonePlanUiCopy {
  optional?: string;
  addMilestone?: string;
  fixedProjectBudget?: string;
  noBaselinePlan?: string;
  noBaselinePlanDescription?: string;
  addFirstMilestone?: string;
  untitledMilestone?: string;
  workItems?: string;
  moveUp?: string;
  moveDown?: string;
  deleteMilestone?: string;
  milestoneTitle?: string;
  amount?: string;
  duration?: string;
  durationUnit?: string;
  deadline?: string;
  description?: string;
  deliverables?: string;
  acceptanceCriteria?: string;
  workBreakdown?: string;
  addWorkItem?: string;
  workItem?: string;
  deleteWorkItem?: string;
  workItemTitle?: string;
  estimatedDuration?: string;
  taskDescription?: string;
  workItemDeliverables?: string;
  advancedDetails?: string;
  derivedDuration?: string;
  milestoneSummaryDesc?: string;
  milestoneLabel?: string;
  autoBalanceOn?: string;
  autoBalanceOff?: string;
  autoBalanceOnDesc?: string;
  autoBalanceOffDesc?: string;
  resetBalance?: string;
  resetBalanceTooltip?: string;
  userLocked?: string;
  userLockedTitle?: string;
  autoBalanced?: string;
  autoBalancedTitle?: string;
  workItemsTotalLabel?: string;
  workItemsRemainingLabel?: string;
  workItemsOverageLabel?: string;
  expandAll?: string;
  collapseAll?: string;
  percentOfBudget?: string;
  budgetShort?: string;
  dragToReorder?: string;
  collapseMilestone?: string;
  expandMilestone?: string;
  diffHigherAmount?: string;
  diffLowerAmount?: string;
  diffEqualAmount?: string;
  diffLongerDuration?: string;
  diffShorterDuration?: string;
  diffEqualDuration?: string;
  diffHigherAmountTitle?: string;
  diffLowerAmountTitle?: string;
  diffLongerDurationTitle?: string;
  diffShorterDurationTitle?: string;
  weeksUnit?: string;
  daysUnit?: string;
}

export interface MilestoneDurationUnitOption {
  value: string;
  label: string;
}

interface Props {
  value: EditableMilestonePlan[];
  onChange: (value: EditableMilestonePlan[]) => void;
  title?: ReactNode;
  description?: ReactNode;
  titleIcon?: ReactNode;
  titleBadge?: ReactNode;
  hideTopBorder?: boolean;
  optional?: boolean;
  showDueDate?: boolean;
  dueDateReadOnly?: boolean;
  showWorkItems?: boolean;
  showWorkItemsSummary?: boolean;
  showBudgetSummary?: boolean;
  simplifiedMilestoneFields?: boolean;
  advancedIndexes?: readonly number[];
  onAdvancedIndexesChange?: (indexes: number[]) => void;
  readOnly?: boolean;
  expandedIndex?: number | null;
  onExpandedChange?: (index: number | null) => void;
  expandedIndexes?: readonly number[];
  onExpandedIndexesChange?: (indexes: number[]) => void;
  errors?: Record<string, string>;
  fieldHints?: MilestonePlanFieldCopy;
  fieldPlaceholders?: MilestonePlanFieldCopy;
  durationUnits?: readonly MilestoneDurationUnitOption[];
  workItemDurationUnits?: readonly MilestoneDurationUnitOption[];
  uiCopy?: MilestonePlanUiCopy;
  milestoneTitleMaxLength?: number;
  workItemTitleMaxLength?: number;
  durationMaxLength?: number;
  targetBudget?: number | null;
  enableAutoBalance?: boolean;
  baselineMilestones?: EditableMilestonePlan[];
}

const durationToDays = (val?: string | null): number => {
  if (!val) return 0;
  const match = val.trim().match(/^(\d+)\s+(.+)$/u);
  if (!match) return 0;
  const num = parseInt(match[1], 10) || 0;
  const unit = match[2].trim().toLowerCase().replace(/s$/, '');
  if (['day', 'ngày', 'ngay'].includes(unit)) return num;
  if (['week', 'tuần', 'tuan'].includes(unit)) return num * 7;
  if (['month', 'tháng', 'thang'].includes(unit)) return num * 30;
  if (['year', 'năm', 'nam'].includes(unit)) return num * 365;
  return num;
};

const formatDurationDelta = (days: number, uiCopy: MilestonePlanUiCopy): string => {
  const absDays = Math.abs(days);
  const weeksStr = uiCopy.weeksUnit || 'tuần';
  const daysStr = uiCopy.daysUnit || 'ngày';
  if (absDays >= 7 && absDays % 7 === 0) {
    const count = absDays / 7;
    const finalUnit = count === 1 ? weeksStr.replace(/s$/, '') : weeksStr;
    return `${count} ${finalUnit}`;
  }
  const finalUnit = absDays === 1 ? daysStr.replace(/s$/, '') : daysStr;
  return `${absDays} ${finalUnit}`;
};

const normalize = (items: EditableMilestonePlan[]) => items.map((item, orderIndex) => ({
  ...item,
  orderIndex,
  workItems: item.workItems.map((workItem, workIndex) => ({ ...workItem, orderIndex: workIndex })),
}));

const newWorkItem = (orderIndex: number): EditablePlanWorkItem => ({
  title: '', description: '', deliverables: '', estimatedDuration: '', orderIndex,
});

const newMilestone = (orderIndex: number): EditableMilestonePlan => ({
  title: '', description: '', amount: 0, estimatedDuration: '', dueDate: null,
  deliverables: '', acceptanceCriteria: '', orderIndex, workItems: [],
});

const parseStructuredDuration = (
  value: string | null | undefined,
  units: readonly MilestoneDurationUnitOption[],
) => {
  const fallbackUnit = units[0]?.value || '';
  if (!value?.trim()) return { amount: '', unit: fallbackUnit };

  const match = value.trim().match(/^(\d+)\s+(.+)$/u);
  if (!match) return { amount: '', unit: fallbackUnit };

  const rawUnit = match[2].trim().toLowerCase().replace(/s$/, '');
  const normalizedUnitKey =
    ['day', 'ngày', 'ngay'].includes(rawUnit) ? 'days' :
      ['week', 'tuần', 'tuan'].includes(rawUnit) ? 'weeks' :
        ['month', 'tháng', 'thang'].includes(rawUnit) ? 'months' :
          ['year', 'năm', 'nam'].includes(rawUnit) ? 'years' : null;

  const targetKey = normalizedUnitKey || rawUnit;
  const unit = units.find(option =>
    option.value.toLowerCase().replace(/s$/, '') === targetKey.replace(/s$/, '')
    || option.value.toLowerCase() === targetKey
  );
  return unit ? { amount: match[1], unit: unit.value } : { amount: '', unit: fallbackUnit };
};

const serializeStructuredDuration = (amount: string, unit: string) => {
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0 || !unit) return '';

  const singularUnit = unit.replace(/s$/, '');
  return `${numericAmount} ${numericAmount === 1 ? singularUnit : unit}`;
};

export function NestedMilestonePlanEditor({
  value,
  onChange,
  title = 'Milestone and Work Breakdown Structure',
  description = 'Define payable outcomes, then break each outcome into concrete work items.',
  titleIcon,
  titleBadge,
  hideTopBorder = false,
  optional = false,
  showDueDate = false,
  dueDateReadOnly = false,
  showWorkItems = true,
  showWorkItemsSummary = false,
  showBudgetSummary = true,
  simplifiedMilestoneFields = false,
  advancedIndexes = [],
  onAdvancedIndexesChange,
  readOnly = false,
  expandedIndex,
  onExpandedChange,
  expandedIndexes,
  onExpandedIndexesChange,
  errors = {},
  fieldHints = {},
  fieldPlaceholders = {},
  durationUnits,
  workItemDurationUnits,
  uiCopy = {},
  milestoneTitleMaxLength,
  workItemTitleMaxLength,
  durationMaxLength,
  targetBudget = null,
  enableAutoBalance = true,
  baselineMilestones,
}: Props) {
  const editorId = useId();
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());
  const [isAutoBalanceActive, setIsAutoBalanceActive] = useState<boolean>(enableAutoBalance);

  const activeTargetBudget = targetBudget !== undefined && targetBudget !== null && targetBudget > 0 ? targetBudget : null;

  const handleAmountChange = (index: number, newAmount: number) => {
    if (isAutoBalanceActive && activeTargetBudget !== null) {
      const res = recalculateMilestonesBidirectional(
        value,
        index,
        newAmount,
        activeTargetBudget,
        lockedIndices
      );
      setLockedIndices(new Set(res.updatedLockedIndices));
      onChange(res.updatedMilestones);
    } else {
      setLockedIndices(prev => new Set(prev).add(index));
      updateMilestone(index, { amount: Math.max(0, Math.round(newAmount)) });
    }
  };

  const handleToggleLock = (index: number) => {
    setLockedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        if (isAutoBalanceActive && activeTargetBudget !== null && value.length > 0) {
          const remainingLocked = Array.from(next);
          if (remainingLocked.length > 0) {
            const anchor = remainingLocked[0];
            const res = recalculateMilestonesBidirectional(
              value,
              anchor,
              value[anchor].amount,
              activeTargetBudget,
              next
            );
            onChange(res.updatedMilestones);
          } else {
            const res = resetAndEqualizeMilestones(value, activeTargetBudget);
            onChange(res.updatedMilestones);
          }
        }
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleResetBalance = () => {
    const res = resetAndEqualizeMilestones(value, activeTargetBudget);
    setLockedIndices(new Set());
    onChange(res.updatedMilestones);
  };

  const [internalExpanded, setInternalExpanded] = useState<number | null>(value.length ? 0 : null);
  const [internalExpandedIndexes, setInternalExpandedIndexes] = useState<number[]>(value.length ? [0] : []);
  const expanded = expandedIndex === undefined ? internalExpanded : expandedIndex;
  const multipleExpansionEnabled = expandedIndexes !== undefined;
  const openIndexes = expandedIndexes ?? internalExpandedIndexes;
  const setExpanded = (index: number | null) => {
    setInternalExpanded(index);
    onExpandedChange?.(index);
  };
  const setOpenIndexes = (indexes: readonly number[]) => {
    const normalizedIndexes = Array.from(new Set(indexes)).sort((left, right) => left - right);
    setInternalExpandedIndexes(normalizedIndexes);
    onExpandedIndexesChange?.(normalizedIndexes);
  };
  const openMilestone = (index: number) => {
    if (multipleExpansionEnabled) {
      setOpenIndexes([...openIndexes, index]);
      return;
    }
    setExpanded(index);
  };
  const toggleMilestone = (index: number) => {
    if (multipleExpansionEnabled) {
      setOpenIndexes(openIndexes.includes(index)
        ? openIndexes.filter(openIndex => openIndex !== index)
        : [...openIndexes, index]);
      return;
    }
    setExpanded(expanded === index ? null : index);
  };
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex || sourceIndex < 0 || sourceIndex >= value.length) {
      setDraggedIndex(null);
      return;
    }
    const next = [...value];
    const [removed] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, removed);
    onChange(normalize(next));
    setDraggedIndex(null);
  };

  const total = value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/30';
  const hintClass = 'mt-1.5 block text-[11px] font-normal normal-case leading-relaxed text-muted-foreground';
  const describedBy = (id: string, hint?: string) => hint ? `${editorId}-${id}-hint` : undefined;
  const renderHint = (id: string, hint?: string) =>
    hint ? <span id={describedBy(id, hint)} className={hintClass}>{hint}</span> : null;

  const updateMilestone = (index: number, patch: Partial<EditableMilestonePlan>) =>
    onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateWorkItem = (milestoneIndex: number, workIndex: number, patch: Partial<EditablePlanWorkItem>) =>
    updateMilestone(milestoneIndex, {
      workItems: value[milestoneIndex].workItems.map((item, itemIndex) => itemIndex === workIndex ? { ...item, ...patch } : item),
    });
  const deleteMilestone = (index: number) => {
    onChange(normalize(value.filter((_, itemIndex) => itemIndex !== index)));
    onAdvancedIndexesChange?.(advancedIndexes
      .filter(advancedIndex => advancedIndex !== index)
      .map(advancedIndex => advancedIndex > index ? advancedIndex - 1 : advancedIndex));
    if (multipleExpansionEnabled) {
      setOpenIndexes(openIndexes
        .filter(openIndex => openIndex !== index)
        .map(openIndex => openIndex > index ? openIndex - 1 : openIndex));
    }
  };

  const toggleAdvanced = (index: number) => {
    const next = advancedIndexes.includes(index)
      ? advancedIndexes.filter(i => i !== index)
      : [...advancedIndexes, index].sort((left, right) => left - right);
    onAdvancedIndexesChange?.(next);
  };

  const isAllExpanded = value.length > 0 && openIndexes.length === value.length;
  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setOpenIndexes([]);
    } else {
      setOpenIndexes(value.map((_, i) => i));
    }
  };

  return (
    <section className={`min-w-0 max-w-full space-y-4 sm:space-y-5 ${hideTopBorder ? '' : 'border-t border-border/80 pt-5 sm:pt-7'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {titleIcon}
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground">{title}</h2>
            {titleBadge}
            {optional && (
              <span className="rounded-full bg-muted/60 px-2.5 sm:px-3 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground border border-border/60">
                {uiCopy.optional || 'Optional'}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 sm:mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {value.length > 1 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-1 sm:flex-initial cursor-pointer"
            >
              <ChevronsUpDown size={14} />
              <span>{isAllExpanded ? (uiCopy.collapseAll || 'Thu gọn tất cả') : (uiCopy.expandAll || 'Mở rộng tất cả')}</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => { onChange([...value, newMilestone(value.length)]); openMilestone(value.length); }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-[var(--brand)]/90 hover:shadow-lg transition-all active:scale-95 flex-1 sm:flex-initial shrink-0 cursor-pointer"
            >
              <Plus size={15} /> {uiCopy.addMilestone || 'Thêm Milestone'}
            </button>
          )}
        </div>
      </div>

      {showBudgetSummary && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--brand)_25%,var(--border))] bg-[color-mix(in_srgb,var(--brand)_5%,var(--card))] p-3.5 sm:p-4.5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center shadow-sm shrink-0">
                <Coins size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-foreground block truncate">
                  {uiCopy.fixedProjectBudget || 'Tổng ngân sách kế hoạch (Sum of Milestones)'}
                </span>
                {renderHint('fixed-project-budget', fieldHints.fixedProjectBudget)}
                <span className="text-[11px] text-muted-foreground font-medium block truncate">
                  {uiCopy.milestoneSummaryDesc || 'Tự động cộng từ tất cả các mốc công việc bên dưới'}
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
              <strong className="inline-flex items-center gap-1.5 text-xl sm:text-2xl font-black text-[var(--brand)] tracking-tight">
                <span>{formatGigCoinNumber(total)}</span>
                <GCoinIcon size={18} />
                <span>G-coin</span>
              </strong>
              {total > 0 && (
                <small className="text-xs font-bold text-muted-foreground block mt-0.5">
                  ≈ {formatGigCoinToVnd(total)}
                </small>
              )}
            </div>
          </div>

          {/* Visual Milestone Budget Segment Bar */}
          {value.length > 1 && total > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Percent size={11} className="text-[var(--brand)]" />
                  <span>Phân bổ ngân sách theo từng mốc:</span>
                </span>
                <span>{value.length} mốc</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 gap-0.5">
                {value.map((m, idx) => {
                  const pct = total > 0 ? ((Number(m.amount) || 0) / total) * 100 : 0;
                  if (pct <= 0) return null;
                  const colors = [
                    'bg-[var(--brand)]',
                    'bg-cyan-500',
                    'bg-purple-500',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-indigo-500',
                  ];
                  const colorClass = colors[idx % colors.length];
                  return (
                    <div
                      key={idx}
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                      title={`Mốc ${idx + 1}: ${formatGigCoinNumber(Number(m.amount) || 0)} G-coin (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {activeTargetBudget !== null && !readOnly && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-border/50 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setIsAutoBalanceActive(!isAutoBalanceActive)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs w-full sm:w-auto shrink-0 ${isAutoBalanceActive
                      ? 'bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90 border border-transparent'
                      : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                    }`}
                >
                  <span>
                    {isAutoBalanceActive
                      ? (uiCopy.autoBalanceOn || 'Cân bằng tự động: BẬT')
                      : (uiCopy.autoBalanceOff || 'Cân bằng tự động: TẮT')}
                  </span>
                </button>
                <span className="text-[11px] text-muted-foreground font-medium hidden md:inline truncate">
                  {isAutoBalanceActive
                    ? (uiCopy.autoBalanceOnDesc || 'Thay đổi mốc sẽ tự động cân bằng các mốc chưa cố định.')
                    : (uiCopy.autoBalanceOffDesc || 'Tự động cân bằng đang tắt. Giữ nguyên giá trị nhập.')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetBalance}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-card border border-border text-foreground hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-xs transition-all cursor-pointer w-full sm:w-auto shrink-0 whitespace-nowrap"
                title={uiCopy.resetBalanceTooltip || 'Xóa tất cả mốc cố định và chia đều tổng ngân sách'}
              >
                <RotateCcw size={13} />
                <span>{uiCopy.resetBalance || 'Chia đều lại ngân sách'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {value.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 sm:p-10 text-center bg-card/40">
          <div className="w-12 h-12 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center mx-auto mb-3">
            <Coins size={22} />
          </div>
          <p className="text-base font-bold text-foreground">{uiCopy.noBaselinePlan || 'Chưa có kế hoạch milestone'}</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">{uiCopy.noBaselinePlanDescription || 'Tạo các mốc chia nhỏ dự án giúp việc nghiệm thu và thanh toán an toàn, minh bạch.'}</p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => { onChange([newMilestone(0)]); openMilestone(0); }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[var(--brand)]/90 transition-all"
            >
              <Plus size={16} /> {uiCopy.addFirstMilestone || 'Thêm mốc đầu tiên'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-3.5">
          {value.map((milestone, index) => {
            const isExpanded = multipleExpansionEnabled ? openIndexes.includes(index) : expanded === index;
            const isAdvancedOpen = advancedIndexes.includes(index);
            const structuredDuration = durationUnits
              ? parseStructuredDuration(milestone.estimatedDuration, durationUnits)
              : null;
            const errorFor = (field: string) => errors[`${index}.${field}`];
            const fieldClass = (field: string) => `${inputClass} ${errorFor(field) ? 'border-red-500 focus:ring-red-500' : ''}`;
            const milestonePct = total > 0 && Number(milestone.amount) > 0 ? Math.round(((Number(milestone.amount) || 0) / total) * 100) : 0;

            const baselineMilestone = baselineMilestones?.[index] ?? null;
            const currentAmount = Number(milestone.amount) || 0;
            const baselineAmount = Number(baselineMilestone?.amount) || 0;
            const amountDelta = baselineMilestone && (currentAmount > 0 || baselineAmount > 0) ? currentAmount - baselineAmount : null;

            const currentDays = durationToDays(milestone.estimatedDuration);
            const baselineDays = durationToDays(baselineMilestone?.estimatedDuration);
            const daysDelta = baselineMilestone && baselineDays > 0 && currentDays > 0 ? currentDays - baselineDays : null;

            return (
              <article
                key={milestone.id || index}
                onDragOver={readOnly ? undefined : handleDragOver}
                onDrop={readOnly ? undefined : (e) => handleDrop(e, index)}
                className={`relative min-w-0 max-w-full rounded-2xl border bg-card shadow-xs transition-all hover:shadow-md focus-within:z-20 ${draggedIndex === index ? 'opacity-50 border-brand border-dashed' : ''
                  } ${Object.keys(errors).some(key => key.startsWith(`${index}.`)) ? 'border-red-500/80 ring-2 ring-red-500/10' : 'border-border/80'}`}
              >
                {/* 2-TIER ERGONOMIC HEADER */}
                <div className="p-3 sm:p-4 transition-colors">
                  {/* TOP ROW: Badge + Title + Action Buttons */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleMilestone(index)}
                      aria-expanded={isExpanded}
                      className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                    >
                      <span className="flex h-6 sm:h-7 px-2 sm:px-2.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[var(--brand)] to-[#6366f1] text-white text-[10.5px] sm:text-xs font-black shadow-2xs">
                        {uiCopy.milestoneLabel
                          ? uiCopy.milestoneLabel.replace('{{number}}', String(index + 1))
                          : `Mốc ${index + 1}`}
                      </span>
                      <strong className="block min-w-0 truncate text-xs sm:text-sm font-extrabold text-foreground group-hover:text-[var(--brand)] transition-colors">
                        {milestone.title?.trim() || `${uiCopy.untitledMilestone || 'Mốc chưa đặt tên'} ${index + 1}`}
                      </strong>
                    </button>

                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {!readOnly && (
                        <>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-muted-foreground hover:text-[var(--brand)] hover:bg-muted transition-colors hidden sm:block"
                            title={uiCopy.dragToReorder || 'Kéo để sắp xếp lại mốc'}
                          >
                            <GripVertical size={16} />
                          </div>
                          <button
                            type="button"
                            title={uiCopy.deleteMilestone || 'Xóa mốc'}
                            onClick={() => deleteMilestone(index)}
                            className="rounded-lg p-1.5 sm:p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleMilestone(index)}
                        aria-label={isExpanded ? (uiCopy.collapseMilestone || 'Thu gọn mốc') : (uiCopy.expandMilestone || 'Mở rộng mốc')}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[var(--brand)]' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* SUB ROW: Metadata Pills */}
                  <div
                    onClick={() => toggleMilestone(index)}
                    className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-border/40 text-[11px] font-medium cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1 font-black text-[var(--brand)] bg-[var(--brand)]/10 dark:bg-[var(--brand)]/20 px-2 py-0.5 rounded-md">
                      <span>{formatGigCoinNumber(Number(milestone.amount) || 0)}</span>
                      <GCoinIcon size={12} />
                      <span>G-coin</span>
                    </span>

                    {/* Amount Comparison Delta Pill (Only when difference exists) */}
                    {amountDelta !== null && amountDelta !== 0 && baselineMilestone && (
                      amountDelta > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-2xs"
                          title={uiCopy.diffHigherAmountTitle?.replace('{{amount}}', formatGigCoinNumber(amountDelta)) || `Cao hơn gốc +${formatGigCoinNumber(amountDelta)} G-coin`}
                        >
                          <TrendingUp size={10} className="stroke-[2.5]" />
                          <span>+{formatGigCoinNumber(amountDelta)} G</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs"
                          title={uiCopy.diffLowerAmountTitle?.replace('{{amount}}', formatGigCoinNumber(amountDelta)) || `Thấp hơn gốc ${formatGigCoinNumber(amountDelta)} G-coin`}
                        >
                          <TrendingDown size={10} className="stroke-[2.5]" />
                          <span>{formatGigCoinNumber(amountDelta)} G</span>
                        </span>
                      )
                    )}

                    {milestonePct > 0 && (
                      <span className="inline-flex items-center gap-1 font-bold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md text-[10.5px]">
                        <span>{milestonePct}% {uiCopy.budgetShort || 'NS'}</span>
                      </span>
                    )}

                    {milestone.estimatedDuration && (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px]">
                        <Clock3 size={11} className="text-muted-foreground shrink-0" />
                        <span>{milestone.estimatedDuration}</span>
                      </span>
                    )}

                    {/* Duration Comparison Delta Pill (Only when difference exists) */}
                    {daysDelta !== null && daysDelta !== 0 && baselineMilestone && (
                      daysDelta > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-2xs"
                          title={uiCopy.diffLongerDurationTitle?.replace('{{duration}}', formatDurationDelta(daysDelta, uiCopy)) || `Dài hơn gốc +${daysDelta} ngày`}
                        >
                          <TrendingUp size={10} className="stroke-[2.5]" />
                          <span>+{daysDelta >= 7 && daysDelta % 7 === 0 ? `${daysDelta / 7}w` : `${daysDelta}d`}</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs"
                          title={uiCopy.diffShorterDurationTitle?.replace('{{duration}}', formatDurationDelta(daysDelta, uiCopy)) || `Ngắn hơn gốc ${Math.abs(daysDelta)} ngày`}
                        >
                          <TrendingDown size={10} className="stroke-[2.5]" />
                          <span>{daysDelta <= -7 && daysDelta % 7 === 0 ? `${daysDelta / 7}w` : `${daysDelta}d`}</span>
                        </span>
                      )
                    )}

                    {milestone.dueDate && (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px]">
                        <Calendar size={11} className="text-muted-foreground shrink-0" />
                        <span>{milestone.dueDate}</span>
                      </span>
                    )}

                    {!readOnly && activeTargetBudget !== null && (
                      lockedIndices.has(index) ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-md ml-auto shadow-2xs">
                          <Lock size={10} />
                          <span>{uiCopy.userLocked || 'Cố định'}</span>
                        </span>
                      ) : isAutoBalanceActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-md ml-auto shadow-2xs">
                          <Zap size={10} />
                          <span>{uiCopy.autoBalanced || 'Tự động'}</span>
                        </span>
                      ) : null
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4 border-t border-border bg-background/40 p-3.5 sm:p-5">
                    {/* Milestone Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                        <span>{uiCopy.milestoneTitle || 'Tiêu đề Milestone'} *</span>
                        {milestoneTitleMaxLength && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {(milestone.title || '').length}/{milestoneTitleMaxLength}
                          </span>
                        )}
                      </label>
                      <AutoGrowTextarea
                        data-milestone-field={`${index}.title`}
                        disabled={readOnly}
                        maxLength={milestoneTitleMaxLength}
                        value={milestone.title || ''}
                        onChange={e => updateMilestone(index, { title: e.target.value })}
                        placeholder={fieldPlaceholders.milestoneTitle || 'Ví dụ: Mốc 1 - Giao diện UI/UX & Prototype'}
                        aria-describedby={describedBy(`${index}-title`, fieldHints.milestoneTitle)}
                        className={`${fieldClass('title')} min-h-10 min-w-0 max-w-full resize-none overflow-hidden whitespace-pre-wrap break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere]`}
                      />
                      {renderHint(`${index}-title`, fieldHints.milestoneTitle)}
                      {errorFor('title') && <span className="mt-1 block text-xs text-red-500 font-medium">{errorFor('title')}</span>}
                    </div>

                    {/* Core Parameters Box: Amount, Duration, Deadline */}
                    <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4.5 space-y-3">
                      <div className={`grid gap-3 sm:gap-4 items-start ${simplifiedMilestoneFields && showDueDate && !dueDateReadOnly
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        }`}>
                        {/* 1. AMOUNT */}
                        <div className="space-y-1.5 relative focus-within:z-20">
                          <div className="flex items-center justify-between gap-1">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Coins size={14} className="text-[var(--brand)] flex-shrink-0" />
                              <span>{uiCopy.amount || 'Ngân sách mốc'} *</span>
                            </label>
                            {!readOnly && activeTargetBudget !== null && (
                              lockedIndices.has(index) ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleLock(index)}
                                  title={uiCopy.userLockedTitle || 'Mốc đang cố định (User-locked). Nhấp để mở khóa tự động cân bằng.'}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 px-2 py-0.5 rounded-md transition-colors cursor-pointer shadow-xs"
                                >
                                  <Lock size={10} />
                                  <span>{uiCopy.userLocked || 'Cố định (Khóa)'}</span>
                                </button>
                              ) : isAutoBalanceActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleLock(index)}
                                  title={uiCopy.autoBalancedTitle || 'Mốc đang tự động cân bằng. Nhấp để khóa cố định.'}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 px-2 py-0.5 rounded-md transition-colors cursor-pointer shadow-xs"
                                >
                                  <Zap size={10} />
                                  <span>{uiCopy.autoBalanced || 'Tự động (Mở)'}</span>
                                </button>
                              ) : null
                            )}
                          </div>
                          <div className="relative flex items-center h-11 rounded-xl border border-border/80 bg-background px-3 focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/15 transition-all">
                            <input
                              data-milestone-field={`${index}.amount`}
                              disabled={readOnly}
                              type="number"
                              min="0"
                              step="1"
                              value={milestone.amount || ''}
                              onChange={e => handleAmountChange(index, Number(e.target.value) || 0)}
                              placeholder={fieldPlaceholders.amount || '0'}
                              aria-describedby={describedBy(`${index}-amount`, fieldHints.amount)}
                              className="w-full border-none bg-transparent outline-none font-black text-sm text-foreground focus:outline-none focus:ring-0 p-0"
                            />
                            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-black text-[var(--brand)] bg-[var(--brand)]/10 px-2.5 py-1 rounded-lg">
                              <GCoinIcon size={13} />
                              <span>G-coin</span>
                            </span>
                          </div>
                          
                          {/* Sub row below Amount input */}
                          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-0.5 gap-1">
                            <div className="flex items-center gap-1.5">
                              {Number(milestone.amount) > 0 && (
                                <span className="font-bold text-[var(--brand)]">
                                  ≈ {formatGigCoinToVnd(Number(milestone.amount))}
                                </span>
                              )}
                              {milestonePct > 0 && (
                                <span className="font-semibold text-muted-foreground">
                                  • {uiCopy.percentOfBudget
                                    ? uiCopy.percentOfBudget.replace('{{percent}}', String(milestonePct))
                                    : `${milestonePct}% tổng ngân sách`}
                                </span>
                              )}
                            </div>

                            {/* Amount Comparison Delta Badge (Below Field) */}
                            {amountDelta !== null && baselineMilestone && (
                              amountDelta > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                  <TrendingUp size={11} className="stroke-[2.5]" />
                                  <span>{uiCopy.diffHigherAmount?.replace('{{amount}}', formatGigCoinNumber(amountDelta)) || `+${formatGigCoinNumber(amountDelta)} G so với gốc`}</span>
                                </span>
                              ) : amountDelta < 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                  <TrendingDown size={11} className="stroke-[2.5]" />
                                  <span>{uiCopy.diffLowerAmount?.replace('{{amount}}', formatGigCoinNumber(amountDelta)) || `${formatGigCoinNumber(amountDelta)} G so với gốc`}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                  <Check size={11} className="stroke-[2.5]" />
                                  <span>{uiCopy.diffEqualAmount || 'Khớp mốc gốc'}</span>
                                </span>
                              )
                            )}
                          </div>
                          {errorFor('amount') && <span className="block text-xs text-red-500 font-medium">{errorFor('amount')}</span>}
                        </div>

                    {/* 2. DURATION */}
                    {(!simplifiedMilestoneFields || dueDateReadOnly) && (
                      <div className="space-y-1.5 relative focus-within:z-20">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Clock3 size={14} className="text-[var(--brand)] flex-shrink-0" />
                          <span>{uiCopy.duration || 'Thời gian mốc'}</span>
                        </label>
                        {structuredDuration && durationUnits ? (
                          <>
                            <div className="flex items-center h-11 rounded-xl border border-border/80 bg-background p-1 focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/15 transition-all gap-1">
                              <input
                                data-milestone-field={`${index}.estimatedDuration`}
                                disabled={readOnly}
                                type="number"
                                min="1"
                                step="1"
                                value={structuredDuration.amount}
                                onChange={e => updateMilestone(index, { estimatedDuration: serializeStructuredDuration(e.target.value, structuredDuration.unit) })}
                                placeholder={fieldPlaceholders.duration || '2'}
                                aria-label="Duration amount"
                                className="w-full border-none bg-transparent px-2.5 text-sm font-bold text-foreground outline-none shadow-none focus:outline-none focus:ring-0 p-0"
                              />
                              <div className="w-20 shrink-0">
                                <CustomSelect
                                  disabled={readOnly}
                                  value={structuredDuration.unit}
                                  options={durationUnits.map(unit => ({ value: unit.value, label: unit.label }))}
                                  onChange={newUnit => updateMilestone(index, { estimatedDuration: serializeStructuredDuration(structuredDuration.amount, newUnit) })}
                                  ariaLabel={uiCopy.durationUnit || 'Duration unit'}
                                  searchable={false}
                                  placeholder={uiCopy.durationUnit || 'Đơn vị'}
                                  variant="compact"
                                  className="cs-compact"
                                  popoverAlign="right"
                                  popoverMinWidth={84}
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <input
                            data-milestone-field={`${index}.estimatedDuration`}
                            disabled={readOnly}
                            maxLength={durationMaxLength}
                            value={milestone.estimatedDuration || ''}
                            onChange={e => updateMilestone(index, { estimatedDuration: e.target.value })}
                            placeholder={fieldPlaceholders.duration || 'Ví dụ: 2 tuần'}
                            className={`${fieldClass('estimatedDuration')} h-11 text-sm font-semibold`}
                          />
                        )}
                        <div className="text-[11px] text-muted-foreground leading-snug pt-0.5">
                          <span>{fieldHints.duration || renderHint(`${index}-duration`, fieldHints.duration) || 'Thời gian dự kiến hoàn thành mốc.'}</span>
                        </div>

                        {/* Duration Comparison Delta Badge (Below Hint Description) */}
                        {daysDelta !== null && baselineMilestone && (
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                            {daysDelta > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                <TrendingUp size={11} className="stroke-[2.5]" />
                                <span>{uiCopy.diffLongerDuration?.replace('{{duration}}', formatDurationDelta(daysDelta, uiCopy)) || `Dài hơn (+${formatDurationDelta(daysDelta, uiCopy)} so với gốc)`}</span>
                              </span>
                            ) : daysDelta < 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                <TrendingDown size={11} className="stroke-[2.5]" />
                                <span>{uiCopy.diffShorterDuration?.replace('{{duration}}', formatDurationDelta(daysDelta, uiCopy)) || `Ngắn hơn (${formatDurationDelta(daysDelta, uiCopy)} so với gốc)`}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                <Check size={11} className="stroke-[2.5]" />
                                <span>{uiCopy.diffEqualDuration || 'Khớp thời gian gốc'}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {errorFor('estimatedDuration') && <span className="block text-xs text-red-500 font-medium">{errorFor('estimatedDuration')}</span>}
                      </div>
                    )}

                    {/* 3. DEADLINE / DUE DATE */}
                    {showDueDate && (
                      <div className="space-y-1.5 relative focus-within:z-20">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Calendar size={14} className="text-[var(--brand)] flex-shrink-0" />
                          <span>{uiCopy.deadline || 'Hạn chót mốc'}</span>
                        </label>
                        <input
                          data-milestone-field={`${index}.dueDate`}
                          disabled={readOnly || dueDateReadOnly}
                          type="date"
                          value={milestone.dueDate || ''}
                          onChange={dueDateReadOnly ? undefined : e => updateMilestone(index, { dueDate: e.target.value || null })}
                          aria-describedby={describedBy(`${index}-deadline`, fieldHints.deadline)}
                          className={`${fieldClass('dueDate')} h-11 text-sm font-semibold`}
                        />
                        <div className="text-[11px] text-muted-foreground leading-snug pt-0.5">
                          <span>{fieldHints.deadline || renderHint(`${index}-deadline`, fieldHints.deadline) || 'Ngày cuối cùng freelancer phải nộp sản phẩm.'}</span>
                        </div>
                        {errorFor('dueDate') && <span className="block text-xs text-red-500 font-medium">{errorFor('dueDate')}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description, Deliverables & Acceptance Criteria */}
                <div className={`grid gap-3 pt-1 ${simplifiedMilestoneFields ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
                  }`}>
                  {!simplifiedMilestoneFields && (
                    <label className="text-xs font-bold text-foreground md:col-span-2">
                      {uiCopy.description || 'Mô tả mốc công việc'}
                      <textarea
                        disabled={readOnly}
                        value={milestone.description || ''}
                        onChange={e => updateMilestone(index, { description: e.target.value })}
                        placeholder={fieldPlaceholders.description || 'Mô tả chi tiết mục tiêu của giai đoạn này...'}
                        aria-describedby={describedBy(`${index}-description`, fieldHints.description)}
                        rows={2}
                        className={`${inputClass} mt-1 font-normal`}
                      />
                      {renderHint(`${index}-description`, fieldHints.description)}
                    </label>
                  )}
                  <label className="text-xs font-bold text-foreground">
                    {uiCopy.deliverables || 'Sản phẩm bàn giao (Deliverables)'} *
                    <textarea
                      data-milestone-field={`${index}.deliverables`}
                      disabled={readOnly}
                      value={milestone.deliverables || ''}
                      onChange={e => updateMilestone(index, { deliverables: e.target.value })}
                      placeholder={fieldPlaceholders.deliverables || 'Các file, tài liệu hoặc sản phẩm cụ thể freelancer phải gửi...'}
                      aria-describedby={describedBy(`${index}-deliverables`, fieldHints.deliverables)}
                      rows={3}
                      className={`${fieldClass('deliverables')} mt-1 font-normal`}
                    />
                    {renderHint(`${index}-deliverables`, fieldHints.deliverables)}
                    {errorFor('deliverables') && <span className="mt-1 block text-xs text-red-500 font-medium">{errorFor('deliverables')}</span>}
                  </label>
                  {!simplifiedMilestoneFields && (
                    <label className="text-xs font-bold text-foreground">
                      {uiCopy.acceptanceCriteria || 'Tiêu chuẩn nghiệm thu (Acceptance Criteria)'}
                      <textarea
                        data-milestone-field={`${index}.acceptanceCriteria`}
                        disabled={readOnly}
                        value={milestone.acceptanceCriteria || ''}
                        onChange={e => updateMilestone(index, { acceptanceCriteria: e.target.value })}
                        placeholder={fieldPlaceholders.acceptanceCriteria || 'Điều kiện để mốc công việc này được chấp nhận và giải ngân...'}
                        aria-describedby={describedBy(`${index}-acceptance-criteria`, fieldHints.acceptanceCriteria)}
                        rows={3}
                        className={`${fieldClass('acceptanceCriteria')} mt-1 font-normal`}
                      />
                      {renderHint(`${index}-acceptance-criteria`, fieldHints.acceptanceCriteria)}
                      {errorFor('acceptanceCriteria') && <span className="mt-1 block text-xs text-red-500 font-medium">{errorFor('acceptanceCriteria')}</span>}
                    </label>
                  )}
                </div>

                {simplifiedMilestoneFields && <button type="button" aria-expanded={isAdvancedOpen} onClick={() => toggleAdvanced(index)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                  <ChevronRight size={15} className={`transition-transform ${isAdvancedOpen ? 'rotate-90' : ''}`} />
                  {uiCopy.advancedDetails || 'Advanced details'}
                </button>}

                {simplifiedMilestoneFields && isAdvancedOpen && <label className="block text-xs font-semibold">{uiCopy.acceptanceCriteria || 'Acceptance criteria'}<textarea data-milestone-field={`${index}.acceptanceCriteria`} disabled={readOnly} value={milestone.acceptanceCriteria || ''} onChange={e => updateMilestone(index, { acceptanceCriteria: e.target.value })} placeholder={fieldPlaceholders.acceptanceCriteria} aria-describedby={describedBy(`${index}-acceptance-criteria`, fieldHints.acceptanceCriteria)} rows={3} className={`${fieldClass('acceptanceCriteria')} mt-1`} />{renderHint(`${index}-acceptance-criteria`, fieldHints.acceptanceCriteria)}{errorFor('acceptanceCriteria') && <span className="mt-1 block text-xs text-red-500">{errorFor('acceptanceCriteria')}</span>}</label>}

                {showWorkItems && (!simplifiedMilestoneFields || isAdvancedOpen) ? <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold">{uiCopy.workBreakdown || 'Work Breakdown Structure'}</h3>{renderHint(`${index}-work-breakdown`, fieldHints.workBreakdown)}</div>{!readOnly && <button type="button" onClick={() => updateMilestone(index, { workItems: [...milestone.workItems, newWorkItem(milestone.workItems.length)] })} className="inline-flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold"><Plus size={13} /> {uiCopy.addWorkItem || 'Add work item'}</button>}</div>
                  {milestone.workItems.map((workItem, workIndex) => {
                    const workItemErrorFor = (field: string) => errors[`${index}.workItems.${workIndex}.${field}`];
                    const workItemFieldClass = (field: string) => `${inputClass} mt-1 ${workItemErrorFor(field) ? 'border-red-500 focus:ring-red-500' : ''}`;
                    const effectiveWorkItemDurationUnits = workItemDurationUnits || durationUnits;
                    const structuredWorkItemDuration = effectiveWorkItemDurationUnits
                      ? parseStructuredDuration(workItem.estimatedDuration, effectiveWorkItemDurationUnits)
                      : null;
                    return <div key={workItem.id || workIndex} className={`grid gap-2 rounded-lg border p-3 md:grid-cols-2 ${workItemErrorFor('title') || workItemErrorFor('description') ? 'border-red-500/60' : 'border-border'}`}>
                      <div className="flex items-center justify-between md:col-span-2"><strong className="text-xs">{uiCopy.workItem || 'Work item'} {workIndex + 1}</strong>{!readOnly && <button type="button" title={uiCopy.deleteWorkItem || 'Delete work item'} onClick={() => updateMilestone(index, { workItems: milestone.workItems.filter((_, itemIndex) => itemIndex !== workIndex).map((item, orderIndex) => ({ ...item, orderIndex })) })} className="p-1 text-red-500"><Trash2 size={13} /></button>}</div>
                      <label className="text-xs font-semibold">{uiCopy.workItemTitle || 'Work item title'}<input data-work-item-field={`${index}.${workIndex}.title`} disabled={readOnly} maxLength={workItemTitleMaxLength} value={workItem.title || ''} onChange={e => updateWorkItem(index, workIndex, { title: e.target.value })} placeholder={fieldPlaceholders.workItemTitle || 'Work item title'} aria-label={uiCopy.workItemTitle ? `${uiCopy.workItem || 'Work item'} ${workIndex + 1}: ${uiCopy.workItemTitle}` : `Work item ${workIndex + 1} title`} aria-describedby={describedBy(`${index}-${workIndex}-work-title`, fieldHints.workItemTitle)} className={workItemFieldClass('title')} />{renderHint(`${index}-${workIndex}-work-title`, fieldHints.workItemTitle)}{workItemErrorFor('title') && <span className="mt-1 block text-xs text-red-500">{workItemErrorFor('title')}</span>}</label>
                      <label className="text-xs font-semibold">{uiCopy.estimatedDuration || 'Estimated duration'}
                        {structuredWorkItemDuration && effectiveWorkItemDurationUnits ? (
                          <div data-work-item-field={`${index}.${workIndex}.estimatedDuration`} className={`mt-1 flex items-center gap-1 rounded-lg border bg-background p-1 ${workItemErrorFor('estimatedDuration') ? 'border-red-500' : 'border-border'}`}>
                            <input
                              disabled={readOnly}
                              type="number"
                              min="1"
                              step="1"
                              value={structuredWorkItemDuration.amount}
                              onChange={e => updateWorkItem(index, workIndex, { estimatedDuration: serializeStructuredDuration(e.target.value, structuredWorkItemDuration.unit) })}
                              placeholder={fieldPlaceholders.workItemDuration || '2'}
                              aria-label={uiCopy.estimatedDuration || 'Estimated duration amount'}
                              className="w-full min-w-0 border-none bg-transparent px-1 text-sm font-semibold text-foreground outline-none focus:outline-none focus:ring-0"
                            />
                            <div className="w-20 shrink-0">
                              <CustomSelect
                                disabled={readOnly}
                                value={structuredWorkItemDuration.unit}
                                options={effectiveWorkItemDurationUnits.map(unit => ({ value: unit.value, label: unit.label }))}
                                onChange={newUnit => updateWorkItem(index, workIndex, { estimatedDuration: serializeStructuredDuration(structuredWorkItemDuration.amount, newUnit) })}
                                ariaLabel={uiCopy.durationUnit || 'Duration unit'}
                                searchable={false}
                                placeholder={uiCopy.durationUnit || 'Unit'}
                                variant="compact"
                                className="cs-compact"
                                popoverAlign="right"
                                popoverMinWidth={84}
                              />
                            </div>
                          </div>
                        ) : (
                          <input disabled={readOnly} maxLength={durationMaxLength} value={workItem.estimatedDuration || ''} onChange={e => updateWorkItem(index, workIndex, { estimatedDuration: e.target.value })} placeholder={fieldPlaceholders.workItemDuration || 'Estimated duration'} aria-describedby={describedBy(`${index}-${workIndex}-work-duration`, fieldHints.workItemDuration)} className={`${inputClass} mt-1`} />
                        )}
                        {renderHint(`${index}-${workIndex}-work-duration`, fieldHints.workItemDuration)}
                        {workItemErrorFor('estimatedDuration') && <span className="mt-1 block text-xs text-red-500">{workItemErrorFor('estimatedDuration')}</span>}
                      </label>
                      <label className="text-xs font-semibold">{uiCopy.taskDescription || 'Task description'}<textarea data-work-item-field={`${index}.${workIndex}.description`} disabled={readOnly} value={workItem.description || ''} onChange={e => updateWorkItem(index, workIndex, { description: e.target.value })} placeholder={fieldPlaceholders.workItemDescription || 'Task description'} aria-label={uiCopy.taskDescription ? `${uiCopy.workItem || 'Work item'} ${workIndex + 1}: ${uiCopy.taskDescription}` : `Work item ${workIndex + 1} description`} aria-describedby={describedBy(`${index}-${workIndex}-work-description`, fieldHints.workItemDescription)} rows={2} className={workItemFieldClass('description')} />{renderHint(`${index}-${workIndex}-work-description`, fieldHints.workItemDescription)}{workItemErrorFor('description') && <span className="mt-1 block text-xs text-red-500">{workItemErrorFor('description')}</span>}</label>
                      <label className="text-xs font-semibold">{uiCopy.workItemDeliverables || 'Work item deliverables'}<textarea disabled={readOnly} value={workItem.deliverables || ''} onChange={e => updateWorkItem(index, workIndex, { deliverables: e.target.value })} placeholder={fieldPlaceholders.workItemDeliverables || 'Work item deliverables'} aria-describedby={describedBy(`${index}-${workIndex}-work-deliverables`, fieldHints.workItemDeliverables)} rows={2} className={`${inputClass} mt-1`} />{renderHint(`${index}-${workIndex}-work-deliverables`, fieldHints.workItemDeliverables)}</label>
                    </div>;
                  })}
                  {milestone.workItems.length > 0 && (() => {
                    const summary = computeWorkItemDurationSummary(milestone);
                    if (!showWorkItemsSummary && summary.overageDays <= 0) return null;
                    return (
                      <div className={`mt-1 rounded-lg border p-3 text-xs ${summary.overageDays > 0 ? 'border-red-500/80 bg-red-500/10 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-medium' : 'border-border bg-muted/30 text-muted-foreground'}`}>
                        <ul className="space-y-1 font-mono">
                          {milestone.workItems.map((workItem, workIndex) => (
                            <li key={workItem.id || workIndex} className="flex items-baseline gap-1.5">
                              <span>{workIndex === milestone.workItems.length - 1 ? '└──' : '├──'}</span>
                              <span className="min-w-0 flex-1 truncate">{workItem.title || uiCopy.workItem || 'Work item'}</span>
                              <span className="shrink-0">{workItem.estimatedDuration || '—'}</span>
                            </li>
                          ))}
                        </ul>
                        <div className={`mt-2 flex flex-wrap items-center justify-between gap-x-3 border-t pt-2 font-semibold ${summary.overageDays > 0 ? 'border-red-500/30 text-red-600 dark:text-red-400' : 'border-border text-foreground'}`}>
                          <span>{uiCopy.workItemsTotalLabel || 'Total'}: {summary.totalWorkItemDays} / {summary.milestoneDays} days</span>
                          <span>{uiCopy.workItemsRemainingLabel || 'Remaining'}: {summary.remainingDays} day(s)</span>
                        </div>
                        {summary.overageDays > 0 && (
                          <p className="mt-1.5 font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                            <span>⚠</span>
                            <span>{(uiCopy.workItemsOverageLabel || 'Work items exceed milestone duration by {{days}} day(s).').replace('{{days}}', String(summary.overageDays))}</span>
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div> : null}
              </div>
            )}
          </article>
        );
      })}
      {!readOnly && (
        <button
          type="button"
          onClick={() => { onChange([...value, newMilestone(value.length)]); openMilestone(value.length); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3.5 text-xs font-extrabold text-muted-foreground hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand)]/5 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
        >
          <Plus size={16} /> {uiCopy.addMilestone || 'Thêm Milestone Mới'}
        </button>
      )}
    </div>
  )}
</section>
  );
}
