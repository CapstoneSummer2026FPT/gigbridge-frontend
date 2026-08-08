import { useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  ArrowUpDown,
  Download,
  Filter,
  Hash,
  History,
  Layers,
  Landmark,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
  X,
} from 'lucide-react';

import { AppLayout } from '../../../shared/components/AppLayout';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import {
  STATUS_GROUPS,
  GROUP_LABELS,
  statusLabels,
  formatDate,
  formatSize,
  useAdminDisputeManagement,
  type DisputeStatusGroup,
} from '../hooks/useAdminDisputeManagement';
import { AdminResolveDisputeModal } from '../components/AdminResolveDisputeModal';
import type { AdminAuditEvent } from '../../../types/models/AdminDispute';
import { DisputeStatus, EvidenceRequestTarget } from '../../../types/models/Dispute';
import { DisputeMessageRecipient } from '../../../api/messageAPI/GET';
import type { ConversationMessageResponse } from '../../../api/messageAPI/GET';
import { UserRole } from '../../../types/models/User';
import '../styles/admin-dispute-management-screen.css';

const formatAuditAction = (action: string): string => {
  if (action === 'Dispute.RequestEvidence') return 'Evidence Requested';
  if (action === 'Dispute.UpdateStatus') return 'Status Updated';
  if (action === 'Dispute.Resolve') return 'Dispute Resolved';
  if (action === 'Dispute.ReviewEvidence') return 'Evidence Reviewed';
  return action.replace('.', ' • ');
};

const renderAuditContent = (rawJson: string | null) => {
  if (!rawJson) return <span className="text-text-muted italic">—</span>;
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== 'object' || parsed === null) {
      return <span className="font-mono text-text-secondary">{String(parsed)}</span>;
    }

    const entries = Object.entries(parsed);
    if (entries.length === 0) return <span className="text-text-muted italic">—</span>;

    const formatKey = (key: string): string => {
      if (key === 'reason') return 'Reason';
      if (key === 'target') return 'Target Participant';
      if (key === 'Deadline' || key === 'deadline') return 'Deadline';
      if (key === 'groupId') return 'Request Group ID';
      if (key === 'evidenceIds') return 'Evidence Items';
      if (key === 'status') return 'New Status';
      if (key === 'oldStatus') return 'Previous Status';
      if (key === 'resolution') return 'Resolution';
      if (key === 'resolutionNote') return 'Resolution Note';
      return key.replace(/([A-Z])/g, ' $1').trim();
    };

    const formatValue = (key: string, val: unknown): string => {
      if (val === null || val === undefined) return '—';
      if (Array.isArray(val)) return `${val.length} item(s)`;
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (typeof val === 'string' && (key.toLowerCase().includes('date') || key === 'Deadline' || key === 'deadline')) {
        return formatDate(val);
      }
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40">
        {entries.map(([key, value]) => (
          <div key={key} className="flex flex-col gap-0.5 rounded-lg bg-background/80 p-2 border border-border/50 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{formatKey(key)}</span>
            <strong className="text-xs font-semibold text-text-primary break-all">
              {formatValue(key, value)}
            </strong>
          </div>
        ))}
      </div>
    );
  } catch {
    return <p className="font-mono text-[11px] text-text-secondary break-all">{rawJson}</p>;
  }
};

