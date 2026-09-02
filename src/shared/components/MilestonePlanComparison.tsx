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

// Matches client vs freelancer items deterministically: id first (covers a
// freshly-seeded proposal milestone, which spreads the job post milestone's id
// verbatim until first save, and a reopened persisted proposal whose ids no
// longer overlap with the job post at all), falling back to ARRAY POSITION
// (not the `orderIndex` field) for everything left unmatched.
//
// Position, not orderIndex: backends are inconsistent about whether that
// field is scoped locally per-milestone or globally across the whole plan —
// e.g. ProposalWorkBreakdownItem.OrderIndex is a flat sequence across every
// milestone in the proposal, while JobPostWorkItem.OrderIndex resets to 0 per
// milestone (SubmitProposalCommandHandler.cs vs
// SaveDraftJobPostCommandHandler.cs). Comparing by that field caused every
// milestone after the first to misalign (e.g. work item "1" shown paired
// against work item "3"). The arrays passed in here are already scoped to
// what's being compared (a milestone's own work items, or the whole
// milestone list), so plain position is the only value guaranteed to mean
// the same thing on both sides.
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

const MILESTONE_FIELDS: (keyof EditableMilestonePlan)[] = [
  'title', 'description', 'amount', 'estimatedDuration', 'dueDate', 'deliverables', 'acceptanceCriteria',
];
const WORK_ITEM_FIELDS: (keyof EditablePlanWorkItem)[] = [
  'title', 'description', 'deliverables', 'estimatedDuration',
];

function itemsEqual<T extends object>(a: T | null, b: T | null, fields: (keyof T)[]): boolean {
  if (!a || !b) return false;
  return fields.every(field => normText(a[field] as string | number | null) === normText(b[field] as string | number | null));
}

const cardBase = 'rounded-2xl border p-4 space-y-2';

function WorkItemsComparison({
  clientItems,
  freelancerItems,
  workItemsLabel,
  clientLabel,
  freelancerLabel,
  addedLabel,
  removedLabel,
}: {
  clientItems: EditablePlanWorkItem[];
  freelancerItems: EditablePlanWorkItem[];
  workItemsLabel: string;
  clientLabel: string;
  freelancerLabel: string;
  addedLabel: string;
  removedLabel: string;
}) {
  if (clientItems.length === 0 && freelancerItems.length === 0) return null;
  const pairs = matchItems(clientItems, freelancerItems);

  return (
    <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{workItemsLabel}</h4>
      {pairs.map((pair, index) => (
        <WorkItemRow
          key={pair.client?.id || pair.freelancer?.id || `work-item-${index}`}
          pair={pair}
          clientLabel={clientLabel}
          freelancerLabel={freelancerLabel}
          addedLabel={addedLabel}
          removedLabel={removedLabel}
        />
      ))}
    </div>
  );
}

