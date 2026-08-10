import { useId, useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { formatGigCoin, formatGigCoinToVnd } from '../utils/gigcoin';

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
}

export interface MilestoneDurationUnitOption {
  value: string;
  label: string;
}

interface Props {
  value: EditableMilestonePlan[];
  onChange: (value: EditableMilestonePlan[]) => void;
  title?: string;
  description?: string;
  optional?: boolean;
  showDueDate?: boolean;
  showWorkItems?: boolean;
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
  uiCopy?: MilestonePlanUiCopy;
  milestoneTitleMaxLength?: number;
  workItemTitleMaxLength?: number;
  durationMaxLength?: number;
}

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
  optional = false,
  showDueDate = false,
  showWorkItems = true,
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
  uiCopy = {},
  milestoneTitleMaxLength,
  workItemTitleMaxLength,
  durationMaxLength,
}: Props) {
  const editorId = useId();
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
      ? advancedIndexes.filter(advancedIndex => advancedIndex !== index)
      : [...advancedIndexes, index].sort((left, right) => left - right);
    onAdvancedIndexesChange?.(next);
  };

  return (
    <section className="space-y-4 border-t border-border pt-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {optional && <span className="rounded bg-muted px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">{uiCopy.optional || 'Optional'}</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {!readOnly && <button type="button" onClick={() => { onChange([...value, newMilestone(value.length)]); openMilestone(value.length); }} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><Plus size={16} /> {uiCopy.addMilestone || 'Add milestone'}</button>}
      </div>

      {showBudgetSummary && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <span className="text-xs font-bold uppercase text-muted-foreground">
          {uiCopy.fixedProjectBudget || 'Fixed project budget from milestones'}
          {renderHint('fixed-project-budget', fieldHints.fixedProjectBudget)}
        </span>
        <div className="text-right">
          <strong className="block text-xl text-foreground">{formatGigCoin(total)}</strong>
          {total > 0 && <small className="text-xs font-normal text-muted-foreground">≈ {formatGigCoinToVnd(total)}</small>}
        </div>
      </div>}

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">{uiCopy.noBaselinePlan || 'No baseline plan'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{uiCopy.noBaselinePlanDescription || 'Freelancers can propose the complete milestone and WBS plan.'}</p>
          {!readOnly && <button type="button" onClick={() => { onChange([newMilestone(0)]); openMilestone(0); }} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><Plus size={16} /> {uiCopy.addFirstMilestone || 'Add first milestone'}</button>}
        </div>
      ) : value.map((milestone, index) => {
        const isExpanded = multipleExpansionEnabled ? openIndexes.includes(index) : expanded === index;
        const isAdvancedOpen = advancedIndexes.includes(index);
        const structuredDuration = durationUnits
          ? parseStructuredDuration(milestone.estimatedDuration, durationUnits)
          : null;
        const errorFor = (field: string) => errors[`${index}.${field}`];
        const fieldClass = (field: string) => `${inputClass} ${errorFor(field) ? 'border-red-500 focus:ring-red-500' : ''}`;
        return (
          <article
            key={milestone.id || index}
            onDragOver={readOnly ? undefined : handleDragOver}
            onDrop={readOnly ? undefined : (e) => handleDrop(e, index)}
            className={`overflow-hidden rounded-lg border bg-card transition-all ${
              draggedIndex === index ? 'opacity-50 border-brand border-dashed' : ''
            } ${Object.keys(errors).some(key => key.startsWith(`${index}.`)) ? 'border-red-500/60' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 p-3 sm:p-4">
              {!readOnly && (
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  className="cursor-grab active:cursor-grabbing p-1 rounded text-text-muted hover:text-brand hover:bg-surface-muted transition-colors shrink-0"
                  title="Drag to reorder milestone"
                >
                  <GripVertical size={16} />
                </div>
              )}
              <button type="button" onClick={() => toggleMilestone(index)} aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{milestone.title?.trim() || `${uiCopy.untitledMilestone || 'Untitled milestone'} ${index + 1}`}</strong><span className="text-xs text-muted-foreground">{formatGigCoin(Number(milestone.amount) || 0)}{simplifiedMilestoneFields ? ` · ${uiCopy.derivedDuration || 'Duration'}: ${milestone.estimatedDuration || '—'}` : showWorkItems ? ` · ${milestone.workItems.length} ${uiCopy.workItems || 'work item(s)'}` : ''}</span></span>
              </button>
              {!readOnly && <div className="flex shrink-0 gap-1">
                <button type="button" title={uiCopy.deleteMilestone || 'Delete milestone'} onClick={() => deleteMilestone(index)} className="rounded p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button>
              </div>}
            </div>

            {isExpanded && <div className="space-y-5 border-t border-border bg-background/40 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold">{uiCopy.milestoneTitle || 'Milestone title'}<input data-milestone-field={`${index}.title`} disabled={readOnly} maxLength={milestoneTitleMaxLength} value={milestone.title || ''} onChange={e => updateMilestone(index, { title: e.target.value })} placeholder={fieldPlaceholders.milestoneTitle} aria-describedby={describedBy(`${index}-title`, fieldHints.milestoneTitle)} className={`${fieldClass('title')} mt-1`} />{renderHint(`${index}-title`, fieldHints.milestoneTitle)}{errorFor('title') && <span className="mt-1 block text-xs text-red-500">{errorFor('title')}</span>}</label>
                <label className="text-xs font-semibold">{uiCopy.amount || 'Amount'}<input data-milestone-field={`${index}.amount`} disabled={readOnly} type="number" min="0" step="0.01" value={milestone.amount || ''} onChange={e => updateMilestone(index, { amount: Number(e.target.value) || 0 })} placeholder={fieldPlaceholders.amount} aria-describedby={describedBy(`${index}-amount`, fieldHints.amount)} className={`${fieldClass('amount')} mt-1`} />{renderHint(`${index}-amount`, fieldHints.amount)}{errorFor('amount') && <span className="mt-1 block text-xs text-red-500">{errorFor('amount')}</span>}</label>
                {!simplifiedMilestoneFields && <label className="text-xs font-semibold">
                  {uiCopy.duration || 'Duration'}
                  {structuredDuration && durationUnits ? (
                    <span className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(7rem,auto)] gap-2">
                      <input data-milestone-field={`${index}.estimatedDuration`} disabled={readOnly} type="number" min="1" step="1" value={structuredDuration.amount} onChange={e => updateMilestone(index, { estimatedDuration: serializeStructuredDuration(e.target.value, structuredDuration.unit) })} placeholder={fieldPlaceholders.duration || 'e.g. 2'} aria-label="Duration" aria-describedby={describedBy(`${index}-duration`, fieldHints.duration)} className={fieldClass('estimatedDuration')} />
                      <select disabled={readOnly} value={structuredDuration.unit} onChange={e => updateMilestone(index, { estimatedDuration: serializeStructuredDuration(structuredDuration.amount, e.target.value) })} aria-label={uiCopy.durationUnit || 'Duration unit'} className={fieldClass('estimatedDuration')}>
                        {durationUnits.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                      </select>
                    </span>
                  ) : (
                    <input data-milestone-field={`${index}.estimatedDuration`} disabled={readOnly} maxLength={durationMaxLength} value={milestone.estimatedDuration || ''} onChange={e => updateMilestone(index, { estimatedDuration: e.target.value })} placeholder={fieldPlaceholders.duration || 'e.g. 2 weeks'} aria-describedby={describedBy(`${index}-duration`, fieldHints.duration)} className={`${fieldClass('estimatedDuration')} mt-1`} />
                  )}
                  {renderHint(`${index}-duration`, fieldHints.duration)}
                  {errorFor('estimatedDuration') && <span className="mt-1 block text-xs text-red-500">{errorFor('estimatedDuration')}</span>}
                </label>}
                {showDueDate && <label className="text-xs font-semibold">{uiCopy.deadline || 'Deadline'}<input data-milestone-field={`${index}.dueDate`} disabled={readOnly} type="date" value={milestone.dueDate || ''} onChange={e => updateMilestone(index, { dueDate: e.target.value || null })} aria-describedby={describedBy(`${index}-deadline`, fieldHints.deadline)} className={`${fieldClass('dueDate')} mt-1`} />{renderHint(`${index}-deadline`, fieldHints.deadline)}{errorFor('dueDate') && <span className="mt-1 block text-xs text-red-500">{errorFor('dueDate')}</span>}</label>}
                {!simplifiedMilestoneFields && <label className="text-xs font-semibold md:col-span-2">{uiCopy.description || 'Description'}<textarea disabled={readOnly} value={milestone.description || ''} onChange={e => updateMilestone(index, { description: e.target.value })} placeholder={fieldPlaceholders.description} aria-describedby={describedBy(`${index}-description`, fieldHints.description)} rows={2} className={`${inputClass} mt-1`} />{renderHint(`${index}-description`, fieldHints.description)}</label>}
                <label className="text-xs font-semibold">{uiCopy.deliverables || 'Deliverables'}<textarea data-milestone-field={`${index}.deliverables`} disabled={readOnly} value={milestone.deliverables || ''} onChange={e => updateMilestone(index, { deliverables: e.target.value })} placeholder={fieldPlaceholders.deliverables} aria-describedby={describedBy(`${index}-deliverables`, fieldHints.deliverables)} rows={3} className={`${fieldClass('deliverables')} mt-1`} />{renderHint(`${index}-deliverables`, fieldHints.deliverables)}{errorFor('deliverables') && <span className="mt-1 block text-xs text-red-500">{errorFor('deliverables')}</span>}</label>
                {!simplifiedMilestoneFields && <label className="text-xs font-semibold">{uiCopy.acceptanceCriteria || 'Acceptance criteria'}<textarea data-milestone-field={`${index}.acceptanceCriteria`} disabled={readOnly} value={milestone.acceptanceCriteria || ''} onChange={e => updateMilestone(index, { acceptanceCriteria: e.target.value })} placeholder={fieldPlaceholders.acceptanceCriteria} aria-describedby={describedBy(`${index}-acceptance-criteria`, fieldHints.acceptanceCriteria)} rows={3} className={`${fieldClass('acceptanceCriteria')} mt-1`} />{renderHint(`${index}-acceptance-criteria`, fieldHints.acceptanceCriteria)}{errorFor('acceptanceCriteria') && <span className="mt-1 block text-xs text-red-500">{errorFor('acceptanceCriteria')}</span>}</label>}
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
                  return <div key={workItem.id || workIndex} className={`grid gap-2 rounded-lg border p-3 md:grid-cols-2 ${workItemErrorFor('title') || workItemErrorFor('description') ? 'border-red-500/60' : 'border-border'}`}>
                    <div className="flex items-center justify-between md:col-span-2"><strong className="text-xs">{uiCopy.workItem || 'Work item'} {workIndex + 1}</strong>{!readOnly && <button type="button" title={uiCopy.deleteWorkItem || 'Delete work item'} onClick={() => updateMilestone(index, { workItems: milestone.workItems.filter((_, itemIndex) => itemIndex !== workIndex).map((item, orderIndex) => ({ ...item, orderIndex })) })} className="p-1 text-red-500"><Trash2 size={13} /></button>}</div>
                    <label className="text-xs font-semibold">{uiCopy.workItemTitle || 'Work item title'}<input data-work-item-field={`${index}.${workIndex}.title`} disabled={readOnly} maxLength={workItemTitleMaxLength} value={workItem.title || ''} onChange={e => updateWorkItem(index, workIndex, { title: e.target.value })} placeholder={fieldPlaceholders.workItemTitle || 'Work item title'} aria-label={uiCopy.workItemTitle ? `${uiCopy.workItem || 'Work item'} ${workIndex + 1}: ${uiCopy.workItemTitle}` : `Work item ${workIndex + 1} title`} aria-describedby={describedBy(`${index}-${workIndex}-work-title`, fieldHints.workItemTitle)} className={workItemFieldClass('title')} />{renderHint(`${index}-${workIndex}-work-title`, fieldHints.workItemTitle)}{workItemErrorFor('title') && <span className="mt-1 block text-xs text-red-500">{workItemErrorFor('title')}</span>}</label>
                    <label className="text-xs font-semibold">{uiCopy.estimatedDuration || 'Estimated duration'}<input disabled={readOnly} maxLength={durationMaxLength} value={workItem.estimatedDuration || ''} onChange={e => updateWorkItem(index, workIndex, { estimatedDuration: e.target.value })} placeholder={fieldPlaceholders.workItemDuration || 'Estimated duration'} aria-describedby={describedBy(`${index}-${workIndex}-work-duration`, fieldHints.workItemDuration)} className={`${inputClass} mt-1`} />{renderHint(`${index}-${workIndex}-work-duration`, fieldHints.workItemDuration)}</label>
                    <label className="text-xs font-semibold">{uiCopy.taskDescription || 'Task description'}<textarea data-work-item-field={`${index}.${workIndex}.description`} disabled={readOnly} value={workItem.description || ''} onChange={e => updateWorkItem(index, workIndex, { description: e.target.value })} placeholder={fieldPlaceholders.workItemDescription || 'Task description'} aria-label={uiCopy.taskDescription ? `${uiCopy.workItem || 'Work item'} ${workIndex + 1}: ${uiCopy.taskDescription}` : `Work item ${workIndex + 1} description`} aria-describedby={describedBy(`${index}-${workIndex}-work-description`, fieldHints.workItemDescription)} rows={2} className={workItemFieldClass('description')} />{renderHint(`${index}-${workIndex}-work-description`, fieldHints.workItemDescription)}{workItemErrorFor('description') && <span className="mt-1 block text-xs text-red-500">{workItemErrorFor('description')}</span>}</label>
                    <label className="text-xs font-semibold">{uiCopy.workItemDeliverables || 'Work item deliverables'}<textarea disabled={readOnly} value={workItem.deliverables || ''} onChange={e => updateWorkItem(index, workIndex, { deliverables: e.target.value })} placeholder={fieldPlaceholders.workItemDeliverables || 'Work item deliverables'} aria-describedby={describedBy(`${index}-${workIndex}-work-deliverables`, fieldHints.workItemDeliverables)} rows={2} className={`${inputClass} mt-1`} />{renderHint(`${index}-${workIndex}-work-deliverables`, fieldHints.workItemDeliverables)}</label>
                  </div>;
                })}
              </div> : null}
            </div>}
          </article>
        );
      })}
    </section>
  );
}
