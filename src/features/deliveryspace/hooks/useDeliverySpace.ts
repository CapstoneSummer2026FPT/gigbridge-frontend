import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { ApiResponse } from '../../../types/common';
import {
  ContractStatus,
  MilestoneDeliveryMode,
  MilestoneStatus,
  isWorkItemAwaitingReview,
  isWorkItemDelivered,
  type ContractDto,
  type ContractWorkItem,
  type Milestone,
} from '../../../types/models/Contract';
import type { DeliveryRealtimePayload } from '../services/deliveryRealtime';
import {
  buildMilestoneSignature,
  describeRemoteChange,
  type DeliveryRemoteChange,
} from '../utils/deliveryChanges';
import { useDeliverySync } from './useDeliverySync';
import {
  addFileToDraft,
  buildWorkItemSubmissionFormData,
  createSubmissionBatchId,
  emptyDraft,
  getDraft,
  removeFileFromDraft,
  setDraftNote,
  submittableWorkItemIds,
  type MilestoneFileValidationError,
  type WorkItemDraftMap,
} from '../utils/workItemSubmission';

export interface MilestoneCompletion {
  eventId: string;
  milestoneId: string;
  milestoneTitle: string;
  nextMilestoneTitle?: string | null;
}

export interface DeliveryActionFailure {
  message: string;
  response?: ApiResponse<unknown>;
}

/**
 * Whether an update came from something this user just did or from the background. Only the
 * background kind is announced — telling people what they themselves just clicked is noise.
 */
type DeliveryUpdateOrigin = 'local' | 'remote';

/**
 * Picks the milestone the user most likely came to work on: the one named in the route, else the
 * milestone currently in progress or awaiting review, else the first one not yet finished.
 */
const resolveActiveMilestone = (
  milestones: Milestone[],
  routeMilestoneId?: string,
): Milestone | null => {
  if (milestones.length === 0) return null;

  if (routeMilestoneId) {
    const routed = milestones.find(milestone => milestone.id === routeMilestoneId);
    if (routed) return routed;
  }

  return (
    milestones.find(milestone =>
      Number(milestone.status) === MilestoneStatus.InProgress ||
      Number(milestone.status) === MilestoneStatus.Submitted) ??
    milestones.find(milestone =>
      Number(milestone.status) !== MilestoneStatus.Approved &&
      Number(milestone.status) !== MilestoneStatus.Completed) ??
    milestones[0]
  );
};

