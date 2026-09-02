import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Scale,
  Clock3,
  Calendar,
  Package,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  Layers,
  User,
  Sparkles,
  LayoutGrid,
  TableProperties,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
} from 'lucide-react';
import GCoinIcon from './GCoinIcon';
import { formatGigCoinToVnd, formatGigCoinNumber } from '../utils/gigcoin';
import type { EditableMilestonePlan, EditablePlanWorkItem } from './NestedMilestonePlanEditor';

export interface MilestonePlanComparisonProps {
  clientMilestones: EditableMilestonePlan[];
  freelancerMilestones: EditableMilestonePlan[];
  title?: string;
  clientLabel?: string;
  freelancerLabel?: string;
  addedLabel?: string;
  removedLabel?: string;
  emptyLabel?: string;
  workItemsLabel?: string;
}

interface MatchedPair<T> {
  client: T | null;
  freelancer: T | null;
}

type Keyable = { id?: string | null };

function matchItems<T extends Keyable>(clientItems: T[], freelancerItems: T[]): MatchedPair<T>[] {
  const freelancerById = new Map<string, T>();
  freelancerItems.forEach(item => {
    if (item.id) freelancerById.set(item.id, item);
  });

  const matchedFreelancer = new Set<T>();
  const idMatched: MatchedPair<T>[] = [];
  const clientRemaining: T[] = [];

  clientItems.forEach(clientItem => {
    const freelancerItem = clientItem.id ? freelancerById.get(clientItem.id) : undefined;
    if (freelancerItem) {
      idMatched.push({ client: clientItem, freelancer: freelancerItem });
      matchedFreelancer.add(freelancerItem);
    } else {
      clientRemaining.push(clientItem);
    }
  });

  const freelancerRemaining = freelancerItems.filter(item => !matchedFreelancer.has(item));

  const orderMatched: MatchedPair<T>[] = [];
  const matchedByPosition = new Set<T>();
  clientRemaining.forEach((clientItem, position) => {
    const freelancerItem = freelancerRemaining[position] ?? null;
    if (freelancerItem) matchedByPosition.add(freelancerItem);
    orderMatched.push({ client: clientItem, freelancer: freelancerItem });
  });

  const freelancerOnly = freelancerRemaining
    .filter(item => !matchedByPosition.has(item))
    .map(item => ({ client: null, freelancer: item }));

  return [...idMatched, ...orderMatched, ...freelancerOnly];
}

const normText = (value?: string | number | null): string =>
  value === null || value === undefined ? '' : String(value).trim();

const MILESTONE_CORE_FIELDS: (keyof EditableMilestonePlan)[] = [
  'title', 'description', 'amount', 'estimatedDuration', 'dueDate', 'deliverables', 'acceptanceCriteria',
];
const WORK_ITEM_CORE_FIELDS: (keyof EditablePlanWorkItem)[] = [
  'title', 'description', 'deliverables', 'estimatedDuration',
];

