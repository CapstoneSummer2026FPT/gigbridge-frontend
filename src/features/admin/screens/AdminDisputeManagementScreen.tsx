import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle, Clock, Download, Paperclip, FileText, LoaderCircle,
  RefreshCw, Scale, Search, ShieldAlert, ShieldCheck, X, Briefcase, History,
  Landmark, MessageSquare, User, UserCheck, Send
} from 'lucide-react';
import { adminGetAPI, adminPatchAPI, adminPostAPI } from '../../../api/adminAPI';
import type { AdminResolveDisputePayload } from '../../../api/adminAPI/POST';
import { AppLayout } from '../../../shared/components/AppLayout';
import { AccountStatus, UserViolationType, type AdminDisputeDetail, type AdminDisputeListItem } from '../../../types/models/AdminDispute';
import { DisputeMilestoneOutcome, DisputeResolution, DisputeStatus, EvidenceRequestTarget, type DisputeEvidence } from '../../../types/models/Dispute';
import type { ConversationMessageResponse } from '../../../api/messageAPI/GET';
import { DisputeMessageRecipient } from '../../../api/messageAPI/GET';
import { MilestoneStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import * as signalR from '@microsoft/signalr';
import { getChatHubUrl } from '../../../service/apiService';
import '../styles/admin-dispute-management-screen.css';

const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.Open]: 'Open',
  [DisputeStatus.WaitingAdmin]: 'Waiting Admin',
  [DisputeStatus.UnderReview]: 'Under Review',
  [DisputeStatus.WaitingEvidence]: 'Waiting Evidence',
  [DisputeStatus.DecisionPending]: 'Decision Pending',
  [DisputeStatus.Resolved]: 'Resolved',
  [DisputeStatus.Closed]: 'Closed',
};

