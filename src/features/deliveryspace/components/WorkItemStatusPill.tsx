import { ContractWorkItemStatus } from '../../../types/models/Contract';

interface WorkItemStatusPillProps {
  status: ContractWorkItemStatus | number;
  labels: Record<string, string>;
}

const STYLES: Record<number, string> = {
  [ContractWorkItemStatus.Todo]: 'bg-slate-100 text-slate-600',
  [ContractWorkItemStatus.InProgress]: 'bg-blue-100 text-blue-700',
  [ContractWorkItemStatus.Completed]: 'bg-emerald-100 text-emerald-700',
  [ContractWorkItemStatus.RevisionRequired]: 'bg-amber-100 text-amber-700',
  [ContractWorkItemStatus.Submitted]: 'bg-indigo-100 text-indigo-700',
  [ContractWorkItemStatus.Approved]: 'bg-emerald-100 text-emerald-700',
};

const KEYS: Record<number, string> = {
  [ContractWorkItemStatus.Todo]: 'todo',
  [ContractWorkItemStatus.InProgress]: 'inProgress',
  [ContractWorkItemStatus.Completed]: 'completed',
  [ContractWorkItemStatus.RevisionRequired]: 'revisionRequired',
  [ContractWorkItemStatus.Submitted]: 'submitted',
  [ContractWorkItemStatus.Approved]: 'approved',
};

export const WorkItemStatusPill = ({ status, labels }: WorkItemStatusPillProps) => {
  const key = KEYS[Number(status)] ?? 'todo';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STYLES[Number(status)] ?? STYLES[ContractWorkItemStatus.Todo]
      }`}
    >
      {labels[key] ?? key}
    </span>
  );
};
