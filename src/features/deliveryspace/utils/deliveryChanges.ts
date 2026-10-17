import { ContractWorkItemStatus, type Milestone } from '../../../types/models/Contract';

/**
 * Turning a refetch into "did anything actually move?".
 *
 * Every signal path ends in the same GET, and most of those GETs return exactly what is already on
 * screen — a poll firing on a quiet contract, three overlapping frames for one action. Comparing a
 * signature before touching state keeps those from re-rendering the tree, and comparing the work
 * item statuses tells the screen what the other party just did so it can say so.
 */

export type DeliveryChangeKind = 'submitted' | 'approved' | 'revisionRequired' | 'updated';

export interface DeliveryRemoteChange {
  kind: DeliveryChangeKind;
  count: number;
  /** When it was observed. Doubles as the identity a toast dedupes on. */
  at: number;
}

/**
 * Everything the delivery space renders off a milestone, flattened. Anything not in here is
 * invisible on this screen, so a change to it must not cost a re-render.
 */
export const buildMilestoneSignature = (milestones: readonly Milestone[]): string =>
  milestones
    .map(milestone => {
      const workItems = milestone.workItems
        .map(item => {
          const submissions = item.submissions
            .map(submission => `${submission.submissionId}#${submission.reviewStatus}#${submission.attachments.length}`)
            .join(',');
          return `${item.workItemId}@${item.status}@${item.updatedAt ?? ''}@${submissions}`;
        })
        .join('|');
      return `${milestone.id}:${milestone.status}:${milestone.submittedAt ?? ''}:${milestone.approvedAt ?? ''}:${workItems}`;
    })
    .join(';');

const statusById = (milestones: readonly Milestone[]): Map<string, number> => {
  const statuses = new Map<string, number>();
  milestones.forEach(milestone => {
    milestone.workItems.forEach(item => statuses.set(item.workItemId, Number(item.status)));
  });
  return statuses;
};

/**
 * Classifies what changed between two snapshots, from the point of view of someone watching.
 *
 * Only transitions are counted — a work item that appears for the first time (a milestone the user
 * just switched to, the very first load) is not something the other party "just did", so it is
 * ignored. When several kinds of transition arrive in one batch the most consequential one wins:
 * a revision request the user has to act on outranks an approval that merely confirms progress.
 */
export const describeRemoteChange = (
  previous: readonly Milestone[],
  next: readonly Milestone[],
): Omit<DeliveryRemoteChange, 'at'> | null => {
  if (previous.length === 0) return null;

  const before = statusById(previous);
  const after = statusById(next);

  const moved: number[] = [];
  after.forEach((status, workItemId) => {
    const previousStatus = before.get(workItemId);
    if (previousStatus !== undefined && previousStatus !== status) moved.push(status);
  });

  if (moved.length === 0) return null;

  const countOf = (status: ContractWorkItemStatus): number =>
    moved.filter(value => value === status).length;

  const revisionRequired = countOf(ContractWorkItemStatus.RevisionRequired);
  if (revisionRequired > 0) return { kind: 'revisionRequired', count: revisionRequired };

  const submitted = countOf(ContractWorkItemStatus.Submitted);
  if (submitted > 0) return { kind: 'submitted', count: submitted };

  const approved = countOf(ContractWorkItemStatus.Approved);
  if (approved > 0) return { kind: 'approved', count: approved };

  return { kind: 'updated', count: moved.length };
};