function WorkItemRow({
  pair,
  clientLabel,
  freelancerLabel,
  addedLabel,
  removedLabel,
}: {
  pair: MatchedPair<EditablePlanWorkItem>;
  clientLabel: string;
  freelancerLabel: string;
  addedLabel: string;
  removedLabel: string;
}) {
  const { client, freelancer } = pair;

  if (client && freelancer && itemsEqual(client, freelancer, WORK_ITEM_FIELDS)) {
    return (
      <div className="rounded-lg border border-blue-500 bg-blue-500/5 p-2.5 text-xs">
        <strong className="block text-foreground">{client.title || '—'}</strong>
        {client.description && <p className="mt-0.5 text-muted-foreground">{client.description}</p>}
        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {client.estimatedDuration && <span>⏱ {client.estimatedDuration}</span>}
          {client.deliverables && <span>📦 {client.deliverables}</span>}
        </div>
      </div>
    );
  }

  if (client && !freelancer) {
    return (
      <div className="rounded-lg border border-dashed border-blue-500/40 bg-blue-500/5 p-2.5 text-xs opacity-80">
        <div className="flex items-center justify-between gap-2">
          <strong className="line-through text-foreground">{client.title || '—'}</strong>
          <span className="shrink-0 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">{removedLabel}</span>
        </div>
        {client.description && <p className="mt-0.5 line-through text-muted-foreground">{client.description}</p>}
      </div>
    );
  }

  if (!client && freelancer) {
    return (
      <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-foreground">{freelancer.title || '—'}</strong>
          <span className="shrink-0 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700">{addedLabel}</span>
        </div>
        {freelancer.description && <p className="mt-0.5 text-muted-foreground">{freelancer.description}</p>}
        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {freelancer.estimatedDuration && <span>⏱ {freelancer.estimatedDuration}</span>}
          {freelancer.deliverables && <span>📦 {freelancer.deliverables}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {[
        { item: client, label: clientLabel, border: 'border-blue-500', bg: 'bg-blue-500/5', badge: 'bg-blue-500/15 text-blue-600' },
        { item: freelancer, label: freelancerLabel, border: 'border-yellow-500', bg: 'bg-yellow-500/10', badge: 'bg-yellow-500/20 text-yellow-700' },
      ].map(({ item, label, border, bg, badge }) => item && (
        <div key={label} className={`rounded-lg border ${border} ${bg} p-2.5 text-xs`}>
          <span className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${badge}`}>{label}</span>
          <strong className="block text-foreground">{item.title || '—'}</strong>
          {item.description && <p className="mt-0.5 text-muted-foreground">{item.description}</p>}
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {item.estimatedDuration && <span>⏱ {item.estimatedDuration}</span>}
            {item.deliverables && <span>📦 {item.deliverables}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MilestoneRow({
  pair,
  copy,
}: {
  pair: MatchedPair<EditableMilestonePlan>;
  copy: Required<Omit<MilestonePlanComparisonProps, 'clientMilestones' | 'freelancerMilestones' | 'title'>>;
}) {
  const { client, freelancer } = pair;
  const { clientLabel, freelancerLabel, addedLabel, removedLabel, workItemsLabel } = copy;

  if (client && !freelancer) {
    return (
      <div className={`${cardBase} border-dashed border-blue-500/40 bg-blue-500/5 opacity-80`}>
        <div className="flex items-center justify-between gap-2">
          <strong className="line-through text-sm text-foreground">{client.title || '—'}</strong>
          <span className="shrink-0 rounded bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-600">{removedLabel}</span>
        </div>
      </div>
    );
  }

  if (!client && freelancer) {
    return (
      <div className={`${cardBase} border-yellow-500 bg-yellow-500/10`}>
        <div className="flex items-center justify-between gap-2">
          <strong className="text-sm text-foreground">{freelancer.title || '—'}</strong>
          <span className="shrink-0 rounded bg-yellow-500/20 px-2 py-0.5 text-[11px] font-bold text-yellow-700">{addedLabel}</span>
        </div>
        <WorkItemsComparison
          clientItems={[]}
          freelancerItems={freelancer.workItems || []}
          workItemsLabel={workItemsLabel}
          clientLabel={clientLabel}
          freelancerLabel={freelancerLabel}
          addedLabel={addedLabel}
          removedLabel={removedLabel}
        />
      </div>
    );
  }

  if (client && freelancer && itemsEqual(client, freelancer, MILESTONE_FIELDS)) {
    return (
      <div className={`${cardBase} border-blue-500 bg-blue-500/5`}>
        <strong className="block text-sm text-foreground">{client.title || '—'}</strong>
        {client.description && <p className="text-xs text-muted-foreground">{client.description}</p>}
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {client.amount > 0 && <span>{client.amount} G-coin</span>}
          {client.estimatedDuration && <span>⏱ {client.estimatedDuration}</span>}
        </div>
        <WorkItemsComparison
          clientItems={client.workItems || []}
          freelancerItems={freelancer.workItems || []}
          workItemsLabel={workItemsLabel}
          clientLabel={clientLabel}
          freelancerLabel={freelancerLabel}
          addedLabel={addedLabel}
          removedLabel={removedLabel}
        />
      </div>
    );
  }

  if (client && freelancer) {
    return (
      <div className="space-y-2 rounded-2xl border border-border/60 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { item: client, label: clientLabel, border: 'border-blue-500', bg: 'bg-blue-500/5', badge: 'bg-blue-500/15 text-blue-600' },
            { item: freelancer, label: freelancerLabel, border: 'border-yellow-500', bg: 'bg-yellow-500/10', badge: 'bg-yellow-500/20 text-yellow-700' },
          ].map(({ item, label, border, bg, badge }) => (
            <div key={label} className={`rounded-xl border ${border} ${bg} p-3 space-y-1`}>
              <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${badge}`}>{label}</span>
              <strong className="block text-sm text-foreground">{item.title || '—'}</strong>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {item.amount > 0 && <span>{item.amount} G-coin</span>}
                {item.estimatedDuration && <span>⏱ {item.estimatedDuration}</span>}
                {item.dueDate && <span>📅 {item.dueDate}</span>}
              </div>
              {item.deliverables && <p className="text-[11px] text-muted-foreground">📦 {item.deliverables}</p>}
            </div>
          ))}
        </div>
        <WorkItemsComparison
          clientItems={client.workItems || []}
          freelancerItems={freelancer.workItems || []}
          workItemsLabel={workItemsLabel}
          clientLabel={clientLabel}
          freelancerLabel={freelancerLabel}
          addedLabel={addedLabel}
          removedLabel={removedLabel}
        />
      </div>
    );
  }

  return null;
}

/**
 * Read-only, side-by-side comparison of a Client's Milestone/Work Breakdown
 * plan (from the Job Post) against a Freelancer's version (their Proposal,
 * either in-progress or submitted). Identical items render merged with a
 * blue border; any difference splits into client (blue, left) vs freelancer
 * (yellow, right) cards. Added/removed items get a dedicated single-sided
 * treatment. Matching is deterministic (id, then orderIndex) — see
 * matchItems above — not fuzzy title matching.
 */
export function MilestonePlanComparison({
  clientMilestones,
  freelancerMilestones,
  title,
  clientLabel = 'Client',
  freelancerLabel = 'Freelancer',
  addedLabel = 'Added',
  removedLabel = 'Removed',
  emptyLabel = 'Nothing to compare',
  workItemsLabel = 'Work items',
}: MilestonePlanComparisonProps) {
  if (clientMilestones.length === 0 && freelancerMilestones.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  const pairs = matchItems(clientMilestones, freelancerMilestones);
  const copy = { clientLabel, freelancerLabel, addedLabel, removedLabel, emptyLabel, workItemsLabel };

  return (
    <section className="space-y-3">
      {title && <h3 className="text-sm font-bold text-foreground">{title}</h3>}
      <div className="space-y-3">
        {pairs.map((pair, index) => (
          <MilestoneRow
            key={pair.client?.id || pair.freelancer?.id || `milestone-${index}`}
            pair={pair}
            copy={copy}
          />
        ))}
      </div>
    </section>
  );
}