const resolutionLabels: Record<DisputeResolution, string> = {
  [DisputeResolution.ClientFavored]: 'Client Favored',
  [DisputeResolution.FreelancerFavored]: 'Freelancer Favored',
  [DisputeResolution.Split]: 'Split',
  [DisputeResolution.Dismissed]: 'Dismissed',
};

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatSize = (bytes: number | null): string => {
  if (bytes === null) return 'Size unavailable';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const apiError = (status: number, message: string): string => {
  if (status === 401) return 'Your administrator session has expired.';
  if (status === 403) return 'Administrator access is required.';
  if (status === 404) return 'The dispute could not be found.';
  return message || 'The request could not be completed.';
};

const STATUS_FILTERS: ('all' | DisputeStatus)[] = [
  'all',
  DisputeStatus.Open,
  DisputeStatus.WaitingAdmin,
  DisputeStatus.UnderReview,
  DisputeStatus.WaitingEvidence,
  DisputeStatus.DecisionPending,
  DisputeStatus.Resolved,
  DisputeStatus.Closed,
];

interface EvidenceRequestState {
  reason: string;
  deadline: string;
  target: EvidenceRequestTarget;
}

interface ViolationState {
  isViolation: boolean;
  violationType: UserViolationType | null;
  reason: string;
  description: string;
}

const emptyViolation = (): ViolationState => ({
  isViolation: false,
  violationType: null,
  reason: '',
  description: '',
});

const accountStatusLabels: Record<AccountStatus, string> = {
  [AccountStatus.Active]: 'Active',
  [AccountStatus.Suspended]: 'Suspended for 7 days',
  [AccountStatus.Banned]: 'Permanently banned',
};

type InvestigationTab = 'dispute' | 'conversation' | 'contract' | 'milestones' | 'evidence' | 'audit' | 'workspace';

export default function AdminDisputeManagementScreen() {
  const [disputes, setDisputes] = useState<AdminDisputeListItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | DisputeStatus>('all');
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
  const [evidenceRequest, setEvidenceRequest] = useState<EvidenceRequestState>({ reason: '', deadline: '', target: EvidenceRequestTarget.Both });
  const [activeTab, setActiveTab] = useState<InvestigationTab>('dispute');
  const [workspaceMessages, setWorkspaceMessages] = useState<ConversationMessageResponse[]>([]);
  const [disputeMessages, setDisputeMessages] = useState<ConversationMessageResponse[]>([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMessageFiles, setAdminMessageFiles] = useState<File[]>([]);
  const [adminMessageRecipient, setAdminMessageRecipient] = useState<DisputeMessageRecipient>(DisputeMessageRecipient.Both);
  const [sendingMessage, setSendingMessage] = useState(false);
  const disputeConversationIdRef = useRef<string | null>(null);
  const [milestoneDecisions, setMilestoneDecisions] = useState<Record<string, { outcome: DisputeMilestoneOutcome; release: string; refund: string; penalty: string; reason: string }>>({});
  const [clientViolation, setClientViolation] = useState<ViolationState>(emptyViolation);
  const [freelancerViolation, setFreelancerViolation] = useState<ViolationState>(emptyViolation);

  // Scroll refs for the 3 chat columns
  const freelancerChatEndRef = useRef<HTMLDivElement>(null);
  const bothChatEndRef = useRef<HTMLDivElement>(null);
  const clientChatEndRef = useRef<HTMLDivElement>(null);

  // Resolve dialog fields
  const [resolution, setResolution] = useState<DisputeResolution>(DisputeResolution.ClientFavored);
  const [resolutionNote, setResolutionNote] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [contractAction, setContractAction] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoadingList(true);
      setError(null);
      const response = await adminGetAPI.getDisputes({
        page: 1,
        pageSize: 100,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
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
  }, [selectedStatus, search, refreshKey]);

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

  useEffect(() => {
    if (!selectedDispute) return;
    const load = async (conversationId: string | null, setter: (items: ConversationMessageResponse[]) => void) => {
      if (!conversationId) { setter([]); return; }
      const response = await adminGetAPI.getDisputeConversationMessages(selectedDispute.id, conversationId);
      setter(response.success ? response.data ?? [] : []);
    };
    void load(selectedDispute.conversations.workspaceConversationId, setWorkspaceMessages);
    void load(selectedDispute.conversations.disputeConversationId, setDisputeMessages);
  }, [selectedDispute]);

  useEffect(() => {
    const conversationId = selectedDispute?.conversations.disputeConversationId ?? null;
    disputeConversationIdRef.current = conversationId;
    if (!conversationId) return;
    let disposed = false;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getChatHubUrl(), { accessTokenFactory: () => localStorage.getItem('access_token') ?? '' })
      .withAutomaticReconnect()
      .build();

    const receive = (payload: ConversationMessageResponse) => {
      if (disposed || payload.conversationId !== disputeConversationIdRef.current) return;
      setDisputeMessages(current =>
        current.some(item =>
          item.messageId === payload.messageId ||
          (payload.clientMessageId && item.clientMessageId === payload.clientMessageId)
        )
          ? current
          : [...current, payload]
      );
    };
    connection.on('ReceiveMessage', receive);
    connection.onreconnected(() => void connection.invoke('JoinConversation', conversationId));
    void connection.start().then(() => disposed ? connection.stop() : connection.invoke('JoinConversation', conversationId)).catch(() => undefined);
    return () => { disposed = true; connection.off('ReceiveMessage', receive); void connection.stop(); };
  }, [selectedDispute?.conversations.disputeConversationId]);

  // Auto-scroll chat columns when messages change
  useEffect(() => {
    freelancerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    bothChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    clientChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [disputeMessages]);

  const stats = useMemo(() => ({
    visible: disputes.length,
    open: disputes.filter((item) => item.status === DisputeStatus.Open).length,
    waitingAdmin: disputes.filter((item) => item.status === DisputeStatus.WaitingAdmin).length,
    underReview: disputes.filter((item) => item.status === DisputeStatus.UnderReview).length,
    waitingEvidence: disputes.filter((item) => item.status === DisputeStatus.WaitingEvidence).length,
    decisionPending: disputes.filter((item) => item.status === DisputeStatus.DecisionPending).length,
    resolved: disputes.filter((item) => item.status === DisputeStatus.Resolved).length,
    closed: disputes.filter((item) => item.status === DisputeStatus.Closed).length,
  }), [disputes]);

  const allocationTotals = useMemo(() => Object.values(milestoneDecisions).reduce((totals, decision) => ({
    release: totals.release + Number(decision.release || 0),
    refund: totals.refund + Number(decision.refund || 0),
    penalty: totals.penalty + Number(decision.penalty || 0),
  }), { release: 0, refund: 0, penalty: 0 }), [milestoneDecisions]);

  const allocationHasError = (milestoneId: string) => {
    if (!selectedDispute) return true;
    const milestone = selectedDispute.milestones.find(item => item.milestoneId === milestoneId);
    const decision = milestoneDecisions[milestoneId];
    if (!milestone || !decision) return true;
    const release = Number(decision.release || 0);
    const refund = Number(decision.refund || 0);
    const penalty = Number(decision.penalty || 0);
    if ([release, refund, penalty].some(value => !Number.isFinite(value) || value < 0)) return true;
    if (Math.abs(release + refund + penalty - milestone.lockedAmount) >= 0.01) return true;
    if (penalty > 0 && !decision.reason.trim()) return true;
    const override = milestone.status === MilestoneStatus.Submitted || milestone.status === MilestoneStatus.Approved
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
      setError(apiError(response.statusCode, response.message));
      return;
    }

    applyUpdatedDetail(response.data);
    setSuccess(`Dispute moved to ${statusLabels[targetStatus]}.`);
  };

  const requestEvidenceSubmit = async () => {
    if (!selectedDispute || actionLoading) return;
    if (!evidenceRequest.reason.trim()) {
      setError('Evidence request reason is required.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const response = await adminPostAPI.requestEvidence(
      selectedDispute.id,
      evidenceRequest.reason.trim(),
      evidenceRequest.deadline || null,
      evidenceRequest.target,
    );
    setActionLoading(false);

    if (!response.success || !response.data) {
      setError(apiError(response.statusCode, response.message));
      return;
    }

    applyUpdatedDetail(response.data);
    setShowEvidenceDialog(false);
    setEvidenceRequest({ reason: '', deadline: '', target: EvidenceRequestTarget.Both });
    setSuccess('Evidence requested. Participants were notified.');
  };

  const resolveCase = async () => {
    if (!selectedDispute || actionLoading) return;
    if (!resolutionNote.trim()) {
      setError('Resolution Note is required.');
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
      setError(apiError(response.statusCode, response.message));
      return;
    }

    applyUpdatedDetail(response.data);
    setShowResolveDialog(false);
    setResolutionNote('');
    setInternalNotes('');
    setMilestoneDecisions({});
    setClientViolation(emptyViolation());
    setFreelancerViolation(emptyViolation());
    setContractAction(0);
    setSuccess('Dispute resolved. Financial transactions and contract actions were executed.');
  };

  const openResolveDialog = () => {
    if (!selectedDispute) return;
    setMilestoneDecisions(Object.fromEntries(selectedDispute.milestones
      .filter(milestone => milestone.lockedAmount > 0 &&
        (milestone.status === MilestoneStatus.Disputed || milestone.milestoneId === selectedDispute.milestoneId))
      .map(milestone => {
        const defaults = milestone.status === MilestoneStatus.Submitted || milestone.status === MilestoneStatus.Approved
          ? { outcome: DisputeMilestoneOutcome.Accepted, release: milestone.lockedAmount.toFixed(2), refund: '0.00' }
          : milestone.status === MilestoneStatus.Pending || milestone.status === MilestoneStatus.InProgress
            ? { outcome: DisputeMilestoneOutcome.Rejected, release: '0.00', refund: milestone.lockedAmount.toFixed(2) }
            : { outcome: DisputeMilestoneOutcome.PartiallyAccepted, release: (milestone.lockedAmount / 2).toFixed(2), refund: (milestone.lockedAmount - milestone.lockedAmount / 2).toFixed(2) };
        return [milestone.milestoneId, { ...defaults, penalty: '0.00', reason: '' }];
      })));
    setClientViolation(emptyViolation());
    setFreelancerViolation(emptyViolation());
    setShowResolveDialog(true);
  };

  const changeContractAction = (action: number) => {
    if (!selectedDispute) return;
    setContractAction(action);
    setMilestoneDecisions(Object.fromEntries(selectedDispute.milestones
      .filter(milestone => milestone.lockedAmount > 0 &&
        (action === 1 || milestone.status === MilestoneStatus.Disputed || milestone.milestoneId === selectedDispute.milestoneId))
      .map(milestone => {
        const existing = milestoneDecisions[milestone.milestoneId];
        return [milestone.milestoneId, existing ?? {
          outcome: DisputeMilestoneOutcome.PartiallyAccepted,
          release: (milestone.lockedAmount / 2).toFixed(2),
          refund: (milestone.lockedAmount - milestone.lockedAmount / 2).toFixed(2),
          penalty: '0.00',
          reason: '',
        }];
      })));
  };

  const sendAdminMessage = async (overrideRecipient?: DisputeMessageRecipient) => {
    const targetRecipient = overrideRecipient !== undefined ? overrideRecipient : adminMessageRecipient;
    if (sendingMessage || !selectedDispute?.conversations.disputeConversationId || (!adminMessage.trim() && adminMessageFiles.length === 0)) return;
    setSendingMessage(true);
    setError(null);
    const response = await adminPostAPI.sendDisputeMessage(
      selectedDispute.id,
      selectedDispute.conversations.disputeConversationId,
      adminMessage,
      adminMessageFiles,
      targetRecipient,
    );
    setSendingMessage(false);
    if (response.success) {
      setAdminMessage('');
      setAdminMessageFiles([]);
    } else {
      setError(response.message || 'Unable to send administrative message.');
    }
  };

  const downloadEvidence = async (evidence: DisputeEvidence) => {
    if (!selectedDispute || downloadingId) return;
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
    setSelectedDispute(current => current ? { ...current, evidence: current.evidence.map(item => item.id === evidence.id ? response.data! : item) } : current);
    setSuccess('Evidence marked as reviewed.');
  };

  const resetResolveDialog = () => {
    setShowResolveDialog(false);
    setResolution(DisputeResolution.ClientFavored);
    setResolutionNote('');
    setInternalNotes('');
    setMilestoneDecisions({});
    setClientViolation(emptyViolation());
    setFreelancerViolation(emptyViolation());
    setContractAction(0);
  };

  // Categorize messages for the 3-column chat layout
  const freelancerMessages = useMemo(() => {
    return disputeMessages.filter(msg =>
      msg.disputeRecipient === DisputeMessageRecipient.Freelancer ||
      (msg.disputeRecipient === null && msg.senderRole === UserRole.Freelancer)
    );
  }, [disputeMessages]);

  const bothMessages = useMemo(() => {
    return disputeMessages.filter(msg =>
      msg.disputeRecipient === DisputeMessageRecipient.Both ||
      msg.messageType === 10 ||
      (msg.disputeRecipient === null && (msg.senderRole === UserRole.Admin || msg.senderRole === null))
    );
  }, [disputeMessages]);

  const clientMessages = useMemo(() => {
    return disputeMessages.filter(msg =>
      msg.disputeRecipient === DisputeMessageRecipient.Client ||
      (msg.disputeRecipient === null && msg.senderRole === UserRole.Client)
    );
  }, [disputeMessages]);

  const renderSingleChatMessage = (message: ConversationMessageResponse) => {
    const isOfficial = message.messageType === 10;
    return (
      <div
        key={message.messageId}
        className={`admin-chat-bubble-card ${isOfficial ? 'official-directive' : ''} ${message.senderRole === UserRole.Admin ? 'admin-sender' : ''}`}
      >
        <div className="admin-chat-bubble-header">
          <div className="admin-chat-sender-info">
            {message.senderAvatar ? (
              <img src={message.senderAvatar} alt={message.senderName || 'Sender'} className="admin-chat-avatar" />
            ) : (
              <div className="admin-chat-avatar-placeholder">
                {message.senderName ? message.senderName[0].toUpperCase() : <User size={12} />}
              </div>
            )}
            <strong className="admin-chat-sender-name">
              {message.senderName || (isOfficial ? 'Administrator' : 'Participant')}
            </strong>
            <span className={`admin-role-badge role-${message.senderRole ?? 'unknown'}`}>
              {message.senderRole === UserRole.Admin ? 'Admin' : message.senderRole === UserRole.Client ? 'Client' : message.senderRole === UserRole.Freelancer ? 'Freelancer' : 'Participant'}
            </span>
          </div>

          <time className="admin-chat-time">
            {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>

        <p className="admin-chat-content">{message.content}</p>

        {message.attachments.length > 0 && (
          <div className="admin-chat-attachment-list">
            {message.attachments.map(att => (
              <a key={att.messageAttachmentId} href={att.fileUrl} target="_blank" rel="noreferrer" className="admin-chat-attachment-link">
                <Paperclip size={12} /> {att.fileName}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="admin-disputes-wrapper">
        {/* Top Hero Section */}
        <section className="disputes-hero">
          <div>
            <p className="disputes-kicker">Dispute Arbitration Workspace</p>
            <h1>Admin Control Center</h1>
            <p>Review disputes, examine evidence, conduct 3-party arbitration, and issue official resolution verdicts.</p>
          </div>
          <div className="hero-scale-icon">
            <Scale size={32} />
          </div>
        </section>

        {/* Metric Cards Row */}
        <section className="disputes-stats">
          <div onClick={() => setSelectedStatus('all')} className={selectedStatus === 'all' ? 'active-stat' : ''}>
            <span>Total Cases</span>
            <strong>{totalItems}</strong>
          </div>
          <div onClick={() => setSelectedStatus(DisputeStatus.Open)} className={selectedStatus === DisputeStatus.Open ? 'active-stat' : ''}>
            <span>Open</span>
            <strong>{stats.open}</strong>
          </div>
          <div onClick={() => setSelectedStatus(DisputeStatus.WaitingAdmin)} className={selectedStatus === DisputeStatus.WaitingAdmin ? 'active-stat' : ''}>
            <span>Waiting Admin</span>
            <strong>{stats.waitingAdmin}</strong>
          </div>
          <div onClick={() => setSelectedStatus(DisputeStatus.UnderReview)} className={selectedStatus === DisputeStatus.UnderReview ? 'active-stat' : ''}>
            <span>Under Review</span>
            <strong>{stats.underReview}</strong>
          </div>
          <div onClick={() => setSelectedStatus(DisputeStatus.WaitingEvidence)} className={selectedStatus === DisputeStatus.WaitingEvidence ? 'active-stat' : ''}>
            <span>Waiting Evidence</span>
            <strong>{stats.waitingEvidence}</strong>
          </div>
          <div onClick={() => setSelectedStatus(DisputeStatus.DecisionPending)} className={selectedStatus === DisputeStatus.DecisionPending ? 'active-stat' : ''}>
            <span>Decision Pending</span>
            <strong>{stats.decisionPending}</strong>
          </div>
          <div onClick={() => setSelectedStatus(DisputeStatus.Resolved)} className={selectedStatus === DisputeStatus.Resolved ? 'active-stat' : ''}>
            <span>Resolved</span>
            <strong>{stats.resolved}</strong>
          </div>
          <div onClick={() => setSelectedStatus(DisputeStatus.Closed)} className={selectedStatus === DisputeStatus.Closed ? 'active-stat' : ''}>
            <span>Closed</span>
            <strong>{stats.closed}</strong>
          </div>
        </section>

        {/* Global Notifications */}
        {error && (
          <div className="dispute-admin-message error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="dispute-admin-message success">
            <CheckCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} aria-label="Dismiss message"><X size={16} /></button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <section className="disputes-toolbar">
          <label>
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search case ID, contract title, participant name, or reason..."
            />
          </label>
          <button onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingList} className="refresh-btn">
            <RefreshCw size={16} className={loadingList ? 'admin-dispute-spin' : ''} /> Refresh
          </button>
        </section>

        {/* Main Workspace Layout */}
        <section className="disputes-layout">
          {/* Left Panel: Dispute List */}
          <div className="disputes-list-card">
            <div className="disputes-filter-row">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  className={selectedStatus === status ? 'active' : ''}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status === 'all' ? 'All Cases' : statusLabels[status]}
                </button>
              ))}
            </div>

            <div className="disputes-list">
              {loadingList ? (
                <div className="admin-dispute-empty"><LoaderCircle className="admin-dispute-spin" size={24} /> Loading disputes list…</div>
              ) : disputes.length === 0 ? (
                <div className="admin-dispute-empty">No dispute cases match the selected filter.</div>
              ) : disputes.map((dispute) => (
                <button
                  key={dispute.id}
                  className={`dispute-list-item ${selectedDisputeId === dispute.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDisputeId(dispute.id)}
                >
                  <div className="dispute-list-title">
                    <strong>{dispute.contractTitle}</strong>
                    <span className={`dispute-status status-${dispute.status}`}>{statusLabels[dispute.status]}</span>
                  </div>
                  <p className="dispute-reason-preview">{dispute.reason}</p>
                  <div className="dispute-item-footer">
                    <small>Initiator: {dispute.initiatorName} ({dispute.initiatorRole ?? 'Party'})</small>
                    <small>{dispute.evidenceCount} files • {formatDate(dispute.createdAt)}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Selected Case Workspace */}
          <div className="dispute-detail-card">
            {loadingDetail ? (
              <div className="admin-dispute-empty"><LoaderCircle className="admin-dispute-spin" size={28} /> Loading dispute workspace…</div>
            ) : !selectedDispute ? (
              <div className="admin-dispute-empty">Select a dispute case from the list to view its complete workspace.</div>
            ) : (
              <>
                {/* Case Header & Quick Actions */}
                <div className="detail-card-header">
                  <div className="header-case-title">
                    <p className="disputes-kicker">Case ID: {selectedDispute.id}</p>
                    <h2>{selectedDispute.contractTitle}</h2>
                  </div>

                  <div className="header-action-buttons">
                    {selectedDispute.status === DisputeStatus.Open && (
                      <button onClick={() => void updateStatus(DisputeStatus.WaitingAdmin)} disabled={actionLoading}>
                        <Clock size={15} /> Move to Waiting
                      </button>
                    )}
                    {selectedDispute.status === DisputeStatus.WaitingAdmin && (
                      <button onClick={() => void updateStatus(DisputeStatus.UnderReview)} disabled={actionLoading} className="primary-action-btn">
                        <Clock size={15} /> Assign & Start Review
                      </button>
                    )}
                    {(selectedDispute.status === DisputeStatus.UnderReview || selectedDispute.status === DisputeStatus.WaitingEvidence) && (
                      <>
                        <button onClick={() => setShowEvidenceDialog(true)} disabled={actionLoading}>
                          <Clock size={15} /> Request Evidence
                        </button>
                        <button onClick={() => void updateStatus(DisputeStatus.DecisionPending)} disabled={actionLoading}>
                          <Clock size={15} /> Decision Pending
                        </button>
                        <button className="resolve-btn" onClick={openResolveDialog} disabled={actionLoading}>
                          <CheckCircle size={15} /> Resolve Case
                        </button>
                      </>
                    )}
                    {selectedDispute.status === DisputeStatus.DecisionPending && (
                      <button className="resolve-btn" onClick={openResolveDialog} disabled={actionLoading}>
                        <CheckCircle size={15} /> Resolve Case
                      </button>
                    )}
                    {selectedDispute.status === DisputeStatus.Resolved && (
                      <button onClick={() => void updateStatus(DisputeStatus.Closed)} disabled={actionLoading}>
                        <CheckCircle size={15} /> Close Case
                      </button>
                    )}
                  </div>
                </div>

                {/* Participant Information Banner (Client & Freelancer) */}
                <section className="admin-participants-banner">
                  {/* Client Card */}
                  <div className="admin-participant-card client">
                    <div className="participant-header">
                      <span className="role-tag client">Client</span>
                      <span className={`status-badge account-status-${selectedDispute.client.accountStatus}`}>
                        {accountStatusLabels[selectedDispute.client.accountStatus as AccountStatus]}
                      </span>
                    </div>
                    <div className="participant-body">
                      <strong>{selectedDispute.client.fullName}</strong>
                      <span className="participant-email">{selectedDispute.client.email}</span>
                      <small className="participant-violations">Violations: {selectedDispute.client.violationCount}</small>
                    </div>
                  </div>

                  {/* Freelancer Card */}
                  <div className="admin-participant-card freelancer">
                    <div className="participant-header">
                      <span className="role-tag freelancer">Freelancer</span>
                      {selectedDispute.freelancer ? (
                        <span className={`status-badge account-status-${selectedDispute.freelancer.accountStatus}`}>
                          {accountStatusLabels[selectedDispute.freelancer.accountStatus as AccountStatus]}
                        </span>
                      ) : (
                        <span className="status-badge unassigned">Unassigned</span>
                      )}
                    </div>
                    <div className="participant-body">
                      <strong>{selectedDispute.freelancer?.fullName ?? 'Not Assigned'}</strong>
                      <span className="participant-email">{selectedDispute.freelancer?.email ?? '—'}</span>
                      {selectedDispute.freelancer && (
                        <small className="participant-violations">Violations: {selectedDispute.freelancer.violationCount}</small>
                      )}
                    </div>
                  </div>
                </section>

                {/* Investigation Tabs Navigation */}
                <nav className="admin-dispute-tabs" aria-label="Investigation sections">
                  {([
                    ['dispute', 'Dispute Overview', ShieldAlert],
                    ['conversation', 'Tri-Party Chat', MessageSquare],
                    ['contract', 'Contract & Job', Briefcase],
                    ['milestones', 'Milestones & Escrow', Landmark],
                    ['evidence', 'Evidence Review', FileText],
                    ['audit', 'Audit Log', History],
                    ['workspace', 'Workspace Chat', MessageSquare],
                  ] as const).map(([tab, label, Icon]) => (
                    <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                      <Icon size={15} />
                      <span>{label}</span>
                    </button>
                  ))}
                </nav>

                {/* TAB 1: DISPUTE OVERVIEW */}
                {activeTab === 'dispute' && (
                  <div className="admin-investigation-panel">
                    <div className="dispute-detail-grid">
                      <div><span>Title</span><strong>{selectedDispute.title ?? selectedDispute.contractTitle}</strong></div>
                      <div><span>Status</span><strong>{statusLabels[selectedDispute.status]}</strong></div>
                      <div><span>Initiator</span><strong>{selectedDispute.initiatorName}</strong><small>{selectedDispute.initiatorRole}</small></div>
                      <div><span>Respondent</span><strong>{selectedDispute.respondentName ?? 'Not available'}</strong></div>
                      <div><span>Dispute Type</span><strong>{selectedDispute.relatedReport?.issueType ?? 'General Dispute'}</strong></div>
                      <div><span>Claimed Amount</span><strong>{selectedDispute.claimedAmount?.toLocaleString() ?? '0'} GigCoin</strong></div>
                      <div><span>Urgency</span><strong>{['Normal', 'High', 'Critical'][selectedDispute.urgency] ?? selectedDispute.urgency}</strong></div>
                      <div><span>Milestone Scope</span><strong>{selectedDispute.milestoneTitle ?? 'Full Contract'}</strong></div>
                    </div>

                    <section className="dispute-detail-section">
                      <h3><ShieldAlert size={17} />Dispute Description</h3>
                      <p className="admin-dispute-prewrap">{selectedDispute.description ?? selectedDispute.reason}</p>
                      <h4>Requested Resolution</h4>
                      <p className="admin-dispute-prewrap">{selectedDispute.requestedResolution ?? 'Not specified'}</p>
                    </section>

                    {(selectedDispute.status === DisputeStatus.Resolved || selectedDispute.status === DisputeStatus.Closed) && (
                      <section className="resolved-summary">
                        <CheckCircle size={20} />
                        <div>
                          <strong>{selectedDispute.resolutionLabel ?? (selectedDispute.resolution !== null ? resolutionLabels[selectedDispute.resolution] : 'Resolved')}</strong>
                          <p className="admin-dispute-prewrap">{selectedDispute.resolutionNote}</p>
                          <small>Resolved Date: {formatDate(selectedDispute.resolvedAt)}</small>
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* TAB 2: TRI-PARTY CHAT WORKSPACE (THE 3-COLUMN CHAT LAYOUT) */}
                {activeTab === 'conversation' && (
                  <section className="admin-investigation-panel tri-party-chat-workspace">
                    <div className="tri-party-chat-header">
                      <div className="title-area">
                        <h3><MessageSquare size={18} /> Tri-Party Dispute Communication</h3>
                        <p>Visually separated communication lanes between Admin, Freelancer, and Client.</p>
                      </div>
                    </div>

                    {/* 3-Column Chat Streams Layout */}
                    <div className="tri-party-streams-grid">
                      {/* Left Column: Freelancer Stream */}
                      <div className={`chat-stream-column freelancer-stream ${adminMessageRecipient === DisputeMessageRecipient.Freelancer ? 'active-target' : ''}`}>
                        <div className="stream-header freelancer">
                          <User size={15} />
                          <strong>Freelancer Channel</strong>
                          <span className="role-pill freelancer">Freelancer</span>
                        </div>
                        <div className="stream-messages-container">
                          {freelancerMessages.length === 0 ? (
                            <div className="stream-empty">No messages in Freelancer channel.</div>
                          ) : (
                            freelancerMessages.map(renderSingleChatMessage)
                          )}
                          <div ref={freelancerChatEndRef} />
                        </div>
                      </div>

                      {/* Center Column: Both Parties / Broadcast Stream */}
                      <div className={`chat-stream-column both-stream ${adminMessageRecipient === DisputeMessageRecipient.Both ? 'active-target' : ''}`}>
                        <div className="stream-header both">
                          <ShieldCheck size={15} />
                          <strong>Both Parties (Public)</strong>
                          <span className="role-pill admin">Broadcast</span>
                        </div>
                        <div className="stream-messages-container">
                          {bothMessages.length === 0 ? (
                            <div className="stream-empty">No broadcast messages sent to both parties.</div>
                          ) : (
                            bothMessages.map(renderSingleChatMessage)
                          )}
                          <div ref={bothChatEndRef} />
                        </div>
                      </div>

                      {/* Right Column: Client Stream */}
                      <div className={`chat-stream-column client-stream ${adminMessageRecipient === DisputeMessageRecipient.Client ? 'active-target' : ''}`}>
                        <div className="stream-header client">
                          <UserCheck size={15} />
                          <strong>Client Channel</strong>
                          <span className="role-pill client">Client</span>
                        </div>
                        <div className="stream-messages-container">
                          {clientMessages.length === 0 ? (
                            <div className="stream-empty">No messages in Client channel.</div>
                          ) : (
                            clientMessages.map(renderSingleChatMessage)
                          )}
                          <div ref={clientChatEndRef} />
                        </div>
                      </div>
                    </div>

                    {/* Send Controls Area */}
                    <div className="admin-chat-send-controls">
                      {/* 3 Target Action Buttons visually aligned Left, Center, Right */}
                      <div className="send-target-buttons-row">
                        <button
                          type="button"
                          className={`target-btn target-freelancer ${adminMessageRecipient === DisputeMessageRecipient.Freelancer ? 'selected' : ''}`}
                          onClick={() => setAdminMessageRecipient(DisputeMessageRecipient.Freelancer)}
                        >
                          <User size={15} />
                          <span>Send to Freelancer (Left Channel)</span>
                        </button>

                        <button
                          type="button"
                          className={`target-btn target-both ${adminMessageRecipient === DisputeMessageRecipient.Both ? 'selected' : ''}`}
                          onClick={() => setAdminMessageRecipient(DisputeMessageRecipient.Both)}
                        >
                          <ShieldCheck size={15} />
                          <span>Send to Both Parties (Center Channel)</span>
                        </button>

                        <button
                          type="button"
                          className={`target-btn target-client ${adminMessageRecipient === DisputeMessageRecipient.Client ? 'selected' : ''}`}
                          onClick={() => setAdminMessageRecipient(DisputeMessageRecipient.Client)}
                        >
                          <UserCheck size={15} />
                          <span>Send to Client (Right Channel)</span>
                        </button>
                      </div>

                      {/* Single Message Input Box */}
                      <div className="admin-chat-input-box">
                        <textarea
                          value={adminMessage}
                          onChange={event => setAdminMessage(event.target.value)}
                          placeholder={
                            adminMessageRecipient === DisputeMessageRecipient.Freelancer
                              ? "Write private administrative message to Freelancer... (use @Reporter or @Respondent)"
                              : adminMessageRecipient === DisputeMessageRecipient.Client
                              ? "Write private administrative message to Client... (use @Reporter or @Respondent)"
                              : "Write official broadcast message to Both Parties... (use @Reporter or @Respondent)"
                          }
                          rows={3}
                        />

                        <div className="composer-footer-row">
                          <label className="admin-message-file-picker">
                            <Paperclip size={16} />
                            <span>Attach files</span>
                            <input
                              type="file"
                              multiple
                              onChange={event => setAdminMessageFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                            />
                          </label>

                          {adminMessageFiles.length > 0 && (
                            <div className="attached-files-pills">
                              {adminMessageFiles.map(file => (
                                <span key={file.name} className="file-pill">{file.name}</span>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            className={`main-send-btn target-${adminMessageRecipient}`}
                            onClick={() => void sendAdminMessage()}
                            disabled={sendingMessage || (!adminMessage.trim() && adminMessageFiles.length === 0)}
                          >
                            {sendingMessage ? (
                              <LoaderCircle className="admin-dispute-spin" size={16} />
                            ) : (
                              <Send size={16} />
                            )}
                            <span>
                              {sendingMessage
                                ? 'Sending...'
                                : adminMessageRecipient === DisputeMessageRecipient.Freelancer
                                ? 'Send to Freelancer'
                                : adminMessageRecipient === DisputeMessageRecipient.Client
                                ? 'Send to Client'
                                : 'Broadcast to Both'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* TAB 3: CONTRACT & JOB POST DETAILS */}
                {activeTab === 'contract' && (
                  <section className="admin-investigation-panel">
                    <h3><Briefcase size={18} />Contract Summary</h3>
                    <div className="dispute-detail-grid">
                      <div><span>Total Budget</span><strong>{selectedDispute.contract.totalBudget.toLocaleString()} GigCoin</strong></div>
                      <div><span>Progress</span><strong>{selectedDispute.contract.progressPercentage}%</strong></div>
                      <div><span>Start Date</span><strong>{formatDate(selectedDispute.contract.startDate)}</strong></div>
                      <div><span>Target Completion</span><strong>{formatDate(selectedDispute.contract.endDate)}</strong></div>
                    </div>
                    <h3>Original Job Specification</h3>
                    <h4>{selectedDispute.originalJob.title}</h4>
                    <p className="admin-dispute-prewrap">{selectedDispute.originalJob.description}</p>
                    <p><strong>Category:</strong> {selectedDispute.originalJob.category ?? 'Not specified'}</p>
                    <p><strong>Required Skills:</strong> {selectedDispute.originalJob.skills.join(', ') || 'None'}</p>
                  </section>
                )}

                {/* TAB 4: MILESTONES & ESCROW */}
                {activeTab === 'milestones' && (
                  <section className="admin-investigation-panel">
                    <h3><Landmark size={18} />Escrow Ledger Summary</h3>
                    <div className="dispute-detail-grid">
                      <div><span>Original Escrow</span><strong>{selectedDispute.escrow.originalEscrow.toLocaleString()} GigCoin</strong></div>
                      <div><span>Released</span><strong>{selectedDispute.escrow.releasedAmount.toLocaleString()}</strong></div>
                      <div><span>Refunded</span><strong>{selectedDispute.escrow.refundedAmount.toLocaleString()}</strong></div>
                      <div><span>Remaining Locked</span><strong>{selectedDispute.escrow.remainingAmount.toLocaleString()}</strong></div>
                    </div>
                    {selectedDispute.milestones.map((milestone, index) => (
                      <article className="admin-milestone-card" key={milestone.milestoneId}>
                        <h4>Milestone {index + 1}: {milestone.title}</h4>
                        <p>{milestone.description}</p>
                        <div className="dispute-detail-grid">
                          <div><span>Amount</span><strong>{milestone.amount}</strong></div>
                          <div><span>Released</span><strong>{milestone.releasedAmount}</strong></div>
                          <div><span>Locked Amount</span><strong>{milestone.lockedAmount}</strong></div>
                          <div><span>In Dispute Scope</span><strong>{milestone.isInDisputeScope ? 'Yes' : 'No'}</strong></div>
                        </div>
                      </article>
                    ))}
                  </section>
                )}

                {/* TAB 5: EVIDENCE REVIEW */}
                {activeTab === 'evidence' && (
                  <section className="admin-investigation-panel">
                    <h3>Evidence Documentation</h3>
                    {selectedDispute.evidence.length === 0 ? (
                      <p className="admin-dispute-empty">No evidence files submitted.</p>
                    ) : (
                      selectedDispute.evidence.map(evidence => (
                        <div className="admin-evidence-row" key={evidence.id}>
                          <div>
                            <strong>{evidence.fileName ?? `Pending Evidence Request: ${evidence.description}`}</strong>
                            <small>
                              {evidence.isRequestedByAdmin
                                ? `Requested • ${evidence.isRequestFulfilled ? 'Fulfilled' : 'Pending'}`
                                : `Uploaded by ${evidence.uploadedByName ?? 'Participant'} • ${formatDate(evidence.createdAt)} • ${formatSize(evidence.fileSize)}`}
                            </small>
                            {evidence.reviewNote && <p className="review-note">Reviewer Note: {evidence.reviewNote}</p>}
                          </div>
                          <div className="evidence-action-btns">
                            {evidence.fileName && (
                              <button onClick={() => void downloadEvidence(evidence)} disabled={downloadingId !== null}>
                                <Download size={15} /> Download
                              </button>
                            )}
                            {evidence.fileName && !evidence.reviewedAt && (
                              <button onClick={() => void reviewEvidence(evidence)}>Mark Reviewed</button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                )}

                {/* TAB 6: AUDIT TRAIL */}
                {activeTab === 'audit' && (
                  <section className="admin-investigation-panel">
                    <h3><History size={18} />Administrative Audit Trail</h3>
                    {selectedDispute.auditTrail.map(event => (
                      <div className="admin-evidence-row" key={event.auditId}>
                        <div>
                          <strong>{event.action}</strong>
                          <small>{formatDate(event.createdAt)} • Admin ID: {event.adminId.slice(0, 8)}</small>
                          <p>{event.newValues}</p>
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* TAB 7: WORKSPACE MESSAGES */}
                {activeTab === 'workspace' && (
                  <section className="admin-investigation-panel">
                    <h3>Contract Workspace Conversation (Read-Only)</h3>
                    <div className="admin-conversation-history">
                      {workspaceMessages.map(message => (
                        <div key={message.messageId} className="admin-conversation-message">
                          <p>{message.content}</p>
                          <small>{formatDate(message.sentAt)}</small>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </section>

        {/* EVIDENCE REQUEST MODAL */}
        {showEvidenceDialog && selectedDispute && (
          <div className="admin-dispute-modal-backdrop" role="presentation">
            <section className="admin-dispute-modal" role="dialog" aria-modal="true">
              <div className="admin-dispute-modal-header">
                <div>
                  <p className="disputes-kicker">Request Additional Evidence</p>
                  <h2>Request Evidence</h2>
                </div>
                <button onClick={() => setShowEvidenceDialog(false)} disabled={actionLoading} aria-label="Close"><X size={18} /></button>
              </div>
              <label>Reason for Request
                <textarea
                  value={evidenceRequest.reason}
                  onChange={(e) => setEvidenceRequest((prev) => ({ ...prev, reason: e.target.value }))}
                  rows={4}
                  placeholder="Explain clearly what additional evidence is required from the participant..."
                  disabled={actionLoading}
                />
              </label>
              <label>Submission Deadline (Optional)
                <input
                  type="date"
                  value={evidenceRequest.deadline}
                  onChange={(e) => setEvidenceRequest((prev) => ({ ...prev, deadline: e.target.value }))}
                  disabled={actionLoading}
                />
              </label>
              <label>Target Audience
                <select
                  value={evidenceRequest.target}
                  onChange={(event) => setEvidenceRequest(previous => ({ ...previous, target: Number(event.target.value) as EvidenceRequestTarget }))}
                  disabled={actionLoading}
                >
                  <option value={EvidenceRequestTarget.Reporter}>Reporter (Initiator)</option>
                  <option value={EvidenceRequestTarget.Respondent}>Respondent</option>
                  <option value={EvidenceRequestTarget.Both}>Both Parties</option>
                </select>
              </label>
              <button
                type="button"
                className="resolve-btn"
                onClick={() => void requestEvidenceSubmit()}
                disabled={actionLoading || !evidenceRequest.reason.trim()}
              >
                {actionLoading ? <LoaderCircle className="admin-dispute-spin" size={17} /> : null}
                Send Evidence Request
              </button>
            </section>
          </div>
        )}

        {/* CASE RESOLUTION MODAL */}
        {showResolveDialog && selectedDispute && (
          <div className="admin-dispute-modal-backdrop" role="presentation" onClick={resetResolveDialog}>
            <section className="admin-dispute-modal admin-dispute-modal-wide" role="dialog" aria-modal="true" aria-labelledby="resolve-case-title" onClick={(e) => e.stopPropagation()}>
              <div className="admin-dispute-modal-header">
                <div>
                  <p className="disputes-kicker">Official Verdict</p>
                  <h2 id="resolve-case-title">Issue Dispute Resolution</h2>
                </div>
                <button onClick={resetResolveDialog} disabled={actionLoading} aria-label="Close dialog"><X size={18} /></button>
              </div>

              <div className="resolve-dialog-grid">
                <div className="resolve-column">
                  <label>Verdict Decision
                    <select value={resolution} onChange={(event) => setResolution(Number(event.target.value) as DisputeResolution)} disabled={actionLoading}>
                      {Object.entries(resolutionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>

                  <label>Contract Action
                    <select value={contractAction} onChange={(e) => changeContractAction(Number(e.target.value))} disabled={actionLoading}>
                      <option value={0}>Resume Contract Execution</option>
                      <option value={1}>Terminate Contract</option>
                    </select>
                  </label>
                </div>

                <div className="resolve-column">
                  <label>Public Resolution Verdict Note
                    <textarea
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      rows={4}
                      placeholder="Required: detailed explanation of the decision visible to both parties..."
                      disabled={actionLoading}
                    />
                  </label>
                  <label>Internal Administrator Notes (Optional)
                    <textarea
                      value={internalNotes}
                      onChange={(event) => setInternalNotes(event.target.value)}
                      rows={2}
                      placeholder="Private notes (not visible to Client or Freelancer)..."
                      disabled={actionLoading}
                    />
                  </label>
                </div>
              </div>

              <section className="admin-resolution-milestones">
                <h3>Milestone Financial Allocation</h3>
                <p>Allocate remaining locked funds between Freelancer award, Client refund, and penalties.</p>
                <div className="financial-totals-summary">
                  <small>Calculated Totals: Freelancer Award {allocationTotals.release.toLocaleString()} • Client Refund {allocationTotals.refund.toLocaleString()} • Penalty {allocationTotals.penalty.toLocaleString()} GigCoin</small>
                </div>
                {selectedDispute.milestones.filter(milestone => milestoneDecisions[milestone.milestoneId]).map((milestone) => {
                  const decision = milestoneDecisions[milestone.milestoneId];
                  if (!decision) return null;
                  const total = Number(decision.release || 0) + Number(decision.refund || 0) + Number(decision.penalty || 0);
                  return (
                    <article className="admin-resolution-milestone" key={milestone.milestoneId}>
                      <header>
                        <strong>{milestone.title}</strong>
                        <span>Locked: {milestone.lockedAmount.toLocaleString()} GigCoin</span>
                      </header>
                      <div className="resolve-dialog-grid">
                        <label>Outcome
                          <select value={decision.outcome} onChange={event => {
                            const outcome = Number(event.target.value) as DisputeMilestoneOutcome;
                            const release = outcome === DisputeMilestoneOutcome.Accepted ? milestone.lockedAmount.toFixed(2) : outcome === DisputeMilestoneOutcome.Rejected ? '0.00' : decision.release;
                            const refund = outcome === DisputeMilestoneOutcome.Accepted ? '0.00' : outcome === DisputeMilestoneOutcome.Rejected ? milestone.lockedAmount.toFixed(2) : decision.refund;
                            setMilestoneDecisions(current => ({ ...current, [milestone.milestoneId]: { ...decision, outcome, release, refund, penalty: outcome === DisputeMilestoneOutcome.PartiallyAccepted ? decision.penalty : '0.00' } }));
                          }}>
                            <option value={DisputeMilestoneOutcome.Accepted}>Accepted</option>
                            <option value={DisputeMilestoneOutcome.Rejected}>Rejected</option>
                            <option value={DisputeMilestoneOutcome.PartiallyAccepted}>Partially Accepted</option>
                            <option value={DisputeMilestoneOutcome.Cancelled}>Cancelled</option>
                          </select>
                        </label>
                        <label>Freelancer Award
                          <input type="number" min="0" max={milestone.lockedAmount} step="0.01" value={decision.release} onChange={event => setMilestoneDecisions(current => ({ ...current, [milestone.milestoneId]: { ...decision, release: event.target.value } }))} />
                        </label>
                        <label>Client Refund
                          <input type="number" min="0" max={milestone.lockedAmount} step="0.01" value={decision.refund} onChange={event => setMilestoneDecisions(current => ({ ...current, [milestone.milestoneId]: { ...decision, refund: event.target.value } }))} />
                        </label>
                        <label>Penalty Amount
                          <input type="number" min="0" max={milestone.lockedAmount} step="0.01" value={decision.penalty} onChange={event => setMilestoneDecisions(current => ({ ...current, [milestone.milestoneId]: { ...decision, penalty: event.target.value } }))} />
                        </label>
                      </div>
                      <small className={!allocationHasError(milestone.milestoneId) ? 'allocation-valid' : 'allocation-invalid'}>
                        Allocated {total.toLocaleString()} of {milestone.lockedAmount.toLocaleString()} GigCoin
                      </small>
                    </article>
                  );
                })}
              </section>

              <button
                type="button"
                className="resolve-btn"
                onClick={() => void resolveCase()}
                disabled={actionLoading || !resolutionNote.trim() || Object.keys(milestoneDecisions).some(allocationHasError) || violationHasError(clientViolation) || violationHasError(freelancerViolation)}
              >
                {actionLoading ? <LoaderCircle className="admin-dispute-spin" size={17} /> : <CheckCircle size={17} />}
                Execute Resolution & Final Verdict
              </button>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