export const useDeliverySpace = (contractId?: string, routeMilestoneId?: string) => {
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(routeMilestoneId ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<WorkItemDraftMap>({});
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [completion, setCompletion] = useState<MilestoneCompletion | null>(null);
  const [remoteChange, setRemoteChange] = useState<DeliveryRemoteChange | null>(null);

  // The same completion arrives twice — once in this browser's own HTTP response and once over
  // SignalR. Remembering which ones were handled keeps the modal to a single appearance without
  // making either transport authoritative, so it still works when one of them is unavailable.
  const handledCompletionsRef = useRef<Set<string>>(new Set());
  const milestonesRef = useRef<Milestone[]>([]);
  const signatureRef = useRef('');

  /**
   * The single place a fetched milestone list reaches state.
   *
   * Most refreshes return exactly what is already on screen — a poll on a quiet contract, or three
   * overlapping signals for one action — so an unchanged snapshot is dropped before it can
   * re-render the tree. A changed one that came from the background is also diffed, because the
   * user needs to be told that the other party moved; their own action already told them.
   */
  const applyMilestones = useCallback((next: Milestone[], origin: DeliveryUpdateOrigin) => {
    const signature = buildMilestoneSignature(next);
    if (signature === signatureRef.current) return;

    const previous = milestonesRef.current;
    signatureRef.current = signature;
    milestonesRef.current = next;
    setMilestones(next);

    // A selection made before the other party moved can name work items that no longer exist;
    // acting on it could only produce a server-side rejection.
    const liveIds = new Set(next.flatMap(milestone => milestone.workItems.map(item => item.workItemId)));
    setSelectedIds(current => current.filter(id => liveIds.has(id)));

    if (origin !== 'remote') return;
    const change = describeRemoteChange(previous, next);
    if (change) setRemoteChange({ ...change, at: Date.now() });
  }, []);

  const load = useCallback(async () => {
    if (!contractId) return;

    const [contractResponse, milestoneResponse] = await Promise.all([
      contractGetAPI.getContractById(contractId),
      contractGetAPI.getMilestonesByContract(contractId),
    ]);

    if (!contractResponse.success) {
      setError(contractResponse.message ?? 'Could not load this contract.');
      setIsLoading(false);
      return;
    }

    setContract(contractResponse.data ?? null);
    applyMilestones(milestoneResponse.success ? milestoneResponse.data ?? [] : [], 'local');
    setError(milestoneResponse.success ? null : milestoneResponse.message ?? null);
    setIsLoading(false);
  }, [contractId, applyMilestones]);

  useEffect(() => {
    // A different contract must not be diffed against the previous one's snapshot.
    signatureRef.current = '';
    milestonesRef.current = [];
    setIsLoading(true);
    void load();
  }, [load]);

  const reloadMilestones = useCallback(async (origin: DeliveryUpdateOrigin = 'local') => {
    if (!contractId) return;
    const response = await contractGetAPI.getMilestonesByContract(contractId);
    if (response.success) applyMilestones(response.data ?? [], origin);
  }, [contractId, applyMilestones]);

  const handleMilestoneCompleted = useCallback((payload: DeliveryRealtimePayload) => {
    const eventId = payload.eventId
      ?? `MilestoneAutoCompleted:${payload.milestoneId ?? ''}:${payload.approvedAt ?? ''}`;
    if (handledCompletionsRef.current.has(eventId)) return;
    handledCompletionsRef.current.add(eventId);

    setCompletion({
      eventId,
      milestoneId: String(payload.milestoneId ?? ''),
      milestoneTitle: String(payload.milestoneTitle ?? ''),
      nextMilestoneTitle: payload.nextMilestoneTitle ?? null,
    });
  }, []);

  // Hub frames, the notification socket and a paced poll all land here; see useDeliverySync for
  // why the screen leans on more than one of them.
  const sync = useDeliverySync({
    contractId,
    isPaused: isBusy,
    onSync: () => reloadMilestones('remote'),
    onMilestoneCompleted: handleMilestoneCompleted,
  });

  const activeMilestone = useMemo(
    () => resolveActiveMilestone(milestones, activeMilestoneId ?? routeMilestoneId),
    [milestones, activeMilestoneId, routeMilestoneId],
  );

  const workItems = useMemo<ContractWorkItem[]>(
    () => [...(activeMilestone?.workItems ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [activeMilestone],
  );

  const usesWorkItems =
    Number(activeMilestone?.deliveryMode ?? MilestoneDeliveryMode.Legacy) === MilestoneDeliveryMode.WorkItem;

  // A disputed contract blocks every submit and review server-side, so the UI says why rather
  // than letting the user press buttons that can only fail.
  const isDisputed = Number(contract?.status ?? 0) === ContractStatus.Disputed;

  const selectMilestone = useCallback((milestoneId: string) => {
    setActiveMilestoneId(milestoneId);
    setDrafts({});
    setSelectedIds([]);
  }, []);

  const attachFile = useCallback((workItemId: string, file: File): MilestoneFileValidationError | undefined => {
    let failure: MilestoneFileValidationError | undefined;
    setDrafts(current => {
      const result = addFileToDraft(current, workItemId, file);
      failure = result.error;
      return result.drafts;
    });
    return failure;
  }, []);

  const detachFile = useCallback((workItemId: string, fileName: string) => {
    setDrafts(current => removeFileFromDraft(current, workItemId, fileName));
  }, []);

  const updateNote = useCallback((workItemId: string, note: string) => {
    setDrafts(current => setDraftNote(current, workItemId, note));
  }, []);

  const toggleSelected = useCallback((workItemId: string) => {
    setSelectedIds(current =>
      current.includes(workItemId)
        ? current.filter(id => id !== workItemId)
        : [...current, workItemId]);
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const readyToSubmitIds = useMemo(() => submittableWorkItemIds(drafts), [drafts]);

  const submitSelected = useCallback(async (): Promise<DeliveryActionFailure | null> => {
    if (!contractId || !activeMilestone || readyToSubmitIds.length === 0) return null;

    setIsBusy(true);
    setUploadProgress(0);
    try {
      const formData = buildWorkItemSubmissionFormData(
        drafts, readyToSubmitIds, createSubmissionBatchId());

      const response = await contractPostAPI.submitWorkItems(
        contractId,
        activeMilestone.id,
        formData,
        { onUploadProgress: progress => setUploadProgress(progress.percent) },
      );

      if (!response.success) return { message: response.message ?? 'Submission failed.', response };

      setDrafts({});
      await reloadMilestones();
      return null;
    } finally {
      setIsBusy(false);
      setUploadProgress(null);
    }
  }, [contractId, activeMilestone, drafts, readyToSubmitIds, reloadMilestones]);

  const applyReviewResult = useCallback((
    milestoneTitle: string,
    result: { milestoneCompleted: boolean; nextMilestoneTitle?: string | null },
    milestoneId: string,
  ) => {
    if (!result.milestoneCompleted) return;

    // Deduped against the realtime frame for the same completion.
    const eventId = `MilestoneAutoCompleted:${milestoneId}:local`;
    if (handledCompletionsRef.current.has(eventId)) return;
    handledCompletionsRef.current.add(eventId);

    setCompletion({
      eventId,
      milestoneId,
      milestoneTitle,
      nextMilestoneTitle: result.nextMilestoneTitle ?? null,
    });
  }, []);

  const reviewSelected = useCallback(async (
    approve: boolean,
    reason?: string,
  ): Promise<DeliveryActionFailure | null> => {
    if (!contractId || !activeMilestone || selectedIds.length === 0) return null;

    setIsBusy(true);
    try {
      const response = approve
        ? await contractPostAPI.approveWorkItems(contractId, activeMilestone.id, [...selectedIds])
        : await contractPostAPI.requestWorkItemRevision(
            contractId, activeMilestone.id, [...selectedIds], reason ?? '');

      if (!response.success) return { message: response.message ?? 'Review failed.', response };

      setSelectedIds([]);
      if (response.data) {
        applyReviewResult(activeMilestone.title, response.data, activeMilestone.id);
      }
      await reloadMilestones();
      return null;
    } finally {
      setIsBusy(false);
    }
  }, [contractId, activeMilestone, selectedIds, reloadMilestones, applyReviewResult]);

  const pendingReviewCount = useMemo(
    () => workItems.filter(item => isWorkItemAwaitingReview(item.status)).length,
    [workItems],
  );

  const deliveredCount = useMemo(
    () => workItems.filter(item => isWorkItemDelivered(item.status)).length,
    [workItems],
  );

  return {
    contract,
    milestones,
    activeMilestone,
    workItems,
    usesWorkItems,
    isDisputed,
    isLoading,
    error,
    drafts,
    getDraft: (workItemId: string) => getDraft(drafts, workItemId) ?? emptyDraft(),
    selectedIds,
    readyToSubmitIds,
    isBusy,
    uploadProgress,
    completion,
    pendingReviewCount,
    deliveredCount,
    /** Health of the live connection, for the indicator in the header. */
    liveStatus: sync.status,
    lastSyncedAt: sync.lastSyncedAt,
    isSyncing: sync.isSyncing,
    refreshNow: sync.syncNow,
    /** The other party's most recent move, for the screens to announce. */
    remoteChange,
    selectMilestone,
    attachFile,
    detachFile,
    updateNote,
    toggleSelected,
    clearSelection,
    submitSelected,
    reviewSelected,
    dismissCompletion: () => setCompletion(null),
    reload: load,
  };
};