function itemsEqual<T extends object>(a: T | null, b: T | null, fields: (keyof T)[]): boolean {
  if (!a || !b) return false;
  return fields.every(
    field => normText(a[field] as string | number | null) === normText(b[field] as string | number | null)
  );
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

const formatDurationDelta = (days: number, labels: Record<string, string>): string => {
  const absDays = Math.abs(days);
  const weeksStr = labels.weeksUnit || 'tuần';
  const daysStr = labels.daysUnit || 'ngày';
  if (absDays >= 7 && absDays % 7 === 0) {
    const count = absDays / 7;
    const finalUnit = count === 1 ? weeksStr.replace(/s$/, '') : weeksStr;
    return `${count} ${finalUnit}`;
  }
  const finalUnit = absDays === 1 ? daysStr.replace(/s$/, '') : daysStr;
  return `${absDays} ${finalUnit}`;
};

// ============================================================================
// WORK ITEMS (WBS) COMPARISON COMPONENT
// ============================================================================
const WorkItemsComparisonList: FC<{
  clientItems: EditablePlanWorkItem[];
  freelancerItems: EditablePlanWorkItem[];
  labels: {
    workItemsLabel: string;
    clientLabel: string;
    freelancerLabel: string;
    addedLabel: string;
    removedLabel: string;
    modifiedLabel: string;
    unchangedLabel: string;
  };
}> = ({ clientItems, freelancerItems, labels }) => {
  if (clientItems.length === 0 && freelancerItems.length === 0) return null;
  const pairs = matchItems(clientItems, freelancerItems);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers size={14} className="text-brand shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
          {labels.workItemsLabel}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
          {pairs.length}
        </span>
      </div>

      <div className="space-y-2">
        {pairs.map((pair, index) => {
          const { client, freelancer } = pair;
          const isAdded = !client && Boolean(freelancer);
          const isRemoved = Boolean(client) && !freelancer;
          const isIdentical = client && freelancer && itemsEqual(client, freelancer, WORK_ITEM_CORE_FIELDS);

          if (isAdded && freelancer) {
            return (
              <div
                key={freelancer.id || `w-add-${index}`}
                className="rounded-xl border border-border bg-surface p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-brand/30 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                      {labels.addedLabel}
                    </span>
                    <strong className="text-brand text-xs font-bold truncate">
                      {freelancer.title || '—'}
                    </strong>
                  </div>
                  {freelancer.description && (
                    <p className="text-[11px] text-text-muted line-clamp-2">{freelancer.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted shrink-0">
                  {freelancer.estimatedDuration && (
                    <span className="inline-flex items-center gap-1 font-semibold bg-surface-muted px-2 py-1 rounded-md border border-border text-text-primary">
                      <Clock3 size={11} className="text-text-muted" />
                      {freelancer.estimatedDuration}
                    </span>
                  )}
                  {freelancer.deliverables && (
                    <span className="inline-flex items-center gap-1 bg-surface-muted px-2 py-1 rounded-md border border-border text-text-secondary">
                      <Package size={11} className="text-text-muted" />
                      <span className="truncate max-w-[140px]">{freelancer.deliverables}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          }

          if (isRemoved && client) {
            return (
              <div
                key={client.id || `w-rem-${index}`}
                className="rounded-xl border border-dashed border-border bg-surface p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-65"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" />
                      {labels.removedLabel}
                    </span>
                    <strong className="line-through text-text-muted text-xs font-medium truncate">
                      {client.title || '—'}
                    </strong>
                  </div>
                  {client.description && (
                    <p className="line-through text-[11px] text-text-muted">{client.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted shrink-0">
                  {client.estimatedDuration && (
                    <span className="inline-flex items-center gap-1 font-semibold bg-surface-muted px-2 py-1 rounded-md border border-border text-text-muted">
                      <Clock3 size={11} />
                      {client.estimatedDuration}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          if (isIdentical && client && freelancer) {
            return (
              <div
                key={client.id || freelancer.id || `w-match-${index}`}
                className="rounded-xl border border-border bg-surface p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-secondary">
                      <CheckCircle2 size={10} className="text-text-muted" />
                      {labels.unchangedLabel}
                    </span>
                    <strong className="text-text-primary text-xs font-bold truncate">
                      {client.title || '—'}
                    </strong>
                  </div>
                  {client.description && (
                    <p className="text-[11px] text-text-muted line-clamp-2">{client.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted shrink-0">
                  {client.estimatedDuration && (
                    <span className="inline-flex items-center gap-1 font-semibold bg-surface-muted px-2 py-1 rounded-md border border-border text-text-primary">
                      <Clock3 size={11} className="text-text-muted" />
                      {client.estimatedDuration}
                    </span>
                  )}
                  {client.deliverables && (
                    <span className="inline-flex items-center gap-1 bg-surface-muted px-2 py-1 rounded-md border border-border text-text-secondary">
                      <Package size={11} className="text-text-muted" />
                      <span className="truncate max-w-[140px]">{client.deliverables}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Modified work item (Side-by-Side Solid Monochromatic with Brand Accent)
          return (
            <div
              key={client?.id || freelancer?.id || `w-diff-${index}`}
              className="rounded-xl border border-border bg-surface p-3.5 text-xs space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                  {labels.modifiedLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {client && (
                  <div className="rounded-lg border border-border bg-surface-muted/50 p-3 space-y-1.5">
                    <span className="text-[10px] font-extrabold text-text-muted block uppercase tracking-wider">
                      {labels.clientLabel}
                    </span>
                    <strong className="block text-text-primary text-xs font-semibold">{client.title || '—'}</strong>
                    {client.description && (
                      <p className="text-[11px] text-text-muted">{client.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10.5px] text-text-muted">
                      {client.estimatedDuration && (
                        <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-border">
                          <Clock3 size={10} /> {client.estimatedDuration}
                        </span>
                      )}
                      {client.deliverables && (
                        <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-border">
                          <Package size={10} /> {client.deliverables}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {freelancer && (
                  <div className="rounded-lg border border-brand/30 bg-surface-muted/50 p-3 space-y-1.5 ring-1 ring-brand/10">
                    <span className="text-[10px] font-extrabold text-brand block uppercase tracking-wider">
                      {labels.freelancerLabel}
                    </span>
                    <strong className="block text-brand text-xs font-bold">{freelancer.title || '—'}</strong>
                    {freelancer.description && (
                      <p className="text-[11px] text-text-muted">{freelancer.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10.5px] text-text-muted">
                      {freelancer.estimatedDuration && (
                        <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-brand/30 font-semibold text-brand">
                          <Clock3 size={10} /> {freelancer.estimatedDuration}
                        </span>
                      )}
                      {freelancer.deliverables && (
                        <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-border">
                          <Package size={10} /> {freelancer.deliverables}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// DETAILED CARD VIEW
// ============================================================================
const DetailedCardItem: FC<{
  pair: MatchedPair<EditableMilestonePlan>;
  index: number;
  labels: Record<string, string>;
}> = ({ pair, index, labels }) => {
  const { client, freelancer } = pair;
  const isAdded = !client && Boolean(freelancer);
  const isRemoved = Boolean(client) && !freelancer;
  const isIdentical = client && freelancer && itemsEqual(client, freelancer, MILESTONE_CORE_FIELDS);
  const isModified = client && freelancer && !isIdentical;

  const milestoneNumberText = (labels.milestoneLabel || 'Mốc {{number}}').replace('{{number}}', String(index + 1));
  const clientAmount = Number(client?.amount) || 0;
  const freelancerAmount = Number(freelancer?.amount) || 0;
  const amountDelta = freelancerAmount - clientAmount;

  const clientDays = durationToDays(client?.estimatedDuration);
  const freelancerDays = durationToDays(freelancer?.estimatedDuration);
  const daysDelta = client && freelancer && clientDays > 0 && freelancerDays > 0 ? freelancerDays - clientDays : null;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden transition-all">
      {/* ── CARD TOP BAR ── */}
      <div className="p-3.5 sm:p-4 bg-surface-muted border-b border-border flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-6 sm:h-7 px-2.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[var(--brand)] to-[#6366f1] text-white text-[11px] sm:text-xs font-black shadow-2xs">
            {milestoneNumberText}
          </span>
          <strong className="text-xs sm:text-sm font-bold text-text-primary truncate">
            {freelancer?.title?.trim() || client?.title?.trim() || `Milestone ${index + 1}`}
          </strong>
        </div>

        <div>
          {isAdded && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-surface border border-border text-text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              {labels.addedLabel}
            </span>
          )}
          {isRemoved && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-surface border border-border text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" />
              {labels.removedLabel}
            </span>
          )}
          {isModified && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-surface border border-border text-text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
              {labels.modifiedLabel}
            </span>
          )}
          {isIdentical && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-surface border border-border text-text-muted">
              <CheckCircle2 size={12} />
              {labels.unchangedLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── CARD BODY ── */}
      <div className="p-4 sm:p-5 space-y-4">
        {isAdded && freelancer && (
          <div className="rounded-xl border border-brand/30 bg-surface-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
                <Sparkles size={13} />
                {labels.freelancerProposal}
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-brand">{freelancer.title || '—'}</h4>
              {freelancer.description && <p className="text-xs text-text-muted">{freelancer.description}</p>}
            </div>
            {freelancer.deliverables && (
              <div className="rounded-lg bg-surface border border-border p-2.5 space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <Package size={11} className="text-brand" />
                  {labels.deliverables}
                </span>
                <p className="text-xs text-text-primary">{freelancer.deliverables}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg border border-brand/20">
                <GCoinIcon size={13} />
                <span>{formatGigCoinNumber(freelancerAmount)} G-coin</span>
                <span className="text-[10.5px] font-semibold text-text-muted">
                  (≈ {formatGigCoinToVnd(freelancerAmount)})
                </span>
              </span>
              {freelancer.estimatedDuration && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary bg-surface px-2.5 py-1 rounded-lg border border-border">
                  <Clock3 size={12} className="text-text-muted" />
                  <span>{freelancer.estimatedDuration}</span>
                </span>
              )}
              {freelancer.dueDate && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary bg-surface px-2.5 py-1 rounded-lg border border-border">
                  <Calendar size={12} className="text-text-muted" />
                  <span>{freelancer.dueDate}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {isRemoved && client && (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 p-4 space-y-3 opacity-70">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted">
                <User size={13} />
                {labels.clientBaseline}
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="line-through text-sm font-semibold text-text-muted">{client.title || '—'}</h4>
              {client.description && <p className="line-through text-xs text-text-muted">{client.description}</p>}
            </div>
            {client.deliverables && (
              <div className="rounded-lg bg-surface border border-border/60 p-2.5 space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <Package size={11} />
                  {labels.deliverables}
                </span>
                <p className="line-through text-xs text-text-muted">{client.deliverables}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-lg border border-border">
                <GCoinIcon size={13} />
                <span>{formatGigCoinNumber(clientAmount)} G-coin</span>
              </span>
              {client.estimatedDuration && (
                <span className="inline-flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-lg border border-border">
                  <Clock3 size={12} />
                  <span>{client.estimatedDuration}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {client && freelancer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* CLIENT BASELINE */}
            <div className="rounded-xl border border-border bg-surface-muted/40 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface text-text-secondary border border-border">
                  <User size={11} className="text-text-muted" />
                  {labels.clientBaseline}
                </span>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-text-primary">{client.title || '—'}</h4>
                  {client.description && <p className="text-xs text-text-muted">{client.description}</p>}
                </div>

                <div className="rounded-lg bg-surface border border-border p-2.5 space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                    <Package size={11} className="text-text-muted" />
                    {labels.deliverables}
                  </span>
                  <p className="text-xs text-text-primary">
                    {client.deliverables || <span className="text-text-muted italic">{labels.noDeliverables}</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-text-primary bg-surface px-2.5 py-1 rounded-lg border border-border">
                  <GCoinIcon size={12} />
                  <span>{formatGigCoinNumber(clientAmount)} G-coin</span>
                  <span className="text-[10px] font-normal text-text-muted">
                    (≈ {formatGigCoinToVnd(clientAmount)})
                  </span>
                </span>
                {client.estimatedDuration && (
                  <span className="inline-flex items-center gap-1.5 bg-surface px-2 py-1 rounded-lg border border-border text-[11px] text-text-muted">
                    <Clock3 size={11} />
                    <span>{client.estimatedDuration}</span>
                  </span>
                )}
                {client.dueDate && (
                  <span className="inline-flex items-center gap-1.5 bg-surface px-2 py-1 rounded-lg border border-border text-[11px] text-text-muted">
                    <Calendar size={11} />
                    <span>{client.dueDate}</span>
                  </span>
                )}
              </div>
            </div>

            {/* FREELANCER PROPOSAL */}
            <div className="rounded-xl border border-brand/30 bg-surface-muted/60 p-4 space-y-3 flex flex-col justify-between ring-1 ring-brand/10">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20">
                    <Sparkles size={11} />
                    {labels.freelancerProposal}
                  </span>

                  {amountDelta !== 0 ? (
                    amountDelta > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                        <TrendingUp size={11} className="stroke-[2.5]" />
                        <span>+{formatGigCoinNumber(amountDelta)} G-coin</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                        <TrendingDown size={11} className="stroke-[2.5]" />
                        <span>{formatGigCoinNumber(amountDelta)} G-coin</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                      <Check size={11} className="stroke-[2.5]" />
                      <span>{labels.diffEqualAmount || 'Bằng gốc'}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-brand">
                    {freelancer.title || '—'}
                  </h4>
                  {freelancer.description && <p className="text-xs text-text-muted">{freelancer.description}</p>}
                </div>

                <div className="rounded-lg bg-surface border border-border p-2.5 space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                    <Package size={11} className="text-brand" />
                    {labels.deliverables}
                  </span>
                  <p className="text-xs text-text-primary font-medium">
                    {freelancer.deliverables || <span className="text-text-muted italic">{labels.noDeliverables}</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-brand bg-surface px-2.5 py-1 rounded-lg border border-brand/20">
                  <GCoinIcon size={12} />
                  <span>{formatGigCoinNumber(freelancerAmount)} G-coin</span>
                  <span className="text-[10px] font-normal text-text-muted">
                    (≈ {formatGigCoinToVnd(freelancerAmount)})
                  </span>
                </span>
                {freelancer.estimatedDuration && (
                  <span className="inline-flex items-center gap-1.5 bg-surface px-2 py-1 rounded-lg border border-brand/20 text-[11px] text-brand font-medium">
                    <Clock3 size={11} />
                    <span>{freelancer.estimatedDuration}</span>
                  </span>
                )}
                {daysDelta !== null && (
                  daysDelta > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                      <TrendingUp size={11} className="stroke-[2.5]" />
                      <span>+{formatDurationDelta(daysDelta, labels)}</span>
                    </span>
                  ) : daysDelta < 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                      <TrendingDown size={11} className="stroke-[2.5]" />
                      <span>{formatDurationDelta(daysDelta, labels)}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
                      <Check size={11} className="stroke-[2.5]" />
                      <span>{labels.diffEqualDuration || 'Khớp thời gian'}</span>
                    </span>
                  )
                )}
                {freelancer.dueDate && (
                  <span className="inline-flex items-center gap-1.5 bg-surface px-2 py-1 rounded-lg border border-brand/20 text-[11px] text-brand font-medium">
                    <Calendar size={11} />
                    <span>{freelancer.dueDate}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WORK ITEMS */}
        <div className="pt-2">
          <WorkItemsComparisonList
            clientItems={client?.workItems || []}
            freelancerItems={freelancer?.workItems || []}
            labels={{
              workItemsLabel: labels.workItemsLabel,
              clientLabel: labels.clientLabel,
              freelancerLabel: labels.freelancerLabel,
              addedLabel: labels.addedLabel,
              removedLabel: labels.removedLabel,
              modifiedLabel: labels.modifiedLabel,
              unchangedLabel: labels.unchangedLabel,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MATRIX TABLE ROW COMPONENT
// ============================================================================
const MatrixTableRow: FC<{
  pair: MatchedPair<EditableMilestonePlan>;
  index: number;
  labels: Record<string, string>;
}> = ({ pair, index, labels }) => {
  const [expanded, setExpanded] = useState(false);
  const { client, freelancer } = pair;

  const isAdded = !client && Boolean(freelancer);
  const isRemoved = Boolean(client) && !freelancer;
  const isIdentical = client && freelancer && itemsEqual(client, freelancer, MILESTONE_CORE_FIELDS);
  const isModified = client && freelancer && !isIdentical;

  const milestoneNumberText = (labels.milestoneLabel || 'Mốc {{number}}').replace('{{number}}', String(index + 1));
  const clientAmount = Number(client?.amount) || 0;
  const freelancerAmount = Number(freelancer?.amount) || 0;
  const amountDelta = freelancerAmount - clientAmount;

  const clientDays = durationToDays(client?.estimatedDuration);
  const freelancerDays = durationToDays(freelancer?.estimatedDuration);
  const daysDelta = client && freelancer && clientDays > 0 && freelancerDays > 0 ? freelancerDays - clientDays : null;

  const totalWorkItems = Math.max(client?.workItems?.length || 0, freelancer?.workItems?.length || 0);

  return (
    <>
      <tr className="border-b border-border hover:bg-surface-hover/60 transition-colors text-xs">
        {/* 1. Milestone + Diff Badge + WBS Toggle */}
        <td className="p-3 align-top font-medium w-[15%]">
          <div className="space-y-1.5">
            <span className="flex h-5 px-2 w-fit items-center justify-center rounded-md bg-gradient-to-r from-[var(--brand)] to-[#6366f1] text-white text-[10px] font-black shadow-2xs">
              {milestoneNumberText}
            </span>
            {isAdded && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-surface border border-border text-text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" /> {labels.addedLabel}
              </span>
            )}
            {isRemoved && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-surface border border-border text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" /> {labels.removedLabel}
              </span>
            )}
            {isModified && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-surface border border-border text-text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" /> {labels.modifiedLabel}
              </span>
            )}
            {isIdentical && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-surface border border-border text-text-muted">
                <CheckCircle2 size={9} /> {labels.unchangedLabel}
              </span>
            )}

            {totalWorkItems > 0 && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border bg-surface hover:bg-surface-muted font-bold text-[10px] text-text-primary hover:text-brand transition-all cursor-pointer shadow-2xs"
                >
                  <Layers size={10} className="text-brand shrink-0" />
                  <span>{totalWorkItems} WBS</span>
                  <ChevronDown size={10} className={`transition-transform duration-200 ${expanded ? 'rotate-180 text-brand' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </td>

        {/* 2. Client Baseline Title & Deliverables */}
        <td className="p-3 align-top w-[27%]">
          {client ? (
            <div className={`space-y-1 break-words ${isRemoved ? 'line-through opacity-70' : ''}`}>
              <strong className="block text-text-primary font-semibold text-xs leading-snug">{client.title || '—'}</strong>
              {client.deliverables && (
                <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                  <span className="font-bold text-text-secondary">{labels.deliverables}: </span>
                  {client.deliverables}
                </p>
              )}
            </div>
          ) : (
            <span className="text-text-muted italic text-[11px]">—</span>
          )}
        </td>

        {/* 3. Freelancer Proposed Title & Deliverables */}
        <td className="p-3 align-top w-[28%]">
          {freelancer ? (
            <div className="space-y-1 break-words">
              <strong className="block text-xs font-bold text-brand leading-snug">
                {freelancer.title || '—'}
              </strong>
              {freelancer.deliverables && (
                <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                  <span className="font-bold text-text-secondary">{labels.deliverables}: </span>
                  {freelancer.deliverables}
                </p>
              )}
            </div>
          ) : (
            <span className="text-text-muted italic text-[11px]">—</span>
          )}
        </td>

        {/* 4. Budget Comparison */}
        <td className="p-3 align-top w-[15%]">
          <div className="space-y-1">
            <div className="font-bold text-text-primary text-[11px] sm:text-xs flex items-center gap-1 flex-wrap">
              {client ? <span>{formatGigCoinNumber(clientAmount)}</span> : <span className="text-text-muted">—</span>}
              <span className="text-text-muted">➔</span>
              {freelancer ? <span className="font-bold text-brand">{formatGigCoinNumber(freelancerAmount)} G-coin</span> : <span className="text-text-muted">—</span>}
            </div>

            {client && freelancer && (
              <div>
                {amountDelta > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                    <TrendingUp size={9} className="stroke-[2.5]" />
                    <span>+{formatGigCoinNumber(amountDelta)} G</span>
                  </span>
                ) : amountDelta < 0 ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                    <TrendingDown size={9} className="stroke-[2.5]" />
                    <span>{formatGigCoinNumber(amountDelta)} G</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                    <Check size={9} className="stroke-[2.5]" />
                    <span>{labels.diffEqualAmount || 'Bằng gốc'}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </td>

        {/* 5. Timeline & Deadline */}
        <td className="p-3 align-top w-[15%]">
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-1 text-text-muted flex-wrap">
              <Clock3 size={10} className="shrink-0" />
              <span>{client?.estimatedDuration || '—'}</span>
              <span>➔</span>
              <span className="font-semibold text-text-primary">{freelancer?.estimatedDuration || '—'}</span>
            </div>
            {(client?.dueDate || freelancer?.dueDate) && (
              <div className="flex items-center gap-1 text-text-muted text-[10px] sm:text-[10.5px] flex-wrap">
                <Calendar size={10} className="shrink-0" />
                <span>{client?.dueDate || '—'}</span>
                <span>➔</span>
                <span className="font-semibold text-text-primary">{freelancer?.dueDate || '—'}</span>
              </div>
            )}
            {daysDelta !== null && client && freelancer && (
              <div>
                {daysDelta > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                    <TrendingUp size={9} className="stroke-[2.5]" />
                    <span>+{formatDurationDelta(daysDelta, labels)}</span>
                  </span>
                ) : daysDelta < 0 ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                    <TrendingDown size={9} className="stroke-[2.5]" />
                    <span>{formatDurationDelta(daysDelta, labels)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                    <Check size={9} className="stroke-[2.5]" />
                    <span>{labels.diffEqualDuration || 'Khớp gốc'}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Work items breakdown in table mode */}
      {expanded && totalWorkItems > 0 && (
        <tr className="bg-surface-muted/40 border-b border-border">
          <td colSpan={5} className="p-3.5 sm:p-4">
            <div className="rounded-xl border border-border bg-surface-muted/60 p-3.5 sm:p-4">
              <WorkItemsComparisonList
                clientItems={client?.workItems || []}
                freelancerItems={freelancer?.workItems || []}
                labels={{
                  workItemsLabel: labels.workItemsLabel,
                  clientLabel: labels.clientLabel,
                  freelancerLabel: labels.freelancerLabel,
                  addedLabel: labels.addedLabel,
                  removedLabel: labels.removedLabel,
                  modifiedLabel: labels.modifiedLabel,
                  unchangedLabel: labels.unchangedLabel,
                }}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ============================================================================
// MATRIX MOBILE CARD COMPONENT (Mobile-friendly Table View Alternative)
// ============================================================================
const MatrixMobileCard: FC<{
  pair: MatchedPair<EditableMilestonePlan>;
  index: number;
  labels: Record<string, string>;
}> = ({ pair, index, labels }) => {
  const [expanded, setExpanded] = useState(false);
  const { client, freelancer } = pair;

  const isAdded = !client && Boolean(freelancer);
  const isRemoved = Boolean(client) && !freelancer;
  const isIdentical = client && freelancer && itemsEqual(client, freelancer, MILESTONE_CORE_FIELDS);
  const isModified = client && freelancer && !isIdentical;

  const milestoneNumberText = (labels.milestoneLabel || 'Mốc {{number}}').replace('{{number}}', String(index + 1));
  const clientAmount = Number(client?.amount) || 0;
  const freelancerAmount = Number(freelancer?.amount) || 0;
  const amountDelta = freelancerAmount - clientAmount;

  const clientDays = durationToDays(client?.estimatedDuration);
  const freelancerDays = durationToDays(freelancer?.estimatedDuration);
  const daysDelta = client && freelancer && clientDays > 0 && freelancerDays > 0 ? freelancerDays - clientDays : null;

  const totalWorkItems = Math.max(client?.workItems?.length || 0, freelancer?.workItems?.length || 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4 space-y-3 shadow-2xs">
      {/* Mobile Card Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex h-5 px-2 w-fit items-center justify-center rounded-md bg-gradient-to-r from-[var(--brand)] to-[#6366f1] text-white text-[10px] font-black shadow-2xs">
            {milestoneNumberText}
          </span>
          {isAdded && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" /> {labels.addedLabel}
            </span>
          )}
          {isRemoved && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" /> {labels.removedLabel}
            </span>
          )}
          {isModified && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" /> {labels.modifiedLabel}
            </span>
          )}
          {isIdentical && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-muted">
              <CheckCircle2 size={10} /> {labels.unchangedLabel}
            </span>
          )}
        </div>

        {totalWorkItems > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface-muted hover:bg-surface font-bold text-[10.5px] text-text-primary hover:text-brand transition-all cursor-pointer shrink-0"
          >
            <Layers size={10} className="text-brand shrink-0" />
            <span>{totalWorkItems} WBS</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${expanded ? 'rotate-180 text-brand' : ''}`} />
          </button>
        )}
      </div>

      {/* Comparison Sections */}
      <div className="space-y-2.5">
        {/* Client Plan */}
        {client && (
          <div className={`rounded-lg border border-border bg-surface-muted/40 p-3 space-y-2 text-xs ${isRemoved ? 'line-through opacity-70' : ''}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <User size={10} />
              <span>{labels.clientBaseline}</span>
            </span>

            <div>
              <strong className="block text-text-primary font-semibold text-xs">{client.title || '—'}</strong>
              {client.deliverables && (
                <p className="text-[11px] text-text-muted mt-0.5">
                  <span className="font-bold text-text-secondary">{labels.deliverables}: </span>
                  {client.deliverables}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-border/60 text-[11px] text-text-muted">
              <span className="font-bold text-text-primary flex items-center gap-1">
                <GCoinIcon size={11} />
                <span>{formatGigCoinNumber(clientAmount)} G</span>
              </span>
              {client.estimatedDuration && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={10} />
                  <span>{client.estimatedDuration}</span>
                </span>
              )}
              {client.dueDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={10} />
                  <span>{client.dueDate}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Freelancer Plan */}
        {freelancer && (
          <div className="rounded-lg border border-brand/30 bg-surface-muted/60 p-3 space-y-2 text-xs ring-1 ring-brand/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand flex items-center gap-1">
              <Sparkles size={10} />
              <span>{labels.freelancerProposal}</span>
            </span>

            <div>
              <strong className="block text-xs font-bold text-brand">{freelancer.title || '—'}</strong>
              {freelancer.deliverables && (
                <p className="text-[11px] text-text-muted mt-0.5">
                  <span className="font-bold text-text-secondary">{labels.deliverables}: </span>
                  {freelancer.deliverables}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-brand/20 text-[11px]">
              {/* Budget + Delta Badge */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-brand flex items-center gap-1">
                  <GCoinIcon size={11} />
                  <span>{formatGigCoinNumber(freelancerAmount)} G</span>
                </span>
                {client && freelancer && (
                  amountDelta > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                      <TrendingUp size={9} className="stroke-[2.5]" />
                      <span>+{formatGigCoinNumber(amountDelta)} G</span>
                    </span>
                  ) : amountDelta < 0 ? (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                      <TrendingDown size={9} className="stroke-[2.5]" />
                      <span>{formatGigCoinNumber(amountDelta)} G</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                      <Check size={9} className="stroke-[2.5]" />
                      <span>{labels.diffEqualAmount || 'Bằng gốc'}</span>
                    </span>
                  )
                )}
              </div>

              {/* Duration + Delta Badge */}
              {freelancer.estimatedDuration && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-semibold text-text-primary">
                    <Clock3 size={10} className="text-text-muted" />
                    <span>{freelancer.estimatedDuration}</span>
                  </span>
                  {daysDelta !== null && client && freelancer && (
                    daysDelta > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                        <TrendingUp size={9} className="stroke-[2.5]" />
                        <span>+{formatDurationDelta(daysDelta, labels)}</span>
                      </span>
                    ) : daysDelta < 0 ? (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                        <TrendingDown size={9} className="stroke-[2.5]" />
                        <span>{formatDurationDelta(daysDelta, labels)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-zinc-600 dark:bg-zinc-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                        <Check size={9} className="stroke-[2.5]" />
                        <span>{labels.diffEqualDuration || 'Khớp thời gian'}</span>
                      </span>
                    )
                  )}
                </div>
              )}

              {/* Due Date */}
              {freelancer.dueDate && (
                <span className="inline-flex items-center gap-1 text-text-muted">
                  <Calendar size={10} />
                  <span>{freelancer.dueDate}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Work items breakdown in mobile mode */}
      {expanded && totalWorkItems > 0 && (
        <div className="pt-2 border-t border-border">
          <WorkItemsComparisonList
            clientItems={client?.workItems || []}
            freelancerItems={freelancer?.workItems || []}
            labels={{
              workItemsLabel: labels.workItemsLabel,
              clientLabel: labels.clientLabel,
              freelancerLabel: labels.freelancerLabel,
              addedLabel: labels.addedLabel,
              removedLabel: labels.removedLabel,
              modifiedLabel: labels.modifiedLabel,
              unchangedLabel: labels.unchangedLabel,
            }}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function MilestonePlanComparison({
  clientMilestones,
  freelancerMilestones,
  title,
  clientLabel,
  freelancerLabel,
  addedLabel,
  removedLabel,
  emptyLabel,
  workItemsLabel,
}: MilestonePlanComparisonProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const labels: Record<string, string> = {
    title: title || t('proposalMilestoneComparison.title', 'Tổng quan so sánh kế hoạch: Client vs Freelancer'),
    subtitle: t(
      'proposalMilestoneComparison.subtitle',
      'Bảng tổng hợp & đối chiếu chi tiết giữa kế hoạch gốc của Khách hàng và đề xuất mới của Freelancer.'
    ),
    clientLabel: clientLabel || t('proposalMilestoneComparison.clientLabel', 'Khách hàng'),
    clientBaseline: t('proposalMilestoneComparison.clientBaseline', 'Kế hoạch gốc của Client'),
    freelancerLabel: freelancerLabel || t('proposalMilestoneComparison.freelancerLabel', 'Freelancer'),
    freelancerProposal: t('proposalMilestoneComparison.freelancerProposal', 'Kế hoạch bạn đề xuất'),
    varianceLabel: t('proposalMilestoneComparison.varianceLabel', 'Biến động kế hoạch'),
    addedLabel: addedLabel || t('proposalMilestoneComparison.addedLabel', 'Thêm mới'),
    removedLabel: removedLabel || t('proposalMilestoneComparison.removedLabel', 'Đã gỡ'),
    modifiedLabel: t('proposalMilestoneComparison.modifiedLabel', 'Có sửa đổi'),
    unchangedLabel: t('proposalMilestoneComparison.unchangedLabel', 'Trùng khớp'),
    emptyLabel: emptyLabel || t('proposalMilestoneComparison.emptyLabel', 'Không có dữ liệu milestone để so sánh'),
    workItemsLabel: workItemsLabel || t('proposalMilestoneComparison.workItemsLabel', 'Đầu việc (Work Items)'),
    milestoneLabel: t('proposalMilestoneComparison.milestoneLabel', 'Mốc {{number}}'),
    deliverables: t('proposalMilestoneComparison.deliverables', 'Sản phẩm bàn giao'),
    noDeliverables: t('proposalMilestoneComparison.noDeliverables', 'Không có mô tả bàn giao'),
    acceptanceCriteria: t('proposalMilestoneComparison.acceptanceCriteria', 'Tiêu chí nghiệm thu'),
    duration: t('proposalMilestoneComparison.duration', 'Thời lượng'),
    deadline: t('proposalMilestoneComparison.deadline', 'Hạn chót'),
    budget: t('proposalMilestoneComparison.budget', 'Ngân sách'),
    diffSame: t('proposalMilestoneComparison.diffSame', 'Không chênh lệch (0 G-coin)'),
    diffHigher: t('proposalMilestoneComparison.diffHigher', '+{{amount}} G-coin so với gốc'),
    diffLower: t('proposalMilestoneComparison.diffLower', '-{{amount}} G-coin so với gốc'),
    diffEqualAmount: t('proposalMilestoneComparison.diffEqualAmount', 'Bằng gốc'),
    diffLongerDuration: t('proposalMilestoneComparison.diffLongerDuration', 'Dài hơn (+{{duration}} so với gốc)'),
    diffShorterDuration: t('proposalMilestoneComparison.diffShorterDuration', 'Ngắn hơn ({{duration}} so với gốc)'),
    diffEqualDuration: t('proposalMilestoneComparison.diffEqualDuration', 'Khớp thời gian gốc'),
    weeksUnit: t('proposalMilestoneComparison.weeksUnit', 'tuần'),
    daysUnit: t('proposalMilestoneComparison.daysUnit', 'ngày'),
    tableView: t('proposalMilestoneComparison.tableView', 'Bảng tổng quan'),
    cardView: t('proposalMilestoneComparison.cardView', 'Thẻ chi tiết'),
    colMilestone: t('proposalMilestoneComparison.colMilestone', 'Milestone / Giai đoạn'),
    colClientPlan: t('proposalMilestoneComparison.colClientPlan', 'Kế hoạch gốc (Client)'),
    colFreelancerPlan: t('proposalMilestoneComparison.colFreelancerPlan', 'Đề xuất mới (Freelancer)'),
    colBudget: t('proposalMilestoneComparison.colBudget', 'Ngân sách'),
    colTimeline: t('proposalMilestoneComparison.colTimeline', 'Thời gian & Hạn chót'),
    colDeliverables: t('proposalMilestoneComparison.colDeliverables', 'Bàn giao & Đầu việc'),
    totalMilestones: t('proposalMilestoneComparison.totalMilestones', '{{count}} mốc'),
    totalWorkItems: t('proposalMilestoneComparison.totalWorkItems', '{{count}} đầu việc'),
    milestonesVariance: t('proposalMilestoneComparison.milestonesVariance', '{{count}} mốc chênh lệch'),
    equalBudget: t('proposalMilestoneComparison.equalBudget', 'Trùng khớp 100%'),
  };

  if ((!clientMilestones || clientMilestones.length === 0) && (!freelancerMilestones || freelancerMilestones.length === 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-text-muted bg-surface">
        <AlertCircle size={20} className="mx-auto mb-1.5 text-text-muted opacity-60" />
        <p>{labels.emptyLabel}</p>
      </div>
    );
  }

  const pairs = matchItems(clientMilestones || [], freelancerMilestones || []);

  // Summary Metrics
  const totalClientBudget = (clientMilestones || []).reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const totalFreelancerBudget = (freelancerMilestones || []).reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const budgetDelta = totalFreelancerBudget - totalClientBudget;
  const budgetDeltaPct = totalClientBudget > 0 ? Math.round((budgetDelta / totalClientBudget) * 100) : 0;

  const clientWorkItemsCount = (clientMilestones || []).reduce((acc, m) => acc + (m.workItems?.length || 0), 0);
  const freelancerWorkItemsCount = (freelancerMilestones || []).reduce((acc, m) => acc + (m.workItems?.length || 0), 0);

  const addedCount = pairs.filter(p => !p.client && Boolean(p.freelancer)).length;
  const removedCount = pairs.filter(p => Boolean(p.client) && !p.freelancer).length;
  const modifiedCount = pairs.filter(
    p => p.client && p.freelancer && !itemsEqual(p.client, p.freelancer, MILESTONE_CORE_FIELDS)
  ).length;
  const matchedCount = pairs.filter(
    p => p.client && p.freelancer && itemsEqual(p.client, p.freelancer, MILESTONE_CORE_FIELDS)
  ).length;

  return (
    <section className="space-y-4 font-sans">
      {/* ══════ 1. EXECUTIVE SUMMARY DASHBOARD ══════ */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Title Bar + View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3 border-b border-border">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0 shadow-2xs">
                <Scale size={15} />
              </span>
              <span>{labels.title}</span>
            </h3>
            <p className="text-xs text-text-muted">{labels.subtitle}</p>
          </div>

          {/* View Mode Toggle Segment */}
          <div className="grid grid-cols-2 sm:flex sm:items-center rounded-xl bg-surface-muted p-1 border border-border shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-surface text-brand shadow-xs border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <TableProperties size={13} />
              <span>{labels.tableView}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-surface text-brand shadow-xs border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <LayoutGrid size={13} />
              <span>{labels.cardView}</span>
            </button>
          </div>
        </div>

        {/* 3 Solid Neutral Metric Cards with subtle Brand touch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card 1: Client Baseline */}
          <div className="rounded-xl border border-border bg-surface-muted/50 p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <User size={13} />
              <span>{labels.clientBaseline}</span>
            </span>

            <div className="space-y-0.5">
              <div className="text-lg font-bold text-text-primary flex items-center gap-1.5">
                <GCoinIcon size={16} />
                <span>{formatGigCoinNumber(totalClientBudget)} G-coin</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted">
                ≈ {formatGigCoinToVnd(totalClientBudget)}
              </p>
            </div>

            <div className="text-[11px] font-semibold text-text-muted pt-1 border-t border-border flex items-center justify-between">
              <span>{clientMilestones?.length || 0} mốc</span>
              <span>•</span>
              <span>{clientWorkItemsCount} đầu việc</span>
            </div>
          </div>

          {/* Card 2: Freelancer Proposal */}
          <div className="rounded-xl border border-brand/30 bg-surface-muted/50 p-3.5 space-y-2 ring-1 ring-brand/10">
            <span className="text-[11px] font-bold text-brand flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={13} />
              <span>{labels.freelancerProposal}</span>
            </span>

            <div className="space-y-0.5">
              <div className="text-lg font-black text-brand flex items-center gap-1.5">
                <GCoinIcon size={16} />
                <span>{formatGigCoinNumber(totalFreelancerBudget)} G-coin</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted">
                ≈ {formatGigCoinToVnd(totalFreelancerBudget)}
              </p>
            </div>

            <div className="text-[11px] font-semibold text-text-muted pt-1 border-t border-border flex items-center justify-between">
              <span>{freelancerMilestones?.length || 0} mốc</span>
              <span>•</span>
              <span>{freelancerWorkItemsCount} đầu việc</span>
            </div>
          </div>

          {/* Card 3: Net Variance */}
          <div className="rounded-xl border border-border bg-surface-muted/50 p-3.5 space-y-2 sm:col-span-2 lg:col-span-1">
            <span className="text-[11px] font-bold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <Scale size={13} />
              <span>{labels.varianceLabel}</span>
            </span>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-text-primary flex items-center gap-1">
                  {budgetDelta === 0 ? <Minus size={16} /> : budgetDelta > 0 ? <TrendingUp size={16} className="text-amber-500" /> : <TrendingDown size={16} className="text-emerald-600" />}
                  <span className={budgetDelta > 0 ? 'text-amber-500 font-extrabold' : budgetDelta < 0 ? 'text-emerald-600 font-extrabold' : ''}>
                    {budgetDelta > 0 ? `+${formatGigCoinNumber(budgetDelta)}` : formatGigCoinNumber(budgetDelta)} G-coin
                  </span>
                </span>
                {budgetDelta !== 0 && (
                  <span className="text-[11px] font-bold text-text-muted">
                    ({budgetDeltaPct > 0 ? `+${budgetDeltaPct}%` : `${budgetDeltaPct}%`})
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-text-muted">
                {budgetDelta === 0 ? labels.equalBudget : `Chênh lệch: ≈ ${formatGigCoinToVnd(Math.abs(budgetDelta))}`}
              </p>
            </div>

            {/* Scope Diff Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border text-[10.5px] font-bold">
              {matchedCount > 0 && (
                <span className="bg-surface text-text-secondary px-2 py-0.5 rounded border border-border">
                  {matchedCount} {labels.unchangedLabel.toLowerCase()}
                </span>
              )}
              {modifiedCount > 0 && (
                <span className="bg-surface text-text-primary px-2 py-0.5 rounded border border-border flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                  {modifiedCount} {labels.modifiedLabel.toLowerCase()}
                </span>
              )}
              {addedCount > 0 && (
                <span className="bg-surface text-text-primary px-2 py-0.5 rounded border border-border flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  {addedCount} {labels.addedLabel.toLowerCase()}
                </span>
              )}
              {removedCount > 0 && (
                <span className="bg-surface text-text-muted px-2 py-0.5 rounded border border-border flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" />
                  {removedCount} {labels.removedLabel.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ 2. CONTENT VIEW (TABLE MATRIX OR DETAILED CARDS) ══════ */}
      {viewMode === 'table' ? (
        <div className="space-y-3">
          {/* Desktop Table (Visible on md and up) */}
          <div className="hidden md:block rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-surface-muted border-b border-border text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                    <th className="p-3 w-[15%]">{labels.colMilestone}</th>
                    <th className="p-3 w-[27%]">{labels.colClientPlan}</th>
                    <th className="p-3 w-[28%]">{labels.colFreelancerPlan}</th>
                    <th className="p-3 w-[15%]">{labels.colBudget}</th>
                    <th className="p-3 w-[15%]">{labels.colTimeline}</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair, index) => (
                    <MatrixTableRow
                      key={pair.client?.id || pair.freelancer?.id || `table-row-${index}`}
                      pair={pair}
                      index={index}
                      labels={labels}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Responsive Cards (Visible on screens smaller than md) */}
          <div className="block md:hidden space-y-3">
            {pairs.map((pair, index) => (
              <MatrixMobileCard
                key={pair.client?.id || pair.freelancer?.id || `mobile-matrix-card-${index}`}
                pair={pair}
                index={index}
                labels={labels}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {pairs.map((pair, index) => (
            <DetailedCardItem
              key={pair.client?.id || pair.freelancer?.id || `card-item-${index}`}
              pair={pair}
              index={index}
              labels={labels}
            />
          ))}
        </div>
      )}
    </section>
  );
}
export default MilestonePlanComparison;
