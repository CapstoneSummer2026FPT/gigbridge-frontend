import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { formatGigCoin } from '../utils/gigcoin';

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

interface Props {
  value: EditableMilestonePlan[];
  onChange: (value: EditableMilestonePlan[]) => void;
  title?: string;
  description?: string;
  optional?: boolean;
  showDueDate?: boolean;
  readOnly?: boolean;
  expandedIndex?: number | null;
  onExpandedChange?: (index: number | null) => void;
  errors?: Record<string, string>;
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
  deliverables: '', acceptanceCriteria: '', orderIndex, workItems: [newWorkItem(0)],
});

export function NestedMilestonePlanEditor({
  value,
  onChange,
  title = 'Milestone and Work Breakdown Structure',
  description = 'Define payable outcomes, then break each outcome into concrete work items.',
  optional = false,
  showDueDate = false,
  readOnly = false,
  expandedIndex,
  onExpandedChange,
  errors = {},
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState<number | null>(value.length ? 0 : null);
  const expanded = expandedIndex === undefined ? internalExpanded : expandedIndex;
  const setExpanded = (index: number | null) => {
    setInternalExpanded(index);
    onExpandedChange?.(index);
  };
  const total = value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/30';

  const updateMilestone = (index: number, patch: Partial<EditableMilestonePlan>) =>
    onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateWorkItem = (milestoneIndex: number, workIndex: number, patch: Partial<EditablePlanWorkItem>) =>
    updateMilestone(milestoneIndex, {
      workItems: value[milestoneIndex].workItems.map((item, itemIndex) => itemIndex === workIndex ? { ...item, ...patch } : item),
    });
  const moveMilestone = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalize(next));
    setExpanded(target);
  };

  return (
    <section className="space-y-4 border-t border-border pt-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {optional && <span className="rounded bg-muted px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Optional</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {!readOnly && <button type="button" onClick={() => { onChange([...value, newMilestone(value.length)]); setExpanded(value.length); }} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><Plus size={16} /> Add milestone</button>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <span className="text-xs font-bold uppercase text-muted-foreground">Fixed project budget from milestones</span>
        <strong className="text-xl text-foreground">{formatGigCoin(total)}</strong>
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">No baseline plan</p>
          <p className="mt-1 text-xs text-muted-foreground">Freelancers can propose the complete milestone and WBS plan.</p>
          {!readOnly && <button type="button" onClick={() => { onChange([newMilestone(0)]); setExpanded(0); }} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><Plus size={16} /> Add first milestone</button>}
        </div>
      ) : value.map((milestone, index) => {
        const isExpanded = expanded === index;
        const errorFor = (field: string) => errors[`${index}.${field}`];
        const fieldClass = (field: string) => `${inputClass} ${errorFor(field) ? 'border-red-500 focus:ring-red-500' : ''}`;
        return (
          <article key={milestone.id || index} className={`overflow-hidden rounded-lg border bg-card ${Object.keys(errors).some(key => key.startsWith(`${index}.`)) ? 'border-red-500/60' : 'border-border'}`}>
            <div className="flex items-center gap-2 p-3 sm:p-4">
              <button type="button" onClick={() => setExpanded(isExpanded ? null : index)} aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{milestone.title?.trim() || `Untitled milestone ${index + 1}`}</strong><span className="text-xs text-muted-foreground">{formatGigCoin(Number(milestone.amount) || 0)} · {milestone.workItems.length} work item(s)</span></span>
              </button>
              {!readOnly && <div className="flex shrink-0 gap-1">
                <button type="button" title="Move up" disabled={index === 0} onClick={() => moveMilestone(index, -1)} className="rounded p-2 hover:bg-muted disabled:opacity-30"><ArrowUp size={15} /></button>
                <button type="button" title="Move down" disabled={index === value.length - 1} onClick={() => moveMilestone(index, 1)} className="rounded p-2 hover:bg-muted disabled:opacity-30"><ArrowDown size={15} /></button>
                <button type="button" title="Delete milestone" onClick={() => onChange(normalize(value.filter((_, itemIndex) => itemIndex !== index)))} className="rounded p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button>
              </div>}
            </div>

            {isExpanded && <div className="space-y-5 border-t border-border bg-background/40 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold">Milestone title<input data-milestone-field={`${index}.title`} disabled={readOnly} value={milestone.title || ''} onChange={e => updateMilestone(index, { title: e.target.value })} className={`${fieldClass('title')} mt-1`} />{errorFor('title') && <span className="mt-1 block text-xs text-red-500">{errorFor('title')}</span>}</label>
                <label className="text-xs font-semibold">Amount<input data-milestone-field={`${index}.amount`} disabled={readOnly} type="number" min="0" step="0.01" value={milestone.amount || ''} onChange={e => updateMilestone(index, { amount: Number(e.target.value) || 0 })} className={`${fieldClass('amount')} mt-1`} />{errorFor('amount') && <span className="mt-1 block text-xs text-red-500">{errorFor('amount')}</span>}</label>
                <label className="text-xs font-semibold">Duration<input data-milestone-field={`${index}.estimatedDuration`} disabled={readOnly} value={milestone.estimatedDuration || ''} onChange={e => updateMilestone(index, { estimatedDuration: e.target.value })} placeholder="e.g. 2 weeks" className={`${fieldClass('estimatedDuration')} mt-1`} />{errorFor('estimatedDuration') && <span className="mt-1 block text-xs text-red-500">{errorFor('estimatedDuration')}</span>}</label>
                {showDueDate && <label className="text-xs font-semibold">Deadline<input disabled={readOnly} type="date" value={milestone.dueDate || ''} onChange={e => updateMilestone(index, { dueDate: e.target.value || null })} className={`${inputClass} mt-1`} /></label>}
                <label className="text-xs font-semibold md:col-span-2">Description<textarea disabled={readOnly} value={milestone.description || ''} onChange={e => updateMilestone(index, { description: e.target.value })} rows={2} className={`${inputClass} mt-1`} /></label>
                <label className="text-xs font-semibold">Deliverables<textarea data-milestone-field={`${index}.deliverables`} disabled={readOnly} value={milestone.deliverables || ''} onChange={e => updateMilestone(index, { deliverables: e.target.value })} rows={3} className={`${fieldClass('deliverables')} mt-1`} />{errorFor('deliverables') && <span className="mt-1 block text-xs text-red-500">{errorFor('deliverables')}</span>}</label>
                <label className="text-xs font-semibold">Acceptance criteria<textarea data-milestone-field={`${index}.acceptanceCriteria`} disabled={readOnly} value={milestone.acceptanceCriteria || ''} onChange={e => updateMilestone(index, { acceptanceCriteria: e.target.value })} rows={3} className={`${fieldClass('acceptanceCriteria')} mt-1`} />{errorFor('acceptanceCriteria') && <span className="mt-1 block text-xs text-red-500">{errorFor('acceptanceCriteria')}</span>}</label>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Work Breakdown Structure</h3>{!readOnly && <button type="button" onClick={() => updateMilestone(index, { workItems: [...milestone.workItems, newWorkItem(milestone.workItems.length)] })} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold"><Plus size={13} /> Add work item</button>}</div>
                {milestone.workItems.map((workItem, workIndex) => <div key={workItem.id || workIndex} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-2">
                  <div className="flex items-center justify-between md:col-span-2"><strong className="text-xs">Work item {workIndex + 1}</strong>{!readOnly && <button type="button" title="Delete work item" onClick={() => updateMilestone(index, { workItems: milestone.workItems.filter((_, itemIndex) => itemIndex !== workIndex).map((item, orderIndex) => ({ ...item, orderIndex })) })} className="p-1 text-red-500"><Trash2 size={13} /></button>}</div>
                  <input disabled={readOnly} value={workItem.title || ''} onChange={e => updateWorkItem(index, workIndex, { title: e.target.value })} placeholder="Work item title" aria-label={`Work item ${workIndex + 1} title`} className={inputClass} />
                  <input disabled={readOnly} value={workItem.estimatedDuration || ''} onChange={e => updateWorkItem(index, workIndex, { estimatedDuration: e.target.value })} placeholder="Estimated duration" className={inputClass} />
                  <textarea disabled={readOnly} value={workItem.description || ''} onChange={e => updateWorkItem(index, workIndex, { description: e.target.value })} placeholder="Task description" aria-label={`Work item ${workIndex + 1} description`} rows={2} className={inputClass} />
                  <textarea disabled={readOnly} value={workItem.deliverables || ''} onChange={e => updateWorkItem(index, workIndex, { deliverables: e.target.value })} placeholder="Work item deliverables" rows={2} className={inputClass} />
                </div>)}
              </div>
            </div>}
          </article>
        );
      })}
    </section>
  );
}