export default function AdminDisputeManagementScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const {
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
    showEvidenceDialog,
    setShowEvidenceDialog,
    evidenceRequest,
    setEvidenceRequest,
    activeTab,
    setActiveTab,
    adminMessage,
    setAdminMessage,
    adminMessageRecipient,
    setAdminMessageRecipient,
    sendingMessage,
    milestoneDecisions,
    setMilestoneDecisions,
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
  } = useAdminDisputeManagement();

  const [auditSortOrder, setAuditSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [auditPageSize, setAuditPageSize] = useState<number>(10);

  const displayedAuditTrail = useMemo(() => {
    if (!selectedDispute?.auditTrail) return [];
    const list = [...selectedDispute.auditTrail];
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return auditSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
    if (auditPageSize > 0) {
      return list.slice(0, auditPageSize);
    }
    return list;
  }, [selectedDispute?.auditTrail, auditSortOrder, auditPageSize]);

  // GSAP Entrance Animation
  usePageGSAP({
    containerRef,
    loading: loadingList && disputes.length === 0,
    groups: [
      { selector: '.esign-gsap-header', y: 20, duration: 0.55 },
      { selector: '.disputes-stats', y: 16, duration: 0.5, stagger: 0.05 },
      { selector: '.disputes-toolbar', y: 18, duration: 0.45 },
      { selector: '.disputes-layout', y: 24, duration: 0.5 },
    ],
  });

  const renderSingleChatMessage = (message: ConversationMessageResponse) => {
    const isOfficial = message.messageType === 10;
    const isBoth = message.disputeRecipient === DisputeMessageRecipient.Both;
    return (
      <div
        key={message.messageId}
        className={`admin-chat-bubble-card ${isOfficial ? 'official-directive' : ''} ${isBoth ? 'both-directive' : ''} ${
          message.senderRole === UserRole.Admin ? 'admin-sender' : ''
        }`}
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
              {message.senderName || (isOfficial ? t('admin.disputes.chat.administrator', 'Administrator') : t('admin.disputes.chat.participant', 'Participant'))}
            </strong>
            <span className={`admin-role-badge role-${message.senderRole ?? 'unknown'}`}>
              {message.senderRole === UserRole.Admin
                ? 'Admin'
                : message.senderRole === UserRole.Client
                ? 'Client'
                : message.senderRole === UserRole.Freelancer
                ? 'Freelancer'
                : 'Participant'}
            </span>
          </div>

          <time className="admin-chat-time">
            {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>

        <p className="admin-chat-content">{message.content}</p>

        {message.attachments.length > 0 && (
          <div className="admin-chat-attachment-list">
            {message.attachments.map((att) => (
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
    <AppLayout fullWidth>
      <div ref={containerRef} className="admin-disputes-wrapper text-text-primary px-4 py-6 lg:px-8 max-w-[1600px] mx-auto space-y-6">
        
        {/* Sticky Top Header Bar matching esign/reports redesign */}
        <header className="esign-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8 mb-6 rounded-2xl border border-border shadow-sm">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                {t('admin.disputes.kicker', 'Dispute Arbitration Workspace')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                {t('admin.disputes.titlePrefix', 'Dispute')} <span className="text-brand italic font-light">& {t('admin.disputes.titleSuffix', 'Escrow Resolution')}</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">
                {t('admin.disputes.subtitle', 'Arbitrate client-freelancer disputes, audit escrow milestones, request evidence, and issue binding resolutions.')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Scale size={24} />
              </span>
            </div>
          </div>
        </header>

        {/* Metric Cards Row */}
        <section className="disputes-stats">
          <div onClick={() => setSelectedStatusGroup('all')} className={selectedStatusGroup === 'all' ? 'active-stat' : ''}>
            <span>{t('admin.disputes.totalCases', 'Total Cases')}</span>
            <strong>{totalItems}</strong>
          </div>
          <div onClick={() => setSelectedStatusGroup('waiting_admin')} className={selectedStatusGroup === 'waiting_admin' ? 'active-stat' : ''}>
            <span>{t('admin.disputes.waitingAdmin', 'Waiting Admin')}</span>
            <strong>{stats.waitingAdmin}</strong>
          </div>
          <div onClick={() => setSelectedStatusGroup('in_progress')} className={selectedStatusGroup === 'in_progress' ? 'active-stat' : ''}>
            <span>{t('admin.disputes.inProgress', 'In Progress')}</span>
            <strong>{stats.inProgress}</strong>
          </div>
          <div onClick={() => setSelectedStatusGroup('resolved')} className={selectedStatusGroup === 'resolved' ? 'active-stat' : ''}>
            <span>{t('admin.disputes.resolved', 'Resolved')}</span>
            <strong>{stats.resolved}</strong>
          </div>
          <div onClick={() => setSelectedStatusGroup('closed')} className={selectedStatusGroup === 'closed' ? 'active-stat' : ''}>
            <span>{t('admin.disputes.closed', 'Closed')}</span>
            <strong>{stats.closed}</strong>
          </div>
        </section>

        {/* Global Notifications */}
        {error && (
          <div className="dispute-admin-message error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label={t('common.dismissError', 'Dismiss error')}><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="dispute-admin-message success">
            <CheckCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} aria-label={t('common.dismissMessage', 'Dismiss message')}><X size={16} /></button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <section className="disputes-toolbar">
          <label>
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('admin.disputes.searchPlaceholder', 'Search case ID, contract title, participant name, or reason...')}
            />
          </label>
          <button onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingList} className="refresh-btn">
            <RefreshCw size={16} className={loadingList ? 'admin-dispute-spin' : ''} /> {t('admin.disputes.refresh', 'Refresh')}
          </button>
        </section>

        {/* Main Workspace Layout */}
        <section className="disputes-layout">
          {/* Left Panel: Dispute List */}
          <div className="disputes-list-card">
            <div className="disputes-filter-row">
              {STATUS_GROUPS.map((group: DisputeStatusGroup) => (
                <button
                  key={group}
                  className={selectedStatusGroup === group ? 'active' : ''}
                  onClick={() => setSelectedStatusGroup(group)}
                >
                  {GROUP_LABELS[group]}
                </button>
              ))}
            </div>

            <div className="disputes-list">
              {loadingList ? (
                <div className="admin-dispute-empty p-8 text-center text-xs font-bold text-text-muted flex items-center justify-center gap-2">
                  <LoaderCircle className="animate-spin text-brand" size={20} />
                  {t('admin.disputes.loadingList', 'Loading disputes list…')}
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="admin-dispute-empty p-8 text-center text-xs font-bold text-text-muted">
                  {t('admin.disputes.noDisputes', 'No dispute cases match the selected filter.')}
                </div>
              ) : filteredDisputes.map((dispute) => (
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
                    <small>{t('admin.disputes.initiator', 'Initiator')}: {dispute.initiatorName} ({dispute.initiatorRole ?? 'Party'})</small>
                    <small>{dispute.evidenceCount} {t('admin.disputes.files', 'files')} • {formatDate(dispute.createdAt)}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Selected Case Workspace */}
          <div className="dispute-detail-card">
            {loadingDetail ? (
              <div className="admin-dispute-empty p-12 text-center text-xs font-bold text-text-muted flex flex-col items-center justify-center gap-2">
                <LoaderCircle className="animate-spin text-brand" size={28} />
                {t('admin.disputes.loadingWorkspace', 'Loading dispute workspace…')}
              </div>
            ) : !selectedDispute ? (
              <div className="admin-dispute-empty p-12 text-center text-xs font-bold text-text-muted">
                {t('admin.disputes.selectDispute', 'Select a dispute case from the list to view its complete workspace.')}
              </div>
            ) : (
              <>
                {/* Case Header & Quick Actions */}
                <div className="detail-card-header">
                  <div className="header-case-title">
                    <p className="text-[11px] font-mono font-bold text-brand uppercase tracking-wider">Case ID: {selectedDispute.id}</p>
                    <h2 className="text-xl font-black text-text-primary tracking-tight">{selectedDispute.contractTitle}</h2>
                  </div>

                  <div className="header-action-buttons">
                    {selectedDispute.status === DisputeStatus.WaitingAdmin && (
                      <button onClick={() => void updateStatus(DisputeStatus.InProgress)} className="btn-resolve-primary">
                        <CheckCircle size={16} /> {t('admin.disputes.actions.markInProgress', 'Mark In Progress')}
                      </button>
                    )}

                    {selectedDispute.status === DisputeStatus.InProgress && (
                      <>
                        <button onClick={openResolveDialog} className="btn-resolve-primary">
                          <Scale size={16} /> {t('admin.disputes.actions.resolve', 'Issue Binding Resolution')}
                        </button>
                        <button onClick={() => setShowEvidenceDialog(true)} className="btn-evidence">
                          <Paperclip size={16} /> {t('admin.disputes.actions.requestEvidence', 'Request Evidence')}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tabs Bar for Workspace Panels */}
                <nav className="admin-investigation-tabs" aria-label="Investigation tabs">
                  <button
                    type="button"
                    className={`admin-investigation-tab-btn ${activeTab === 'dispute' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dispute')}
                  >
                    <ShieldAlert size={15} /> {t('admin.disputes.tabs.overview', 'Overview')}
                  </button>
                  <button
                    type="button"
                    className={`admin-investigation-tab-btn ${activeTab === 'conversation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('conversation')}
                  >
                    <MessageSquare size={15} /> {t('admin.disputes.tabs.chat', 'Arbitration Chat')}
                  </button>
                  <button
                    type="button"
                    className={`admin-investigation-tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
                    onClick={() => setActiveTab('contract')}
                  >
                    <Briefcase size={15} /> {t('admin.disputes.tabs.contractInfo', 'Contract Info')}
                  </button>
                  <button
                    type="button"
                    className={`admin-investigation-tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
                    onClick={() => setActiveTab('milestones')}
                  >
                    <Landmark size={15} /> {t('admin.disputes.tabs.milestones', 'Milestones')}
                  </button>
                  <button
                    type="button"
                    className={`admin-investigation-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                    onClick={() => setActiveTab('evidence')}
                  >
                    <Paperclip size={15} /> {t('admin.disputes.tabs.evidence', 'Evidence')} ({selectedDispute.evidence.filter((e) => Boolean(e.fileName)).length})
                  </button>
                  <button
                    type="button"
                    className={`admin-investigation-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit')}
                  >
                    <History size={15} /> {t('admin.disputes.tabs.auditLog', 'Audit Log')}
                  </button>
                </nav>

                {/* Tab 1: Dispute Overview */}
                {activeTab === 'dispute' && (
                  <div className="tab-pane">
                    <div className="overview-grid">
                      <div className="info-block">
                        <span>{t('admin.disputes.currentStatus', 'Current Status')}</span>
                        <strong className={`dispute-status status-${selectedDispute.status}`}>{statusLabels[selectedDispute.status]}</strong>
                      </div>
                      <div className="info-block">
                        <span>{t('admin.disputes.initiatorName', 'Dispute Initiator')}</span>
                        <strong>{selectedDispute.initiatorName}</strong>
                      </div>
                      <div className="info-block">
                        <span>{t('admin.disputes.respondentName', 'Respondent')}</span>
                        <strong>{selectedDispute.respondentName || '—'}</strong>
                      </div>
                      <div className="info-block">
                        <span>{t('admin.disputes.claimedAmount', 'Total Claimed Amount')}</span>
                        <strong>{(selectedDispute.claimedAmount || selectedDispute.escrow?.fundedAmount || 0).toLocaleString()} GCoin</strong>
                      </div>
                    </div>

                    <div className="info-card">
                      <h3>{t('admin.disputes.reasonTitle', 'Dispute Reason')}</h3>
                      <p>{selectedDispute.reason}</p>
                    </div>

                    {selectedDispute.description && (
                      <div className="info-card">
                        <h3>{t('admin.disputes.descriptionTitle', 'Detailed Description')}</h3>
                        <p>{selectedDispute.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: 2-Column Arbitration Chat Workspace */}
                {activeTab === 'conversation' && (
                  <div className="tab-pane arbitration-chat-pane">
                    <div className="arbitration-chat-columns">
                      {/* Left Column: Freelancer Direct Chat */}
                      <div className="chat-column freelancer-column">
                        <div className="chat-column-header">
                          <User size={16} />
                          <span>{t('admin.disputes.chat.freelancerPrivate', 'Freelancer (Private Column)')}</span>
                        </div>
                        <div className="chat-message-list">
                          {freelancerMessages.length === 0 ? (
                            <p className="no-messages-text">{t('admin.disputes.chat.noFreelancerMsgs', 'No messages in Freelancer column.')}</p>
                          ) : (
                            freelancerMessages.map(renderSingleChatMessage)
                          )}
                          <div ref={freelancerChatEndRef} />
                        </div>
                      </div>

                      {/* Right Column: Client Direct Chat */}
                      <div className="chat-column client-column">
                        <div className="chat-column-header">
                          <User size={16} />
                          <span>{t('admin.disputes.chat.clientPrivate', 'Client (Private Column)')}</span>
                        </div>
                        <div className="chat-message-list">
                          {clientMessages.length === 0 ? (
                            <p className="no-messages-text">{t('admin.disputes.chat.noClientMsgs', 'No messages in Client column.')}</p>
                          ) : (
                            clientMessages.map(renderSingleChatMessage)
                          )}
                          <div ref={clientChatEndRef} />
                        </div>
                      </div>
                    </div>

                    {/* Admin Directive Input Box */}
                    <div className="admin-chat-input-box">
                      <div className="admin-chat-input-toolbar">
                        <label className="recipient-selector">
                          <span>{t('admin.disputes.chat.recipient', 'Recipient')}:</span>
                          <select
                            value={adminMessageRecipient}
                            onChange={(e) => setAdminMessageRecipient(Number(e.target.value))}
                          >
                            <option value={DisputeMessageRecipient.Both}>{t('admin.disputes.chat.recipientBoth', 'Both Parties (Official Directive)')}</option>
                            <option value={DisputeMessageRecipient.Freelancer}>{t('admin.disputes.chat.recipientFreelancer', 'Freelancer Only (Private)')}</option>
                            <option value={DisputeMessageRecipient.Client}>{t('admin.disputes.chat.recipientClient', 'Client Only (Private)')}</option>
                          </select>
                        </label>
                      </div>

                      <div className="admin-chat-textarea-row">
                        <textarea
                          rows={2}
                          value={adminMessage}
                          onChange={(e) => setAdminMessage(e.target.value)}
                          placeholder={t('admin.disputes.chat.placeholder', 'Type official administrative directive or inquiry...')}
                        />
                        <button
                          type="button"
                          onClick={() => void sendAdminDirective()}
                          disabled={sendingMessage || !adminMessage.trim()}
                          className="send-directive-btn"
                        >
                          <Send size={16} /> {t('common.send', 'Send')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Contract Info */}
                {activeTab === 'contract' && (
                  <div className="tab-pane">
                    <div className="overview-grid">
                      <div className="info-block">
                        <span>{t('admin.disputes.contractId', 'Contract ID')}</span>
                        <strong>{selectedDispute.contractId}</strong>
                      </div>
                      <div className="info-block">
                        <span>{t('admin.disputes.totalBudget', 'Total Budget')}</span>
                        <strong>{(selectedDispute.contract?.totalBudget || 0).toLocaleString()} GCoin</strong>
                      </div>
                      <div className="info-block">
                        <span>{t('admin.disputes.startDate', 'Start Date')}</span>
                        <strong>{formatDate(selectedDispute.contract?.startDate || null)}</strong>
                      </div>
                      <div className="info-block">
                        <span>{t('admin.disputes.endDate', 'End Date')}</span>
                        <strong>{formatDate(selectedDispute.contract?.endDate || null)}</strong>
                      </div>
                    </div>

                    <div className="info-card">
                      <h3>{t('admin.disputes.contractScope', 'Contract Scope & Description')}</h3>
                      <p>{selectedDispute.originalJob?.description || selectedDispute.contractTitle || 'No detailed scope available.'}</p>
                    </div>
                  </div>
                )}

                {/* Tab 4: Milestones Breakdown */}
                {activeTab === 'milestones' && (
                  <div className="tab-pane">
                    <div className="milestones-table-card rounded-2xl border border-border overflow-hidden bg-background">
                      <table className="w-full text-left border-collapse">
                        <thead className="border-b border-border bg-surface-muted/30">
                          <tr>
                            <th className="p-3 text-[11px] font-black uppercase tracking-wider text-text-muted">{t('admin.disputes.milestones.title', 'Milestone Title')}</th>
                            <th className="p-3 text-[11px] font-black uppercase tracking-wider text-text-muted">{t('admin.disputes.milestones.lockedAmount', 'Locked Amount')}</th>
                            <th className="p-3 text-[11px] font-black uppercase tracking-wider text-text-muted">{t('admin.disputes.milestones.status', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {selectedDispute.milestones.map((milestone) => (
                            <tr key={milestone.milestoneId} className="hover:bg-surface-muted/30">
                              <td className="p-3 text-xs font-extrabold text-text-primary">{milestone.title}</td>
                              <td className="p-3 text-xs font-bold font-mono text-brand">{milestone.lockedAmount.toLocaleString()} GCoin</td>
                              <td className="p-3 text-xs font-bold text-text-muted">{milestone.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 5: Evidence Files */}
                {activeTab === 'evidence' && (
                  <div className="tab-pane">
                    {selectedDispute.evidence.filter((e) => Boolean(e.fileName)).length === 0 ? (
                      <div className="admin-dispute-empty p-8 text-center text-xs font-extrabold text-text-muted">{t('admin.disputes.noEvidence', 'No evidence documents have been uploaded for this case.')}</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedDispute.evidence
                          .filter((evidence) => Boolean(evidence.fileName))
                          .map((evidence) => (
                          <div key={evidence.id} className="rounded-2xl border border-border bg-background p-4 space-y-2 shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-black text-text-primary">
                              <Paperclip size={16} className="text-brand shrink-0" />
                              <strong className="truncate" title={evidence.fileName || 'Attachment'}>{evidence.fileName || 'Attachment'}</strong>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-text-muted">
                              <span className="flex items-center gap-1.5">
                                <User size={13} className="text-brand shrink-0" />
                                <span>Sender:</span>
                                <strong className="text-text-primary">
                                  {evidence.uploadedByName
                                    ? `${evidence.uploadedByName} (${evidence.uploadedById === selectedDispute.client?.userId ? 'Client' : evidence.uploadedById === selectedDispute.freelancer?.userId ? 'Freelancer' : 'Participant'})`
                                    : evidence.uploadedById === selectedDispute.client?.userId
                                    ? `${selectedDispute.client.fullName} (Client)`
                                    : evidence.uploadedById === selectedDispute.freelancer?.userId
                                    ? `${selectedDispute.freelancer.fullName} (Freelancer)`
                                    : 'Participant'}
                                </strong>
                              </span>
                              <span className="text-[11px] font-medium">{formatDate(evidence.createdAt)}</span>
                            </div>
                            <p className="text-xs font-medium text-text-secondary leading-relaxed">{evidence.description || 'No description provided.'}</p>
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
                              <button
                                type="button"
                                onClick={() => void downloadEvidenceFile(evidence)}
                                disabled={downloadingId === evidence.id}
                                className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline cursor-pointer"
                              >
                                <Download size={14} /> {t('common.download', 'Download')} ({formatSize(evidence.fileSize)})
                              </button>
                              {!evidence.reviewedByAdminId && (
                                <button
                                  type="button"
                                  onClick={() => void reviewEvidence(evidence)}
                                  className="rounded-xl border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-extrabold text-brand hover:bg-brand/20 transition cursor-pointer"
                                >
                                  {t('admin.disputes.markReviewed', 'Mark Reviewed')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 6: Audit Log */}
                {activeTab === 'audit' && (
                  <div className="tab-pane space-y-4">
                    {/* Audit Control Bar: Sort, Limit, Total */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-surface-muted/40 border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-text-muted flex items-center gap-1">
                          <Layers size={14} className="text-brand" />
                          Showing:
                        </span>
                        <strong className="text-text-primary font-bold">
                          {displayedAuditTrail.length} of {(selectedDispute.auditTrail || []).length} events
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Sort selector */}
                        <label className="flex items-center gap-1.5 font-bold text-text-muted">
                          <ArrowUpDown size={13} />
                          <span>Sort:</span>
                          <select
                            value={auditSortOrder}
                            onChange={(e) => setAuditSortOrder(e.target.value as 'newest' | 'oldest')}
                            className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-extrabold text-text-primary focus:outline-hidden focus:ring-1 focus:ring-brand cursor-pointer"
                          >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                          </select>
                        </label>

                        {/* Page Size / Limit selector */}
                        <label className="flex items-center gap-1.5 font-bold text-text-muted">
                          <Filter size={13} />
                          <span>Show:</span>
                          <select
                            value={auditPageSize}
                            onChange={(e) => setAuditPageSize(Number(e.target.value))}
                            className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-extrabold text-text-primary focus:outline-hidden focus:ring-1 focus:ring-brand cursor-pointer"
                          >
                            <option value={5}>5 items</option>
                            <option value={10}>10 items</option>
                            <option value={25}>25 items</option>
                            <option value={0}>All events</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    {(selectedDispute.auditTrail || []).length === 0 ? (
                      <div className="admin-dispute-empty p-8 text-center text-xs font-extrabold text-text-muted">
                        No audit events recorded for this case.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayedAuditTrail.map((log: AdminAuditEvent) => (
                          <div key={log.auditId} className="rounded-2xl border border-border bg-background p-4 space-y-3 shadow-sm hover:shadow-md transition">
                            {/* Header: Action badge & Timestamp */}
                            <div className="flex items-center justify-between font-black text-xs text-text-primary">
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-black text-brand">
                                <Sparkles size={13} />
                                {formatAuditAction(log.action)}
                              </span>
                              <span className="text-[11px] font-bold text-text-muted">{formatDate(log.createdAt)}</span>
                            </div>

                            {/* Main Content: Parsed Key-Value Cards */}
                            {renderAuditContent(log.newValues || log.oldValues)}

                            {/* Footer: Styled Admin ID & Log ID Badges */}
                            <div className="pt-2 text-xs font-semibold text-text-muted flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted/60 px-2.5 py-1 text-[11px] font-bold text-text-secondary border border-border/40">
                                <UserCheck size={13} className="text-brand shrink-0" />
                                <span>Admin ID:</span>
                                <strong className="font-mono text-text-primary">{log.adminId}</strong>
                              </span>

                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted/60 px-2.5 py-1 text-[11px] font-bold text-text-secondary border border-border/40" title={log.auditId}>
                                <Hash size={13} className="text-text-muted shrink-0" />
                                <span>Log ID:</span>
                                <strong className="font-mono text-text-primary truncate max-w-[200px]">{log.auditId}</strong>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Separated Resolve Dispute Modal Dialog Component */}
        {selectedDispute && (
          <AdminResolveDisputeModal
            selectedDispute={selectedDispute}
            showResolveDialog={showResolveDialog}
            actionLoading={actionLoading}
            resolution={resolution}
            setResolution={setResolution}
            resolutionNote={resolutionNote}
            setResolutionNote={setResolutionNote}
            internalNotes={internalNotes}
            setInternalNotes={setInternalNotes}
            contractAction={contractAction}
            setContractAction={setContractAction}
            milestoneDecisions={milestoneDecisions}
            setMilestoneDecisions={setMilestoneDecisions}
            clientViolation={clientViolation}
            setClientViolation={setClientViolation}
            freelancerViolation={freelancerViolation}
            setFreelancerViolation={setFreelancerViolation}
            allocationTotals={allocationTotals}
            allocationHasError={allocationHasError}
            violationHasError={violationHasError}
            resolveCase={resolveCase}
            resetResolveDialog={resetResolveDialog}
          />
        )}

        {/* Request Evidence Modal Dialog */}
        {showEvidenceDialog && selectedDispute && (
          <div className="modal-backdrop">
            <div className="modal-card space-y-4 max-w-lg p-6 bg-background border border-border rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-black text-text-primary">{t('admin.disputes.dialog.evidenceTitle', 'Request Evidence From Participants')}</h3>
                <button type="button" onClick={() => setShowEvidenceDialog(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">{t('admin.disputes.dialog.targetParticipant', 'Target Participant')}</label>
                  <select
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    value={evidenceRequest.target}
                    onChange={(e) => setEvidenceRequest({ ...evidenceRequest, target: Number(e.target.value) as EvidenceRequestTarget })}
                  >
                    <option value={EvidenceRequestTarget.Both}>{t('admin.disputes.dialog.bothParties', 'Both Parties')}</option>
                    <option value={EvidenceRequestTarget.Reporter}>{t('admin.disputes.dialog.reporterOnly', 'Reporter Only')}</option>
                    <option value={EvidenceRequestTarget.Respondent}>{t('admin.disputes.dialog.respondentOnly', 'Respondent Only')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">{t('admin.disputes.dialog.evidenceReason', 'Evidence Request Reason')}</label>
                  <textarea
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    rows={3}
                    value={evidenceRequest.reason}
                    onChange={(e) => setEvidenceRequest({ ...evidenceRequest, reason: e.target.value })}
                    placeholder={t('admin.disputes.dialog.evidenceReasonPlaceholder', 'Specify evidence required, e.g. deliverables, logs, receipts...')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">{t('admin.disputes.dialog.deadline', 'Submission Deadline (Optional)')}</label>
                  <input
                    type="datetime-local"
                    className="input-gb w-full py-2 px-3 text-xs font-semibold"
                    value={evidenceRequest.deadline}
                    onChange={(e) => setEvidenceRequest({ ...evidenceRequest, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setShowEvidenceDialog(false)} className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer" disabled={actionLoading}>
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void requestEvidenceSubmit()}
                  disabled={actionLoading || !evidenceRequest.reason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {t('admin.disputes.dialog.sendRequest', 'Send Evidence Request')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
