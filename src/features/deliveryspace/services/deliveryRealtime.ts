import { subscribeNotificationHubEvent } from '../../notifications/services/notificationHubConnection';

/**
 * Wire-level helpers for the delivery space's live updates.
 *
 * Everything here is deliberately forgiving about payload shape. The frames come from four
 * different backend publishers, travel through two hubs, and are read by a screen whose only job
 * is "refetch when something moved" — so a payload we cannot fully parse should still trigger a
 * refresh rather than being silently dropped.
 */

/** Chat-hub frames the delivery flow reacts to. Names mirror the backend publishers exactly. */
export const DELIVERY_HUB_EVENTS = [
  'WorkItemSubmitted',
  'WorkItemReviewed',
  'WorkItemUpdated',
  'MilestoneStatusChanged',
  // Milestone-level delivery (contracts not on the work item flow) announces its submit here.
  'DeliverableSubmitted',
] as const;

export const MILESTONE_COMPLETED_EVENT = 'MilestoneAutoCompleted';

export interface DeliveryRealtimePayload {
  eventId?: string;
  contractId?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  approvedAt?: string;
  nextMilestoneTitle?: string | null;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Guid comparison ignores casing and surrounding whitespace: the server writes lowercase "D"
 * format, while route params and component props can carry whatever the link that produced them
 * happened to contain.
 */
export const normalizeId = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

/** Reads one logical field, tolerating both the camelCase and PascalCase spellings. */
const readField = (payload: unknown, name: string): unknown => {
  if (!isRecord(payload)) return undefined;
  const camel = name.charAt(0).toLowerCase() + name.slice(1);
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  return payload[camel] ?? payload[pascal];
};

export const readPayload = (payload: unknown): DeliveryRealtimePayload => ({
  eventId: readField(payload, 'eventId') as string | undefined,
  contractId: readField(payload, 'contractId') as string | undefined,
  milestoneId: readField(payload, 'milestoneId') as string | undefined,
  milestoneTitle: readField(payload, 'milestoneTitle') as string | undefined,
  approvedAt: readField(payload, 'approvedAt') as string | undefined,
  nextMilestoneTitle: (readField(payload, 'nextMilestoneTitle') as string | null | undefined) ?? null,
});

/**
 * True when a frame concerns the contract on screen.
 *
 * A payload that carries no contract id at all is accepted rather than discarded — the cost of
 * being wrong is one redundant GET, whereas dropping a frame leaves the screen stale until the
 * next poll. Only a payload that names a *different* contract is filtered out.
 */
export const isForContract = (payload: unknown, contractId?: string): boolean => {
  const target = normalizeId(contractId);
  if (!target) return false;
  const incoming = normalizeId(readField(payload, 'contractId'));
  return incoming.length === 0 || incoming === target;
};

/**
 * Second, independent signal path.
 *
 * Both submit and review already create a notification for the counterparty, delivered over the
 * notification hub — a different websocket from the chat hub. Listening to it means the delivery
 * space still goes live when only one of the two connections is healthy, and costs no backend
 * change. Frames are matched loosely: the contract id appears inside the deep-link metadata, and
 * milestone-scoped notifications are treated as a match because a stale screen is worse than an
 * extra fetch.
 */
export const subscribeDeliveryNotifications = (
  getContractId: () => string | undefined,
  onSignal: () => void,
): (() => void) =>
  subscribeNotificationHubEvent<unknown>('ReceiveNotification', payload => {
    const contractId = normalizeId(getContractId());
    if (!contractId) return;

    const referenceType = normalizeId(readField(payload, 'referenceType'));
    const metadata = String(readField(payload, 'metadata') ?? '').toLowerCase();

    if (metadata.includes(contractId) || referenceType === 'milestone' || referenceType === 'contract') {
      onSignal();
    }
  });
