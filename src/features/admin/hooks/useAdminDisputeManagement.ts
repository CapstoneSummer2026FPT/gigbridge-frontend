import { useEffect, useMemo, useRef, useState } from 'react';
import { adminGetAPI, adminPatchAPI, adminPostAPI } from '../../../api/adminAPI';
import type { AdminResolveDisputePayload } from '../../../api/adminAPI/POST';
import { onChatHubReconnected, retainChatHubConnection } from '../../../shared/realtime/chatHubConnection';
import type { ConversationMessageResponse } from '../../../api/messageAPI/GET';
import { DisputeMessageRecipient } from '../../../api/messageAPI/GET';
import { MilestoneStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import { AccountStatus, UserViolationType, type AdminDisputeDetail, type AdminDisputeListItem } from '../../../types/models/AdminDispute';
import { DisputeMilestoneOutcome, DisputeResolution, DisputeStatus, EvidenceRequestTarget, type DisputeEvidence } from '../../../types/models/Dispute';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

export interface EvidenceRequestState {
  reason: string;
  deadline: string;
  target: EvidenceRequestTarget;
}

export interface ViolationState {
  isViolation: boolean;
  violationType: UserViolationType | null;
  reason: string;
  description: string;
}

export const emptyViolation = (): ViolationState => ({
  isViolation: false,
  violationType: null,
  reason: '',
  description: '',
});

type MilestoneDecision = { outcome: DisputeMilestoneOutcome; release: string; refund: string; penalty: string; reason: string };

// Every milestone the admin needs a Release/Refund/Penalty allocation for — must stay in
// sync with AdminResolveDisputeModal's `relevantMilestones` (both read the exact same rule)
// so the rendered rows and the decisions actually submitted never diverge. Terminate:
// every locked milestone. Keep Active: whatever is currently ticked in the sequential
// top-to-bottom checklist (`selectedMilestoneIds`).
const getRelevantMilestoneIds = (
  dispute: AdminDisputeDetail,
  contractAction: number,
  selectedMilestoneIds: string[]
): Set<string> =>
  contractAction === 0
    ? new Set(selectedMilestoneIds)
    : new Set(
        dispute.milestones
          .filter((milestone) => milestone.lockedAmount > 0)
          .map((milestone) => milestone.milestoneId)
      );

const buildDefaultMilestoneDecision = (milestone: AdminDisputeDetail['milestones'][number]): MilestoneDecision => {
  const defaults =
    milestone.status === MilestoneStatus.Submitted || milestone.status === MilestoneStatus.Approved
      ? { outcome: DisputeMilestoneOutcome.Accepted, release: milestone.lockedAmount.toFixed(2), refund: '0.00' }
      : milestone.status === MilestoneStatus.Pending || milestone.status === MilestoneStatus.InProgress
      ? { outcome: DisputeMilestoneOutcome.Rejected, release: '0.00', refund: milestone.lockedAmount.toFixed(2) }
      : {
          outcome: DisputeMilestoneOutcome.PartiallyAccepted,
          release: (milestone.lockedAmount / 2).toFixed(2),
          refund: (milestone.lockedAmount - milestone.lockedAmount / 2).toFixed(2),
        };
  return { ...defaults, penalty: '0.00', reason: '' };
};

export type DisputeStatusGroup = 'all' | 'waiting_admin' | 'in_progress' | 'resolved' | 'closed';

export const getDisputeGroup = (status: DisputeStatus): DisputeStatusGroup => {
  if (status === DisputeStatus.WaitingAdmin) return 'waiting_admin';
  if (status === DisputeStatus.InProgress)   return 'in_progress';
  if (status === DisputeStatus.Resolved)     return 'resolved';
  return 'closed';
};

export const GROUP_LABELS: Record<DisputeStatusGroup, string> = {
  all: 'All Cases',
  waiting_admin: 'Waiting Admin',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const STATUS_GROUPS: DisputeStatusGroup[] = [
  'all',
  'waiting_admin',
  'in_progress',
  'resolved',
  'closed',
];

export const STATUS_FILTERS = STATUS_GROUPS;

export const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.WaitingAdmin]: 'Waiting Admin',
  [DisputeStatus.InProgress]:   'In Progress',
  [DisputeStatus.Resolved]:     'Resolved',
  [DisputeStatus.Closed]:       'Closed',
};

