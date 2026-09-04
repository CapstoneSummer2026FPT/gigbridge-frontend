import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { ApiResponse } from '../../../types/common';
import { onChatHubReconnected, retainChatHubConnection } from '../../../shared/realtime/chatHubConnection';
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

interface RealtimePayload {
  eventId?: string;
  contractId?: string;
  ContractId?: string;
  milestoneId?: string;
  MilestoneId?: string;
  milestoneTitle?: string;
  approvedAt?: string;
  nextMilestoneTitle?: string | null;
}

const readContractId = (payload?: RealtimePayload): string =>
  payload ? String(payload.contractId ?? payload.ContractId ?? '') : '';

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

  // The same completion arrives twice — once in this browser's own HTTP response and once over
  // SignalR. Remembering which ones were handled keeps the modal to a single appearance without
  // making either transport authoritative, so it still works when one of them is unavailable.
  const handledCompletionsRef = useRef<Set<string>>(new Set());
  const contractIdRef = useRef<string | undefined>(contractId);
  contractIdRef.current = contractId;

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
    setMilestones(milestoneResponse.success ? milestoneResponse.data ?? [] : []);
    setError(milestoneResponse.success ? null : milestoneResponse.message ?? null);
    setIsLoading(false);
  }, [contractId]);

  useEffect(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  const reloadMilestones = useCallback(async () => {
    if (!contractId) return;
    const response = await contractGetAPI.getMilestonesByContract(contractId);
    if (response.success) setMilestones(response.data ?? []);
  }, [contractId]);

  // Realtime. Every payload is filtered on contractId so another contract's traffic — which arrives
  // on the same shared connection — never reloads this screen.
  useEffect(() => {
    if (!contractId) return undefined;

    const lease = retainChatHubConnection();
    const { connection } = lease;
    let disposed = false;

    const handleWorkItemEvent = (payload?: RealtimePayload): void => {
      if (readContractId(payload) !== contractIdRef.current) return;
      void reloadMilestones();
    };

    const handleCompleted = (payload?: RealtimePayload): void => {
      if (readContractId(payload) !== contractIdRef.current) return;
      void reloadMilestones();

      const eventId = payload?.eventId
        ?? `MilestoneAutoCompleted:${payload?.milestoneId ?? ''}:${payload?.approvedAt ?? ''}`;
      if (handledCompletionsRef.current.has(eventId)) return;
      handledCompletionsRef.current.add(eventId);

      setCompletion({
        eventId,
        milestoneId: String(payload?.milestoneId ?? payload?.MilestoneId ?? ''),
        milestoneTitle: String(payload?.milestoneTitle ?? ''),
        nextMilestoneTitle: payload?.nextMilestoneTitle ?? null,
      });
    };

    const events = ['WorkItemSubmitted', 'WorkItemReviewed', 'WorkItemUpdated', 'MilestoneStatusChanged'];
    events.forEach(event => connection.on(event, handleWorkItemEvent));
    connection.on('MilestoneAutoCompleted', handleCompleted);

    const stopReconnect = onChatHubReconnected(() => {
      if (!disposed) void reloadMilestones();
    });

    return () => {
      disposed = true;
      events.forEach(event => connection.off(event, handleWorkItemEvent));
      connection.off('MilestoneAutoCompleted', handleCompleted);
      stopReconnect();
      lease.release();
    };
  }, [contractId, reloadMilestones]);

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