export const resolutionLabels: Record<DisputeResolution, string> = {
  [DisputeResolution.ClientFavored]: 'Client Favored',
  [DisputeResolution.FreelancerFavored]: 'Freelancer Favored',
  [DisputeResolution.Split]: 'Split',
  [DisputeResolution.Dismissed]: 'Dismissed',
};

export const accountStatusLabels: Record<AccountStatus, string> = {
  [AccountStatus.Active]: 'Active',
  [AccountStatus.Suspended]: 'Suspended for 7 days',
  [AccountStatus.Banned]: 'Permanently banned',
};

export const apiError = (status: number, message: string): string => {
  if (status === 401) return 'Your administrator session has expired.';
  if (status === 403) return 'Administrator access is required.';
  if (status === 404) return 'The dispute could not be found.';
  return message || 'The request could not be completed.';
};

export const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export const formatSize = (bytes: number | null): string => {
  if (bytes === null) return 'Size unavailable';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export type InvestigationTab = 'dispute' | 'conversation' | 'contract' | 'milestones' | 'evidence' | 'audit' | 'userTimeline' | 'workspace';

export function useAdminDisputeManagement() {
  const [disputes, setDisputes] = useState<AdminDisputeListItem[]>([]);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<DisputeStatusGroup>('all');
  const [search, setSearch] = useState('');
  const [selectedDisputeId, setSelectedDisputeId] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<AdminDisputeDetail | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [evidenceRequest, setEvidenceRequest] = useState<EvidenceRequestState>({
    reason: '',
    deadline: '',
    target: EvidenceRequestTarget.Both,
  });
  const [activeTab, setActiveTab] = useState<InvestigationTab>('dispute');
  const [workspaceMessages, setWorkspaceMessages] = useState<ConversationMessageResponse[]>([]);
  const [disputeMessages, setDisputeMessages] = useState<ConversationMessageResponse[]>([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMessageFiles, setAdminMessageFiles] = useState<File[]>([]);
  const [adminMessageRecipient, setAdminMessageRecipient] = useState<DisputeMessageRecipient>(DisputeMessageRecipient.Both);
  const [sendingMessage, setSendingMessage] = useState(false);
  const disputeConversationIdRef = useRef<string | null>(null);

  const [milestoneDecisions, setMilestoneDecisions] = useState<
    Record<string, { outcome: DisputeMilestoneOutcome; release: string; refund: string; penalty: string; reason: string }>
  >({});
  // Keep Active only: ordered ids of the sequential top-to-bottom "mark Complete" selection.
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([]);
  const [clientViolation, setClientViolation] = useState<ViolationState>(emptyViolation);
  const [freelancerViolation, setFreelancerViolation] = useState<ViolationState>(emptyViolation);

  // Scroll refs for the chat columns
  const freelancerChatEndRef = useRef<HTMLDivElement>(null);
  const clientChatEndRef = useRef<HTMLDivElement>(null);

  // Resolve dialog fields
  const [resolution, setResolution] = useState<DisputeResolution>(DisputeResolution.ClientFavored);
  const [resolutionNote, setResolutionNote] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [contractAction, setContractAction] = useState<number>(0);

  // Fetch disputes list
  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoadingList(true);
      setError(null);
      const response = await adminGetAPI.getDisputes({
        page: 1,
        pageSize: 100,
        search: search.trim() || undefined,
      });
      if (cancelled) return;

      if (!response.success || !response.data) {
        setDisputes([]);
        setTotalItems(0);
        setError(apiError(response.statusCode, response.message));
        setLoadingList(false);
        return;
      }

      setDisputes(response.data.items);
      setTotalItems(response.data.totalItems);
      setSelectedDisputeId((current) =>
        response.data!.items.some((item) => item.id === current)
          ? current
          : response.data!.items[0]?.id ?? ''
      );
      setLoadingList(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [search, refreshKey]);

  // Fetch dispute details
  useEffect(() => {
    let cancelled = false;
    const loadDetail = async () => {
      if (!selectedDisputeId) {
        setSelectedDispute(null);
        return;
      }

      setLoadingDetail(true);
      const response = await adminGetAPI.getDisputeDetail(selectedDisputeId);
      if (cancelled) return;
      if (!response.success || !response.data) {
        setSelectedDispute(null);
        setError(apiError(response.statusCode, response.message));
      } else {
        setSelectedDispute(response.data);
      }
      setLoadingDetail(false);
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedDisputeId]);

  // Fetch conversation messages
  useEffect(() => {
    if (!selectedDispute) return;
    const load = async (conversationId: string | null, setter: (items: ConversationMessageResponse[]) => void) => {
      if (!conversationId) {
        setter([]);
        return;
      }
      const response = await adminGetAPI.getDisputeConversationMessages(selectedDispute.id, conversationId);
      setter(response.success ? response.data ?? [] : []);
    };
    void load(selectedDispute.conversations.workspaceConversationId, setWorkspaceMessages);

    const targetConvId =
      selectedDispute.conversations.disputeConversationId ||
      selectedDispute.conversations.workspaceConversationId;
    void load(targetConvId, setDisputeMessages);
  }, [selectedDispute]);

  // SignalR realtime updates
  useEffect(() => {
    const conversationId =
      selectedDispute?.conversations.disputeConversationId ||
      selectedDispute?.conversations.workspaceConversationId ||
      null;
    disputeConversationIdRef.current = conversationId;
    if (!conversationId) return;
    let disposed = false;
    const lease = retainChatHubConnection();
    const connection = lease.connection;

    const receive = (payload: ConversationMessageResponse) => {
      if (disposed || payload.conversationId !== disputeConversationIdRef.current) return;
      setDisputeMessages((current) =>
        current.some(
          (item) =>
            item.messageId === payload.messageId ||
            (payload.clientMessageId && item.clientMessageId === payload.clientMessageId)
        )
          ? current
          : [...current, payload]
      );
    };
    connection.on('ReceiveMessage', receive);
    const stopReconnect = onChatHubReconnected(() => {
      if (!disposed) void connection.invoke('JoinConversation', conversationId);
    });
    void lease.ready
      .then(() => (disposed ? undefined : connection.invoke('JoinConversation', conversationId)))
      .catch(() => undefined);
    return () => {
      disposed = true;
      connection.off('ReceiveMessage', receive);
      stopReconnect();
      void connection.invoke('LeaveConversation', conversationId).catch(() => undefined);
      lease.release();
    };
  }, [selectedDispute?.conversations.disputeConversationId, selectedDispute?.conversations.workspaceConversationId]);

  // Auto-scroll chat columns
  useEffect(() => {
    freelancerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    clientChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [disputeMessages]);

  const filteredDisputes = useMemo(() => {
    if (selectedStatusGroup === 'all') return disputes;
    return disputes.filter((item) => getDisputeGroup(item.status) === selectedStatusGroup);
  }, [disputes, selectedStatusGroup]);

  useEffect(() => {
    if (filteredDisputes.length > 0 && !filteredDisputes.some((item) => item.id === selectedDisputeId)) {
      setSelectedDisputeId(filteredDisputes[0].id);
    }
  }, [filteredDisputes, selectedDisputeId]);

  const stats = useMemo(
    () => ({
      total: disputes.length,
      waitingAdmin: disputes.filter((item) => getDisputeGroup(item.status) === 'waiting_admin').length,
      inProgress: disputes.filter((item) => getDisputeGroup(item.status) === 'in_progress').length,
      resolved: disputes.filter((item) => getDisputeGroup(item.status) === 'resolved').length,
      closed: disputes.filter((item) => getDisputeGroup(item.status) === 'closed').length,
    }),
    [disputes]
  );

  const allocationTotals = useMemo(
    () =>
      Object.values(milestoneDecisions).reduce(
        (totals, decision) => ({
          release: totals.release + Number(decision.release || 0),
          refund: totals.refund + Number(decision.refund || 0),
          penalty: totals.penalty + Number(decision.penalty || 0),
        }),
        { release: 0, refund: 0, penalty: 0 }
      ),
    [milestoneDecisions]
  );

  const allocationHasError = (milestoneId: string) => {
    if (!selectedDispute) return true;
    const milestone = selectedDispute.milestones.find((item) => item.milestoneId === milestoneId);
    const decision = milestoneDecisions[milestoneId];
    if (!milestone || !decision) return true;
    const release = Number(decision.release || 0);
    const refund = Number(decision.refund || 0);
    const penalty = Number(decision.penalty || 0);
    if ([release, refund, penalty].some((value) => !Number.isFinite(value) || value < 0)) return true;
    if (Math.abs(release + refund + penalty - milestone.lockedAmount) >= 0.01) return true;
    if (penalty > 0 && !decision.reason.trim()) return true;
    const override =
      milestone.status === MilestoneStatus.Submitted || milestone.status === MilestoneStatus.Approved
        ? Math.abs(release - milestone.lockedAmount) >= 0.01 || refund >= 0.01 || penalty >= 0.01
        : milestone.status === MilestoneStatus.Pending || milestone.status === MilestoneStatus.InProgress
        ? Math.abs(refund - milestone.lockedAmount) >= 0.01 || release >= 0.01 || penalty >= 0.01
        : false;
    return override && !decision.reason.trim();
  };

  const violationHasError = (violation: ViolationState) =>
    violation.isViolation && (violation.violationType === null || !violation.reason.trim());

  const applyUpdatedDetail = (detail: AdminDisputeDetail) => {
    setSelectedDispute(detail);
    setRefreshKey((value) => value + 1);
  };

  const updateStatus = async (targetStatus: DisputeStatus) => {
    if (!selectedDispute || actionLoading) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const response = await adminPatchAPI.updateDisputeStatus(selectedDispute.id, targetStatus);
    setActionLoading(false);

    if (!response.success || !response.data) {
      const fallback = apiError(response.statusCode, response.message);
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      else setError(fallback);
      return;
    }

    applyUpdatedDetail(response.data);
    setSuccess(`Dispute moved to ${statusLabels[targetStatus]}.`);
  };

  const requestEvidenceSubmit = async () => {
    if (!selectedDispute || actionLoading) return;
    if (!evidenceRequest.reason.trim()) {
      showValidationToast('Evidence request reason is required.', { fallback: 'Evidence request reason is required.' });
      window.document.getElementById('admin-evidence-request-reason')?.focus();
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const response = await adminPostAPI.requestEvidence(
      selectedDispute.id,
      evidenceRequest.reason.trim(),
      evidenceRequest.deadline || null,
      evidenceRequest.target
    );
    setActionLoading(false);

    if (!response.success || !response.data) {
      const fallback = apiError(response.statusCode, response.message);
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      else setError(fallback);
      return;
    }

    applyUpdatedDetail(response.data);
    setShowEvidenceDialog(false);
    setEvidenceRequest({ reason: '', deadline: '', target: EvidenceRequestTarget.Both });
    setSuccess('Evidence requested. Participants were notified.');
  };

  const resolveCase = async () => {
    if (!selectedDispute || actionLoading) return;
    const relevantMilestoneIds = getRelevantMilestoneIds(selectedDispute, contractAction, selectedMilestoneIds);
    const invalidMilestoneId = [...relevantMilestoneIds].find(allocationHasError);
    const validationMessages: string[] = [];
    if (!resolutionNote.trim()) validationMessages.push('Resolution Note is required.');
    if (invalidMilestoneId) validationMessages.push('Every milestone allocation must match its locked amount and include required override reasons.');
    if (violationHasError(clientViolation)) validationMessages.push('Client violation type and reason are required.');
    if (violationHasError(freelancerViolation)) validationMessages.push('Freelancer violation type and reason are required.');
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: 'Please review the dispute resolution' });
      if (!resolutionNote.trim()) window.document.getElementById('admin-dispute-resolution-note')?.focus();
      else if (invalidMilestoneId) window.document.querySelector<HTMLElement>(`[data-allocation-field="${invalidMilestoneId}"]`)?.focus();
      else if (violationHasError(clientViolation)) window.document.querySelector<HTMLElement>('[data-client-violation-field]')?.focus();
      else window.document.querySelector<HTMLElement>('[data-freelancer-violation-field]')?.focus();
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const payload: AdminResolveDisputePayload = {
      resolution,
      resolutionNote: resolutionNote.trim(),
      internalNotes: internalNotes.trim() || undefined,
      milestoneAllocations: Object.entries(milestoneDecisions).map(([milestoneId, decision]) => ({
        milestoneId,
        outcome: decision.outcome,
        freelancerAward: Number(decision.release || 0),
        clientRefund: Number(decision.refund || 0),
        penaltyAmount: Number(decision.penalty || 0),
        reason: decision.reason.trim() || null,
      })),
      selectedMilestoneIds,
      contractAction,
      clientViolation: {
        isViolation: clientViolation.isViolation,
        violationType: clientViolation.violationType,
        reason: clientViolation.reason.trim() || null,
        description: clientViolation.description.trim() || null,
      },
      freelancerViolation: {
        isViolation: freelancerViolation.isViolation,
        violationType: freelancerViolation.violationType,
        reason: freelancerViolation.reason.trim() || null,
        description: freelancerViolation.description.trim() || null,
      },
    };

    const response = await adminPostAPI.resolveDispute(selectedDispute.id, payload);
    setActionLoading(false);

    if (!response.success || !response.data) {
      const fallback = apiError(response.statusCode, response.message);
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      else setError(fallback);
      return;
    }

    applyUpdatedDetail(response.data);
    setShowResolveDialog(false);
    setResolutionNote('');
    setInternalNotes('');
    setMilestoneDecisions({});
    setSelectedMilestoneIds([]);
    setClientViolation(emptyViolation());
    setFreelancerViolation(emptyViolation());
    setContractAction(0);
    setSuccess('Dispute resolved. Financial transactions and contract actions were executed.');
  };

  const openResolveDialog = () => {
    if (!selectedDispute) return;
    // Seeding itself is handled by the effect below, keyed on contractAction/selectedDispute
    // — starting from an empty dict guarantees it seeds fresh defaults for whatever is
    // relevant at contractAction's default value (0).
    setMilestoneDecisions({});
    setSelectedMilestoneIds([]);
    setClientViolation(emptyViolation());
    setFreelancerViolation(emptyViolation());
    setShowResolveDialog(true);
  };

  // Keeps milestoneDecisions in lockstep with which milestones the modal actually renders
  // as editable rows (AdminResolveDisputeModal's relevantMilestones), for every value of
  // contractAction — not just whatever was relevant when the dialog first opened. This is
  // what guarantees every locked milestone the admin is shown always has a real, submitted
  // decision instead of a display-only fallback that silently never reaches the request.
  useEffect(() => {
    if (!showResolveDialog || !selectedDispute) return;
    const relevantIds = getRelevantMilestoneIds(selectedDispute, contractAction, selectedMilestoneIds);
    setMilestoneDecisions((prev) => {
      const prevIds = Object.keys(prev);
      const unchanged =
        prevIds.length === relevantIds.size && prevIds.every((id) => relevantIds.has(id));
      if (unchanged) return prev;

      const next: Record<string, MilestoneDecision> = {};
      for (const milestone of selectedDispute.milestones) {
        if (!relevantIds.has(milestone.milestoneId)) continue;
        next[milestone.milestoneId] = prev[milestone.milestoneId] ?? buildDefaultMilestoneDecision(milestone);
      }
      return next;
    });
  }, [contractAction, selectedDispute, showResolveDialog, selectedMilestoneIds]);

  const sendAdminDirective = async () => {
    if (!selectedDispute || sendingMessage) return;
    if (!adminMessage.trim() && adminMessageFiles.length === 0) {
      showValidationToast('Enter a directive or attach at least one file.', {
        fallback: 'Enter a directive or attach at least one file.',
      });
      return;
    }
    const conversationId =
      selectedDispute.conversations.disputeConversationId ||
      selectedDispute.conversations.workspaceConversationId;
    if (!conversationId) return;
    setSendingMessage(true);
    setError(null);

    const response = await adminPostAPI.sendDisputeMessage(
      selectedDispute.id,
      conversationId,
      adminMessage,
      adminMessageFiles,
      adminMessageRecipient
    );

    if (!response.success) {
      setSendingMessage(false);
      if (isValidationResponse(response)) {
        showValidationToast(response, { fallback: response.message || 'Unable to send the directive.' });
      } else setError(apiError(response.statusCode, response.message));
      return;
    }

    setAdminMessage('');
    setAdminMessageFiles([]);

    // Immediately re-fetch messages so sent message appears without waiting for SignalR
    const msgRes = await adminGetAPI.getDisputeConversationMessages(selectedDispute.id, conversationId);
    if (msgRes.success && msgRes.data) {
      setDisputeMessages(msgRes.data);
    } else if (response.data) {
      const newMsg: ConversationMessageResponse = {
        messageId: response.data.messageId || String(Date.now()),
        conversationId,
        senderUserId: response.data.senderUserId || 'admin',
        senderName: response.data.senderName || 'Administrator',
        senderAvatar: response.data.senderAvatar || null,
        senderRole: UserRole.Admin,
        content: adminMessage,
        sentAt: response.data.sentAt || new Date().toISOString(),
        messageType: 10,
        attachments: response.data.attachments || [],
        disputeRecipient: adminMessageRecipient,
        isDeleted: false,
      };
      setDisputeMessages((prev) => [...prev, newMsg]);
    }

    setSendingMessage(false);
  };

  const downloadEvidenceFile = async (evidence: DisputeEvidence) => {
    if (!selectedDispute) return;
    setDownloadingId(evidence.id);
    setError(null);
    const response = await adminGetAPI.getDisputeEvidenceDownload(selectedDispute.id, evidence.id);
    setDownloadingId(null);
    if (!response.success || !response.data?.downloadUrl) {
      setError(apiError(response.statusCode, response.message));
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = response.data.downloadUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = response.data.fileName || evidence.fileName || 'evidence';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const reviewEvidence = async (evidence: DisputeEvidence) => {
    if (!selectedDispute || actionLoading || !evidence.fileName) return;
    const reviewNote = window.prompt('Optional review note') ?? '';
    setActionLoading(true);
    const response = await adminPostAPI.reviewDisputeEvidence(selectedDispute.id, evidence.id, reviewNote);
    setActionLoading(false);
    if (!response.success || !response.data) {
      setError(apiError(response.statusCode, response.message));
      return;
    }
    setSelectedDispute((current) =>
      current
        ? {
            ...current,
            evidence: current.evidence.map((item) => (item.id === evidence.id ? response.data! : item)),
          }
        : current
    );
    setSuccess('Evidence marked as reviewed.');
  };

  const resetResolveDialog = () => {
    setShowResolveDialog(false);
    setResolution(DisputeResolution.ClientFavored);
    setResolutionNote('');
    setInternalNotes('');
    setMilestoneDecisions({});
    setSelectedMilestoneIds([]);
    setClientViolation(emptyViolation());
    setFreelancerViolation(emptyViolation());
    setContractAction(0);
  };

  const freelancerMessages = useMemo(() => {
    if (!selectedDispute) return [];
    const freelancerUserId = selectedDispute.freelancer?.userId?.toLowerCase();
    const freelancerProfileId = selectedDispute.freelancer?.profileId?.toLowerCase();

    return disputeMessages.filter((msg) => {
      if (msg.disputeRecipient !== null && msg.disputeRecipient !== undefined) {
        const r = Number(msg.disputeRecipient);
        if (r === DisputeMessageRecipient.Freelancer || r === DisputeMessageRecipient.Both) return true;
        if (r === DisputeMessageRecipient.Client) return false;
      }

      if (msg.messageType === 10 || !msg.senderUserId) return true;

      const senderId = (msg.senderUserId ?? '').toLowerCase();
      if (freelancerUserId && senderId === freelancerUserId) return true;
      if (freelancerProfileId && senderId === freelancerProfileId) return true;

      const role = Number(msg.senderRole);
      const roleStr = String(msg.senderRole ?? '').toLowerCase();
      if (role === UserRole.Freelancer || roleStr === 'freelancer') return true;
      if (role === UserRole.Admin || roleStr === 'admin') return true;
      return false;
    });
  }, [disputeMessages, selectedDispute]);

  const clientMessages = useMemo(() => {
    if (!selectedDispute) return [];
    const clientUserId = selectedDispute.client?.userId?.toLowerCase();
    const clientProfileId = selectedDispute.client?.profileId?.toLowerCase();

    return disputeMessages.filter((msg) => {
      if (msg.disputeRecipient !== null && msg.disputeRecipient !== undefined) {
        const r = Number(msg.disputeRecipient);
        if (r === DisputeMessageRecipient.Client || r === DisputeMessageRecipient.Both) return true;
        if (r === DisputeMessageRecipient.Freelancer) return false;
      }

      if (msg.messageType === 10 || !msg.senderUserId) return true;

      const senderId = (msg.senderUserId ?? '').toLowerCase();
      if (clientUserId && senderId === clientUserId) return true;
      if (clientProfileId && senderId === clientProfileId) return true;

      const role = Number(msg.senderRole);
      const roleStr = String(msg.senderRole ?? '').toLowerCase();
      if (role === UserRole.Client || roleStr === 'client') return true;
      if (role === UserRole.Admin || roleStr === 'admin') return true;
      return false;
    });
  }, [disputeMessages, selectedDispute]);

  const isCaseOpen =
    selectedDispute && selectedDispute.status !== DisputeStatus.Resolved && selectedDispute.status !== DisputeStatus.Closed;

  return {
    disputes,
    filteredDisputes,
    selectedStatusGroup,
    setSelectedStatusGroup,
    search,
    setSearch,
    selectedDisputeId,
    setSelectedDisputeId,
    selectedDispute,
    totalItems,
    loadingList,
    loadingDetail,
    actionLoading,
    downloadingId,
    error,
    setError,
    success,
    setSuccess,
    setRefreshKey,
    showResolveDialog,
    setShowResolveDialog,
    showEvidenceDialog,
    setShowEvidenceDialog,
    evidenceRequest,
    setEvidenceRequest,
    activeTab,
    setActiveTab,
    workspaceMessages,
    disputeMessages,
    adminMessage,
    setAdminMessage,
    adminMessageFiles,
    setAdminMessageFiles,
    adminMessageRecipient,
    setAdminMessageRecipient,
    sendingMessage,
    milestoneDecisions,
    setMilestoneDecisions,
    selectedMilestoneIds,
    setSelectedMilestoneIds,
    clientViolation,
    setClientViolation,
    freelancerViolation,
    setFreelancerViolation,
    resolution,
    setResolution,
    resolutionNote,
    setResolutionNote,
    internalNotes,
    setInternalNotes,
    contractAction,
    setContractAction,
    freelancerChatEndRef,
    clientChatEndRef,
    stats,
    allocationTotals,
    allocationHasError,
    violationHasError,
    updateStatus,
    requestEvidenceSubmit,
    resolveCase,
    openResolveDialog,
    sendAdminDirective,
    downloadEvidenceFile,
    reviewEvidence,
    resetResolveDialog,
    freelancerMessages,
    clientMessages,
    isCaseOpen,
  };
}
