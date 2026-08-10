import { useState, useRef, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Ban, Send, AlertTriangle, PanelLeftOpen, PanelLeftClose,
  Paperclip, Smile, CheckCircle, Circle, Download,
  FileText, Image as ImageIcon, Table, Info, CreditCard, MessageSquare,
  Upload, Link2, X, AlertCircle, Loader2, Wallet, LockKeyhole, Star, ListChecks
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { ContractProductHandoffSourceType, ContractStatus, ContractWorkItemStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import type { ContractProductHandoffResponse } from '../../../types/models/Contract';
import type { EscalateReportToDisputeInput } from '../../../types/models/Dispute';
import {
  ContractReportIssueType,
  ContractReportResolutionAction,
  ContractReportStatus,
} from '../../../types/models/ReportContract';
import '../styles/project-workspace-screen.css';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { ServiceFeeDialog } from '../../../shared/components/ServiceFeeDialog';
import { EarlyWithdrawalDialog } from '../../../shared/components/EarlyWithdrawalDialog';
import { calculateServiceFee, isInsufficientServiceFeeError } from '../../../shared/utils/serviceFee';
import { getEarlyWithdrawalEligibility } from '../../../shared/utils/earlyWithdrawal';
import { useReportContract, RaiseIssueModal, ReportList, ReportDetailModal } from '../../../features/report-contracts';
import { toast } from 'sonner';
import {
  parseReportSystemMessageMetadata,
  type ReportSystemMessageMetadata,
} from '../utils/reportSystemMessage';
import { ProjectReviewDialog } from '../../reviews/components/ProjectReviewDialog';
import '../../reviews/styles/reviews-screen.css';

type Translate = ReturnType<typeof useTranslation>['t'];

const getProductHandoffUrl = (handoff: ContractProductHandoffResponse): string | null => {
  const url = handoff.sourceType === ContractProductHandoffSourceType.Link
    ? handoff.externalUrl
    : handoff.fileUrl;

  return url?.trim() || null;
};

const getProductHandoffLabel = (handoff: ContractProductHandoffResponse, t: Translate): string =>
  handoff.sourceType === ContractProductHandoffSourceType.Link
    ? t('workspace.workMaterialsLink')
    : handoff.fileName || t('workspace.workMaterialsFile');

const REPORT_ISSUE_KEYS: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'workspace.reportIssueTypePaymentIssue',
  [ContractReportIssueType.MilestoneIssue]: 'workspace.reportIssueTypeMilestoneIssue',
  [ContractReportIssueType.Delay]: 'workspace.reportIssueTypeDelay',
  [ContractReportIssueType.PoorQuality]: 'workspace.reportIssueTypePoorQuality',
  [ContractReportIssueType.CommunicationProblem]: 'workspace.reportIssueTypeCommunicationProblem',
  [ContractReportIssueType.ScopeChange]: 'workspace.reportIssueTypeScopeChange',
  [ContractReportIssueType.Other]: 'workspace.reportIssueTypeOther',
};

const REPORT_ACTION_KEYS: Record<number, string> = {
  [ContractReportResolutionAction.AcceptIssue]: 'workspace.reportActionAcceptIssue',
  [ContractReportResolutionAction.ProvideExplanation]: 'workspace.reportActionProvideExplanation',
  [ContractReportResolutionAction.ProposeResolution]: 'workspace.reportActionProposeResolution',
  [ContractReportResolutionAction.RejectIssue]: 'workspace.reportActionRejectIssue',
};

const REPORT_STATUS_KEYS: Record<number, string> = {
  [ContractReportStatus.Pending]: 'workspace.reportStatusPending',
  [ContractReportStatus.WaitingReporterConfirmation]: 'workspace.reportStatusWaitingConfirmation',
  [ContractReportStatus.Resolved]: 'workspace.reportStatusResolved',
  [ContractReportStatus.Escalated]: 'workspace.reportStatusEscalated',
};

const getReportSystemSummary = (event: ReportSystemMessageMetadata, t: Translate): string => {
  const actor = event.actorName || event.actorRole || t('workspace.reportParticipant');
  if (event.eventType === 'created') return t('workspace.reportSystemCreatedSummary', { actor });
  if (event.eventType === 'resolved') return t('workspace.reportSystemResolvedSummary');

  switch (event.resolutionAction) {
    case ContractReportResolutionAction.AcceptIssue:
      return t('workspace.reportSystemAcceptedSummary', { actor });
    case ContractReportResolutionAction.ProvideExplanation:
      return t('workspace.reportSystemExplainedSummary', { actor });
    case ContractReportResolutionAction.ProposeResolution:
      return t('workspace.reportSystemProposedSummary', { actor });
    case ContractReportResolutionAction.RejectIssue:
      return t('workspace.reportSystemRejectedSummary', { actor });
    default:
      return t('workspace.reportSystemUpdatedSummary', { actor });
  }
};

const getReportSystemDetail = (event: ReportSystemMessageMetadata): string | null => {
  if (event.resolutionAction === ContractReportResolutionAction.ProvideExplanation) return event.explanation;
  if (event.resolutionAction === ContractReportResolutionAction.ProposeResolution) return event.proposedResolution;
  if (event.resolutionAction === ContractReportResolutionAction.RejectIssue) return event.rejectReason;
  return null;
};

export default function ProjectWorkspaceScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [mobileTab, setMobileTab] = useState<'list' | 'milestones' | 'chat'>('chat');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(() => {
    try {
      return localStorage.getItem('gigbridge_workspace_left_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleLeftPanel = () => {
    setIsLeftPanelCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('gigbridge_workspace_left_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [submitModal, setSubmitModal] = useState<{ milestoneId: string; title: string } | null>(null);
  const [submitDescription, setSubmitDescription] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingDeliverable, setIsSubmittingDeliverable] = useState(false);
  const [milestoneActionPendingId, setMilestoneActionPendingId] = useState<string | null>(null);
  const [milestoneActionError, setMilestoneActionError] = useState<{ milestoneId: string; message: string } | null>(null);
  const [withdrawDialogMilestone, setWithdrawDialogMilestone] = useState<{
    milestoneId: string;
    title: string;
    availableAmount: number;
  } | null>(null);
  const [endProjectModalOpen, setEndProjectModalOpen] = useState(false);
  const [endProjectFeeMode, setEndProjectFeeMode] = useState<'confirmation' | 'insufficient'>('confirmation');
  const [endProjectBalance, setEndProjectBalance] = useState<number | null>(null);
  const [isLoadingEndProjectBalance, setIsLoadingEndProjectBalance] = useState(false);
  const [isEndingProject, setIsEndingProject] = useState(false);
  const [endProjectError, setEndProjectError] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productMode, setProductMode] = useState<'file' | 'link'>('file');
  const [productNote, setProductNote] = useState('');
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productLink, setProductLink] = useState('');
  const [productError, setProductError] = useState<string | null>(null);
  const [isSendingProduct, setIsSendingProduct] = useState(false);
  const [raiseIssueModalOpen, setRaiseIssueModalOpen] = useState(false);
  const [reportListOpen, setReportListOpen] = useState(false);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [unavailableReportId, setUnavailableReportId] = useState<string | null>(null);
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null);
  const profilePopoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const withdrawalRequestInFlightRef = useRef(false);
  const submitFileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const {
    user,
    isClient,
    activeProjectId,
    setActiveProjectId,
    showInfo,
    setShowInfo,
    messageInput,
    setMessageInput,
    isFavorited,
    setIsFavorited,
    isBlocked,
    setIsBlocked,
    project,
    activeContract,
    productHandoffs,
    earlyStartRequests,
    workspaceProjects,
    currentProjData,
    partnerName,
    partnerAvatar,
    partnerTitle,
    partnerCompany,
    partnerUserId,
    isPartnerOnline,
    projectMessages,
    reviewPromptContractId,
    clearReviewPrompt,
    refreshWorkspace,
    handleSendMessage,
    handleSimulateAttachment,
    handleOpenMilestoneEditor,
    handleRequestMilestoneUnlock,
    handleWithdrawMilestone,
    handleUpdateWorkItem,
    handleRespondEarlyStart,
    handleEndProject,
    handleSubmitMilestoneDeliverable,
    handleSubmitProductHandoff,
    chatEndRef,
  } = useProjectWorkspace(contractId || '');

  const {
    reports: contractReports,
    isLoading: isLoadingReports,
    createReport,
    isCreatingReport: isCreatingReport,
    selectedReport,
    loadReportDetail,
    isLoadingDetail: isLoadingReportDetail,
    respondToReport,
    isRespondingReport,
    confirmResolution,
    isConfirmingReport,
    escalateToDispute,
    isEscalatingReport,
    loadReports,
    error: reportError,
    clearSelectedReport,
  } = useReportContract();
  const workspaceContractId = activeProjectId || contractId || '';
  const isFreelancer = user?.role === UserRole.Freelancer;
  const allMilestonesSubmittedOrApproved = project.milestones.length > 0 &&
    project.milestones.every(milestone => milestone.status === 'submitted' || milestone.status === 'approved');
  const allMilestonesApproved = project.milestones.length > 0 &&
    project.milestones.every(milestone => milestone.status === 'approved');
  const showEndProjectButton = isClient &&
    activeContract?.status === ContractStatus.Active &&
    allMilestonesSubmittedOrApproved;
  const isContractDisputed = activeContract?.status === ContractStatus.Disputed;
  const isWorkspaceViewOnly = activeContract?.status === ContractStatus.Completed;
  const isWorkspaceLocked = isWorkspaceViewOnly || isContractDisputed;
  const showFreelancerPayoutCard = !isClient &&
    activeContract?.status === ContractStatus.Completed &&
    allMilestonesApproved;
  const completedJobAmount = project.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
  const endProjectServiceFee = calculateServiceFee(completedJobAmount);
  const reviewRole = isClient ? UserRole.Client : UserRole.Freelancer;

  useEffect(() => {
    if (endProjectModalOpen || !reviewPromptContractId || !activeContract?.canReview || !user?.id) return;
    if (reviewPromptContractId !== activeContract.contractsId) return;

    const dismissedKey = `gigbridge-review-prompt-dismissed:${user.id}:${reviewPromptContractId}`;
    if (sessionStorage.getItem(dismissedKey) !== '1') {
      setReviewDialogOpen(true);
    }
  }, [activeContract, endProjectModalOpen, reviewPromptContractId, user?.id]);

  const [promptModalConfig, setPromptModalConfig] = useState<{
    title: string;
    description?: string;
    placeholder?: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger' | 'success';
    required?: boolean;
    onConfirm: (value: string) => Promise<void> | void;
  } | null>(null);

  const openPromptModal = (config: {
    title: string;
    description?: string;
    placeholder?: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger' | 'success';
    required?: boolean;
    onConfirm: (value: string) => Promise<void> | void;
  }) => setPromptModalConfig(config);

  const closePromptModal = () => setPromptModalConfig(null);

  useEffect(() => {
    setRaiseIssueModalOpen(false);
    setReportListOpen(false);
    setViewReportId(null);
    setUnavailableReportId(null);
    clearSelectedReport();
  }, [workspaceContractId, clearSelectedReport]);

  useEffect(() => {
    let cancelled = false;
    if (!workspaceContractId || !isContractDisputed) {
      setActiveDisputeId(null);
      return;
    }
    void disputeGetAPI.getActiveDispute(workspaceContractId).then(response => {
      if (!cancelled) setActiveDisputeId(response.success ? response.data?.id ?? null : null);
    });
    return () => { cancelled = true; };
  }, [isContractDisputed, workspaceContractId]);

  const resetSubmitModal = () => {
    setSubmitModal(null);
    setSubmitDescription('');
    setSubmitFile(null);
    setSubmitError(null);
    setIsSubmittingDeliverable(false);
    if (submitFileInputRef.current) {
      submitFileInputRef.current.value = '';
    }
  };

  const openSubmitModal = (milestone: { id: string; title: string }) => {
    setSubmitModal({ milestoneId: milestone.id, title: milestone.title });
    setSubmitDescription('');
    setSubmitFile(null);
    setSubmitError(null);
  };

  const handleSelectSubmitFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSubmitError(null);

    if (!file) {
      setSubmitFile(null);
      return;
    }

    if (file.size <= 0 || file.size > 100 * 1024 * 1024) {
      setSubmitFile(null);
      setSubmitError(t('workspace.fileSizeValidationError'));
      if (submitFileInputRef.current) {
        submitFileInputRef.current.value = '';
      }
      return;
    }

    setSubmitFile(file);
  };

  const handleSubmitDeliverable = async (event: FormEvent) => {
    event.preventDefault();
    if (!submitModal) return;

    const trimmedDescription = submitDescription.trim();

    if (trimmedDescription.length > 5000) {
      setSubmitError(t('workspace.descriptionMaxLengthError'));
      return;
    }

    if (!submitFile) {
      setSubmitError(t('workspace.chooseFileBeforeSubmitError'));
      return;
    }

    setIsSubmittingDeliverable(true);
    setSubmitError(null);

    const result = await handleSubmitMilestoneDeliverable(submitModal.milestoneId, {
      description: trimmedDescription,
      file: submitFile,
    });

    if (!result.success) {
      setSubmitError(result.message || t('workspace.failedSubmitDeliverableError'));
      setIsSubmittingDeliverable(false);
      return;
    }

    resetSubmitModal();
  };

  const resetProductModal = () => {
    setProductModalOpen(false);
    setProductMode('file');
    setProductNote('');
    setProductFile(null);
    setProductLink('');
    setProductError(null);
    setIsSendingProduct(false);
    if (productFileInputRef.current) {
      productFileInputRef.current.value = '';
    }
  };

  const handleSelectProductFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setProductError(null);

    if (!file) {
      setProductFile(null);
      return;
    }

    if (file.size <= 0 || file.size > 100 * 1024 * 1024) {
      setProductFile(null);
      setProductError(t('workspace.fileSizeValidationError'));
      if (productFileInputRef.current) {
        productFileInputRef.current.value = '';
      }
      return;
    }

    setProductFile(file);
  };

  const handleSendProductMaterials = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedNote = productNote.trim();
    const trimmedLink = productLink.trim();

    if (trimmedNote.length > 2000) {
      setProductError(t('workspace.noteMaxLengthError'));
      return;
    }

    if (productMode === 'file' && !productFile) {
      setProductError(t('workspace.chooseFileBeforeSendError'));
      return;
    }

    if (productMode === 'link') {
      try {
        const url = new URL(trimmedLink);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error(t('workspace.invalidUrlProtocolError'));
        }
      } catch {
        setProductError(t('workspace.enterValidHttpLinkError'));
        return;
      }
    }

    setIsSendingProduct(true);
    setProductError(null);

    const result = await handleSubmitProductHandoff({
      note: trimmedNote,
      file: productMode === 'file' ? productFile : null,
      externalUrl: productMode === 'link' ? trimmedLink : undefined,
    });

    if (!result.success) {
      setProductError(result.message || t('workspace.failedSendMaterialsError'));
      setIsSendingProduct(false);
      return;
    }

    resetProductModal();
    setActiveTab('files');
    setShowInfo(true);
  };



  const handleWorkItemTransition = async (milestoneId: string, workItemId: string, status: ContractWorkItemStatus) => {
    setMilestoneActionPendingId(milestoneId);
    setMilestoneActionError(null);
    const result = await handleUpdateWorkItem(milestoneId, workItemId, status);
    if (!result.success) {
      setMilestoneActionError({
        milestoneId,
        message: result.message || 'Work item could not be updated.',
      });
      toast.error(result.message || 'Work item could not be updated.');
    } else {
      toast.success(result.message || (status === ContractWorkItemStatus.Completed ? 'Work item marked as completed.' : 'Work item started.'));
    }
    setMilestoneActionPendingId(null);
  };

  const handleRequestPendingMilestoneUnlock = (milestoneId: string) => {
    openPromptModal({
      title: 'Request Early Start',
      description: 'Why should this next milestone start early? Provide a reason for the client to review.',
      placeholder: 'Enter reason for early start...',
      required: true,
      confirmText: 'Submit Request',
      confirmVariant: 'primary',
      onConfirm: async (reason) => {
        setMilestoneActionPendingId(milestoneId);
        setMilestoneActionError(null);
        const result = await handleRequestMilestoneUnlock(milestoneId, reason);
        if (!result.success) {
          setMilestoneActionError({
            milestoneId,
            message: result.message || t('workspace.failedRequestUnlockError'),
          });
          toast.error(result.message || t('workspace.failedRequestUnlockError'));
        } else {
          toast.success(result.message || 'Early start request submitted.');
        }
        setMilestoneActionPendingId(null);
      },
    });
  };

  const openWithdrawDialog = (milestoneId: string, title: string, availableAmount: number) => {
    setMilestoneActionError(null);
    setWithdrawDialogMilestone({ milestoneId, title, availableAmount });
  };

  const closeWithdrawDialog = () => {
    if (milestoneActionPendingId === withdrawDialogMilestone?.milestoneId) return;
    setWithdrawDialogMilestone(null);
  };

  const confirmMilestoneWithdrawal = async () => {
    if (!withdrawDialogMilestone || milestoneActionPendingId || withdrawalRequestInFlightRef.current) return;

    const { milestoneId } = withdrawDialogMilestone;
    withdrawalRequestInFlightRef.current = true;
    setMilestoneActionPendingId(milestoneId);
    setMilestoneActionError(null);
    try {
      const result = await handleWithdrawMilestone(milestoneId);

      if (result.success) {
        setWithdrawDialogMilestone(null);
        toast.success(result.message || t('earlyWithdrawal.success'));
      } else {
        setMilestoneActionError({
          milestoneId,
          message: result.message || t('workspace.failedWithdrawFundsError'),
        });
        if (result.statusCode === 409) {
          setWithdrawDialogMilestone(null);
        }
      }
    } catch {
      setMilestoneActionError({
        milestoneId,
        message: t('workspace.failedWithdrawFundsError'),
      });
    } finally {
      withdrawalRequestInFlightRef.current = false;
      setMilestoneActionPendingId(null);
    }
  };

  const handleToggleReportList = useCallback(() => {
    if (reportListOpen) {
      setReportListOpen(false);
      setViewReportId(null);
      clearSelectedReport();
      return;
    }

    setReportListOpen(true);
    if (workspaceContractId) {
      void loadReports(workspaceContractId);
    }
  }, [clearSelectedReport, loadReports, reportListOpen, workspaceContractId]);

  const handleCloseReportList = useCallback(() => {
    setReportListOpen(false);
    setViewReportId(null);
    clearSelectedReport();
  }, [clearSelectedReport]);

  const handleCreateContractReport = useCallback(
    async (input: {
      issueType: number;
      description: string;
      desiredResolution: string;
      milestoneId?: string | null;
      attachments?: File[];
    }) => {
      if (!workspaceContractId) {
        return { success: false, message: t('workspace.failedSubmitReportError') };
      }

      const response = await createReport(workspaceContractId, input);
      return { success: response.success, message: response.message };
    },
    [createReport, t, workspaceContractId],
  );

  const handleViewContractReport = useCallback(
    async (reportId: string) => {
      if (!workspaceContractId) return;
      setViewReportId(reportId);
      setUnavailableReportId(null);
      const response = await loadReportDetail(workspaceContractId, reportId);
      if (!response?.success || !response.data) {
        setUnavailableReportId(reportId);
        setViewReportId(null);
      }
    },
    [loadReportDetail, workspaceContractId],
  );

  const handleCloseReportDetail = useCallback(() => {
    setViewReportId(null);
    clearSelectedReport();
  }, [clearSelectedReport]);

  const handleRespondToContractReport = useCallback(
    async (input: {
      resolutionAction: number;
      explanation?: string | null;
      proposedResolution?: string | null;
      rejectReason?: string | null;
      attachments?: File[];
    }) => {
      if (!workspaceContractId || !viewReportId) {
        return { success: false, message: t('workspace.reportResponseFailed') };
      }

      const response = await respondToReport(workspaceContractId, viewReportId, input);
      return { success: response.success, message: response.message };
    },
    [respondToReport, t, viewReportId, workspaceContractId],
  );

  const handleConfirmContractReport = useCallback(
    async (isAccepted: boolean) => {
      if (!workspaceContractId || !viewReportId) {
        return { success: false, message: t('workspace.reportConfirmationFailed') };
      }

      const response = await confirmResolution(workspaceContractId, viewReportId, isAccepted);
      return { success: response.success, message: response.message };
    },
    [confirmResolution, t, viewReportId, workspaceContractId],
  );

  const handleEscalateContractReport = useCallback(async (input: EscalateReportToDisputeInput) => {
    if (!workspaceContractId || !selectedReport) {
      return { success: false, message: t('workspace.disputeEscalationFailed') };
    }
    const response = await escalateToDispute(workspaceContractId, selectedReport.id, input);
    if (response.success && response.data) setActiveDisputeId(response.data.id);
    return {
      success: response.success,
      message: response.message,
      disputeId: response.data?.id,
    };
  }, [escalateToDispute, selectedReport, t, workspaceContractId]);

  const openEndProjectDialog = async () => {
    setEndProjectError(null);
    setEndProjectFeeMode('confirmation');
    setEndProjectBalance(null);
    setEndProjectModalOpen(true);
    setIsLoadingEndProjectBalance(true);

    const response = await walletGetAPI.getMyWallet();
    if (response.success && response.data) {
      // End-project service fee is an in-platform payment, spendable from either pool.
      setEndProjectBalance(response.data.totalSpendableGigCoin);
    } else {
      setEndProjectError(response.message || t('workspace.unableLoadGigCoinBalance'));
    }
    setIsLoadingEndProjectBalance(false);
  };

  const closeEndProjectDialog = () => {
    if (isEndingProject) return;
    setEndProjectModalOpen(false);
  };

  const closeReviewDialog = () => {
    if (activeContract?.contractsId && user?.id) {
      sessionStorage.setItem(
        `gigbridge-review-prompt-dismissed:${user.id}:${activeContract.contractsId}`,
        '1',
      );
    }
    setReviewDialogOpen(false);
    clearReviewPrompt();
  };

  const handleReviewSubmitted = () => {
    setReviewDialogOpen(false);
    clearReviewPrompt();
    void refreshWorkspace();
  };

  const handleConfirmEndProject = async () => {
    if (endProjectBalance === null) return;
    if (endProjectBalance < endProjectServiceFee) {
      setEndProjectFeeMode('insufficient');
      return;
    }

    setIsEndingProject(true);
    setEndProjectError(null);
    const result = await handleEndProject();
    if (!result.success) {
      if (isInsufficientServiceFeeError(result.message)) {
        setEndProjectFeeMode('insufficient');
        setIsEndingProject(false);
        return;
      }

      setEndProjectError(result.message || t('workspace.failedEndProjectError'));
      setIsEndingProject(false);
      return;
    }

    setIsEndingProject(false);
    setEndProjectModalOpen(false);
    window.dispatchEvent(new Event('gigbridge-wallet-updated'));
  };

  return (
    <AppLayout fullWidth hideAIWidget>
      <div className="project-workspace-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        {/* Top Header */}
        <header className="glass-header sticky top-0 z-50 flex justify-between items-center px-6 sm:px-8 py-3 border-b border-border shadow-sm flex-shrink-0">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-muted-foreground hover:text-[var(--gb-cyan)] transition-colors group cursor-pointer"
            >
              <ArrowLeft size={18} />
              <span className="font-semibold text-sm">{t('workspace.back')}</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-base font-bold text-foreground">{currentProjData.titleLong}</h1>
              <button
                onClick={() => navigate(isClient ? `/jobs/my-jobs/${project.jobId}` : `/jobs/${project.jobId}`)}
                className="text-[10px] text-[var(--gb-cyan)] font-bold hover:underline uppercase tracking-widest text-left mt-0.5 cursor-pointer"
              >
                {t('workspace.viewJobDetail')}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isClient && activeContract?.status === ContractStatus.Active && (
              <button
                onClick={() => setProductModalOpen(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] px-4 py-2 rounded-full shadow-lg shadow-green-500/20 transition-all uppercase tracking-widest cursor-pointer flex items-center gap-2"
                title={t('workspace.sendMaterialsTooltip')}
              >
                <Upload size={14} />
                <span>{t('workspace.sendMaterialsButton')}</span>
              </button>
            )}
            {activeContract?.status === ContractStatus.Active && workspaceContractId && (
              <>
                <button
                  onClick={() => setRaiseIssueModalOpen(true)}
                  className="rc-raise-issue-btn"
                  title={t('workspace.raiseIssue')}
                >
                  <AlertTriangle size={14} />
                  <span>{t('workspace.raiseIssue')}</span>
                </button>
                <button
                  onClick={handleToggleReportList}
                  className={`font-bold text-[10px] px-4 py-2 rounded-full transition-all uppercase tracking-widest cursor-pointer border ${
                    reportListOpen
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText size={14} className="inline mr-1" />
                  {t('workspace.issueReports')}
                </button>
              </>
            )}
            <button
              onClick={() => navigate(`/contracts/${project.contractId || contractId || ''}`)}
              className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-[10px] px-4 py-2 rounded-full shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest cursor-pointer"
            >
              {t('workspace.viewContract')}
            </button>
          </div>
        </header>

        {activeContract?.status === ContractStatus.PendingEscrow && (
          <div className="px-8 py-2 border-b border-amber-500/20 bg-amber-500/10 text-xs font-semibold text-amber-700 flex items-center gap-2">
            <CreditCard size={14} />
            <span>{t('workspace.escrowPending')}</span>
          </div>
        )}

        {/* Mobile Navigation Tabs (visible only on mobile/tablet) */}
        <div className="flex lg:hidden border-b border-border bg-card flex-shrink-0">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'list'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t('workspace.conversations')}
          </button>
          <button
            onClick={() => setMobileTab('milestones')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'milestones'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t('workspace.milestones')}
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'chat'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t('workspace.chatFiles')}
          </button>
        </div>

        {/* 3-Column Messaging Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Column 1: Conversations List (Left Pane - Collapsible) */}
          <section
            className={`border-r border-border flex flex-col bg-card flex-shrink-0 transition-all duration-300 ${
              isLeftPanelCollapsed ? 'w-0 opacity-0 overflow-hidden border-none pointer-events-none' : 'w-80'
            } lg:flex ${mobileTab === 'list' ? 'flex-1 w-full' : 'hidden lg:flex'}`}
          >
            <div className="px-4 py-3.5 border-b border-border flex items-center justify-between min-h-[53px] shrink-0">
              <span className="font-headline-sm text-xs uppercase tracking-widest text-muted-foreground font-semibold truncate">
                {t('workspace.recentWorkspace')}
              </span>
              <button
                type="button"
                onClick={toggleLeftPanel}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0"
                title="Thu gọn danh sách workspace"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {workspaceProjects.map(proj => {
                const isActive = proj.id === activeProjectId;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      navigate(`/workspace/${proj.id}`);
                    }}
                    className={`border-b border-border/50 p-4 cursor-pointer transition-all group hover:bg-muted/30 ${
                      isActive ? 'bg-[var(--gb-cyan)]/5 border-l-4 border-l-[var(--gb-cyan)]' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <UserProfileLink userId={proj.partnerUserId} role={isClient ? 'freelancer' : 'client'} className="relative flex-shrink-0">
                        <UserAvatar name={proj.partnerName} src={proj.partnerAvatar} userId={proj.partnerUserId} size="md" />
                        {proj.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
                        )}
                      </UserProfileLink>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-headline-sm text-sm truncate font-semibold">
                            <UserProfileLink userId={proj.partnerUserId} role={isClient ? 'freelancer' : 'client'}>
                              {proj.partnerName}
                            </UserProfileLink>
                          </h3>
                          <span className="text-[10px] text-muted-foreground">{proj.time}</span>
                        </div>
                        {proj.status === ContractStatus.Disputed && (
                          <span className="workspace-disputed-badge">
                            <LockKeyhole size={11} /> {t('workspace.disputedBadge')}
                          </span>
                        )}
                        <p className={`text-xs truncate ${proj.unread ? 'text-foreground font-semibold animate-pulse' : 'text-muted-foreground'}`}>
                          {proj.latestMessage}
                        </p>
                      </div>
                      {proj.unread && (
                        <span className="w-2 h-2 bg-[var(--gb-cyan)] rounded-full self-center" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Column 2: Milestone Management (Center Pane - 65% ratio) */}
          <section className={`flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm lg:flex ${mobileTab === 'milestones' ? 'flex' : 'hidden lg:flex'} ${showInfo ? 'lg:w-[65%] xl:w-[68%]' : 'lg:w-full'}`}>

            {/* Professional Milestone Management Header */}
            <div className="glass-header px-6 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0">
              {/* Left Title & Status */}
              <div className="flex items-center gap-3">
                {isLeftPanelCollapsed && (
                  <button
                    type="button"
                    onClick={toggleLeftPanel}
                    className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer hidden lg:flex items-center justify-center shrink-0 shadow-2xs"
                    title={t('workspace.recentWorkspace')}
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                )}
                <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 shadow-2xs">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-text-primary tracking-tight">{t('workspace.milestoneManagement')}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted font-medium">
                    <span>{t('workspace.totalMilestones')}: <strong className="text-text-primary">{project.milestones.length}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <span>{t('workspace.projectProgress')}:</span>
                      <span className="w-16 bg-surface-muted h-1.5 rounded-full overflow-hidden inline-block align-middle">
                        <span className="bg-brand h-full rounded-full block transition-all duration-300" style={{ width: `${project.progress}%` }} />
                      </span>
                      <strong className="text-text-primary">{project.progress}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Stats & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="text-[10px] uppercase tracking-wider opacity-80">{t('workspace.paidAmount')}:</span>
                  <GigCoinAmount amount={project.paidAmount || 0} />
                </div>

                <button
                  type="button"
                  onClick={handleOpenMilestoneEditor}
                  className="bg-surface-card hover:bg-surface-muted border border-border/80 text-text-primary font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <ListChecks size={14} className="text-brand" />
                  <span>{t('workspace.milestoneDetails')}</span>
                </button>

                {showEndProjectButton && (
                  <button
                    onClick={openEndProjectDialog}
                    disabled={!allMilestonesApproved}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    title={allMilestonesApproved ? t('workspace.releaseEscrowTooltip') : t('workspace.approveAllTooltip')}
                  >
                    <CheckCircle size={14} />
                    <span>{t('workspace.endProject')}</span>
                  </button>
                )}

                {activeContract?.canReview && (
                  <button
                    type="button"
                    onClick={() => setReviewDialogOpen(true)}
                    className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Star size={14} />
                    <span>{t(isClient ? 'reviews.leaveForFreelancer' : 'reviews.leaveForClient')}</span>
                  </button>
                )}

                {activeContract?.hasReviewedByCurrentUser && activeContract.status === ContractStatus.Completed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">
                    <CheckCircle size={13} /> {t('reviews.reviewed')}
                  </span>
                )}

                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl border transition cursor-pointer ${
                    showInfo 
                      ? 'bg-brand/10 border-brand/30 text-brand' 
                      : 'border-border text-text-muted hover:text-text-primary hover:bg-surface-muted'
                  }`}
                  title={t('workspace.toggleChatInfo')}
                >
                  <Info size={16} />
                </button>
              </div>
            </div>

            {showFreelancerPayoutCard && (
              <div className="workspace-receive-money-card" role="status" aria-live="polite">
                <div className="workspace-receive-money-icon">
                  <Wallet size={22} />
                </div>
                <div className="workspace-receive-money-copy">
                  <span>{t('workspace.finalPayout')}</span>
                  <h3>{t('workspace.finalPayoutReconciliation')}</h3>
                  <p>{t('workspace.finalPayoutNotice')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/wallet/history')}
                  className="workspace-receive-money-button"
                >
                  {t('workspace.viewWalletHistory')}
                </button>
              </div>
            )}

            {/* Milestones timeline/list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {project.milestones.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm">{t('workspace.noMilestones')}</p>
                </div>
              ) : (
                project.milestones.map((milestone, idx) => {
                  const isCompleted = milestone.status === 'approved' || milestone.status === 'completed';
                  const isInProgress = milestone.status === 'in_progress';
                  const isSubmitted = milestone.status === 'submitted';
                  const isPending = milestone.status === 'pending';
                  const previousMilestone = idx > 0 ? project.milestones[idx - 1] : null;
                  const isPreviousMilestoneStarted = idx === 0 || (previousMilestone && previousMilestone.status !== 'pending');
                  const isConsecutiveEarlyStart = isPending && isPreviousMilestoneStarted;
                  const canUnlockOrStartMilestone = isInProgress || isConsecutiveEarlyStart;

                  const isReleasedInFull = milestone.amount > 0 && milestone.releasedAmount >= milestone.amount;
                  const withdrawalEligibility = getEarlyWithdrawalEligibility(
                    project.milestones,
                    milestone,
                    activeContract?.status,
                    isFreelancer,
                  );
                  const showFreelancerWithdraw = isFreelancer &&
                    withdrawalEligibility.isContractActive &&
                    withdrawalEligibility.isApproved &&
                    !withdrawalEligibility.isAtCap;
                  const showEarlyWithdrawalCap = isFreelancer &&
                    withdrawalEligibility.isApproved &&
                    withdrawalEligibility.isAtCap &&
                    !isReleasedInFull;
                  const workItems = milestone.workItems || [];
                  const allWorkItemsCompleted = workItems.length > 0 && workItems.every(item => Number(item.status) === ContractWorkItemStatus.Completed);
                  const canFreelancerSubmit = !isWorkspaceLocked && !isClient && canUnlockOrStartMilestone && allWorkItemsCompleted;
                  const canClientReview = !isWorkspaceLocked && isClient && isSubmitted;
                  const canFreelancerRequestUnlock = !isWorkspaceLocked && !isClient && isPending && isPreviousMilestoneStarted;
                  const isMilestoneActionPending = milestoneActionPendingId === milestone.id;
                  const earlyStartRequest = (earlyStartRequests || []).find(request => request.milestoneId === milestone.id && Number(request.status) === 0);

                  return (
                    <div
                      key={milestone.id || idx}
                      className={`border rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${
                        isCompleted
                          ? 'bg-card border-green-500/20'
                          : isInProgress
                          ? 'bg-card border-[var(--gb-cyan)]/50 ring-1 ring-[var(--gb-cyan)]/25'
                          : isConsecutiveEarlyStart
                          ? 'bg-card border-amber-500/30'
                          : 'bg-muted/10 opacity-75 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {isCompleted ? (
                              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                            ) : isInProgress ? (
                              <div className="w-5 h-5 rounded-full border-2 border-[var(--gb-cyan)] flex items-center justify-center flex-shrink-0">
                                <div className="w-2.5 h-2.5 bg-[var(--gb-cyan)] rounded-full animate-pulse"></div>
                              </div>
                            ) : isConsecutiveEarlyStart ? (
                              <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                              </div>
                            ) : (
                              <Circle size={20} className="text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{milestone.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{milestone.description || t('workspace.noDescription')}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">{t('workspace.amount')}:</span> <GigCoinAmount amount={milestone.amount} />
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">{t('workspace.released')}</span> <GigCoinAmount amount={milestone.releasedAmount} />
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">{t('workspace.dueDate')}:</span> {milestone.dueDate}
                              </span>
                              {milestone.completedAt && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <span className="font-semibold text-foreground">{t('workspace.completed')}:</span> {new Date(milestone.completedAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-green-500/10 text-green-500'
                              : isInProgress
                              ? 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] animate-pulse'
                              : isConsecutiveEarlyStart
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {milestone.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-border pt-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Work Breakdown Structure</h4>
                        {workItems.map((workItem, workIndex) => {
                          const status = Number(workItem.status);
                          const canStartWork = !isWorkspaceLocked && !isClient && canUnlockOrStartMilestone && (status === ContractWorkItemStatus.Todo || status === ContractWorkItemStatus.RevisionRequired);
                          const canCompleteWork = !isWorkspaceLocked && !isClient && canUnlockOrStartMilestone && status === ContractWorkItemStatus.InProgress;
                          return <div key={workItem.workItemId} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-xs">{workIndex + 1}. {workItem.title}</strong>{workItem.description && <p className="mt-1 text-[11px] text-muted-foreground">{workItem.description}</p>}</div><span className="rounded bg-muted px-2 py-1 text-[10px] font-bold">{ContractWorkItemStatus[status] || status}</span></div>
                            {workItem.progressNote && <p className="mt-2 text-[11px]"><strong>Progress:</strong> {workItem.progressNote}</p>}
                            {(canStartWork || canCompleteWork) && <button type="button" onClick={() => handleWorkItemTransition(milestone.id, workItem.workItemId, canCompleteWork ? ContractWorkItemStatus.Completed : ContractWorkItemStatus.InProgress)} disabled={isMilestoneActionPending} className="mt-2 rounded border border-border px-3 py-1.5 text-[10px] font-bold hover:bg-muted disabled:opacity-50">{canCompleteWork ? 'Mark completed' : status === ContractWorkItemStatus.RevisionRequired ? 'Start revision' : 'Start work item'}</button>}
                          </div>;
                        })}
                      </div>

                      {(isInProgress || isSubmitted || canFreelancerRequestUnlock || showFreelancerWithdraw || showEarlyWithdrawalCap || (!isClient && isCompleted && isReleasedInFull)) && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
                          <div className="flex-1 max-w-xs">
                            {showFreelancerWithdraw ? (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {t('earlyWithdrawal.availableBeforeEnd')} <GigCoinAmount amount={withdrawalEligibility.availableAmount} />
                              </span>
                            ) : !isClient && isCompleted && isReleasedInFull ? (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                {t('workspace.releasedInFull')}
                              </span>
                            ) : showEarlyWithdrawalCap ? (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                {t('earlyWithdrawal.maximumReached')}
                              </span>
                            ) : (isInProgress || isSubmitted) ? (
                              <>
                                <div className="flex justify-between text-[10px] mb-1">
                                  <span className="text-muted-foreground">{t('workspace.progress')}</span>
                                  <span className="font-bold text-[var(--gb-cyan)]">{isSubmitted ? '90%' : '65%'}</span>
                                </div>
                                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                  <div className={`bg-[var(--gb-cyan)] h-full rounded-full ${isSubmitted ? 'w-[90%]' : 'w-[65%]'}`}></div>
                                </div>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {t('workspace.waitingClientUnlock')}
                              </span>
                            )}
                          </div>
                          <div>
                            {canClientReview ? (
                              <button
                                onClick={() => navigate(`/contracts/${workspaceContractId}/milestones/${milestone.id}/approve`)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                              >
                                {t('workspace.reviewMilestone')}
                              </button>
                            ) : canFreelancerSubmit ? (
                              <button
                                onClick={() => openSubmitModal(milestone)}
                                className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                              >
                                {t('workspace.submitDeliverable')}
                              </button>
                            ) : canFreelancerRequestUnlock ? (
                              <button
                                onClick={() => handleRequestPendingMilestoneUnlock(milestone.id)}
                                disabled={isMilestoneActionPending}
                                className="bg-card hover:bg-muted disabled:opacity-60 text-foreground border border-border px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                              >
                                {isMilestoneActionPending ? t('workspace.requesting') : 'Request early start'}
                              </button>
                            ) : showFreelancerWithdraw ? (
                              <button
                                type="button"
                                onClick={() => openWithdrawDialog(milestone.id, milestone.title, withdrawalEligibility.availableAmount)}
                                disabled={isMilestoneActionPending || !withdrawalEligibility.meetsApprovalThreshold}
                                title={withdrawalEligibility.meetsApprovalThreshold
                                  ? t('earlyWithdrawal.actionTooltip')
                                  : t('earlyWithdrawal.thresholdTooltip', {
                                      approved: withdrawalEligibility.approvedMilestones,
                                      required: withdrawalEligibility.requiredApprovedMilestones,
                                    })}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                              >
                                {isMilestoneActionPending ? t('earlyWithdrawal.submitting') : t('earlyWithdrawal.action')}
                              </button>
                            ) : !isClient && isCompleted && isReleasedInFull ? (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                {t('workspace.releasedInFull')}
                              </span>
                            ) : showEarlyWithdrawalCap ? (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                {t('earlyWithdrawal.maximumReached')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {isSubmitted ? t('workspace.waitingClientReview') : t('workspace.waitingFreelancer')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {milestoneActionError?.milestoneId === milestone.id && (
                        <div className="mt-3 text-[11px] font-semibold text-red-500">
                          {milestoneActionError.message}
                        </div>
                      )}
                      {showFreelancerWithdraw && !withdrawalEligibility.meetsApprovalThreshold && (
                        <div className="mt-3 text-[11px] font-semibold text-amber-600">
                          {t('earlyWithdrawal.thresholdWarning', {
                            approved: withdrawalEligibility.approvedMilestones,
                            required: withdrawalEligibility.requiredApprovedMilestones,
                          })}
                        </div>
                      )}
                      {!isClient && isInProgress && !allWorkItemsCompleted && <p className="mt-3 text-[11px] font-semibold text-amber-600">Complete every work item before submitting this milestone.</p>}
                      {!isWorkspaceLocked && isClient && earlyStartRequest && (
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                          <strong>{t('workspace.earlyStartRequested', 'Early start requested')}</strong>
                          <p className="mt-1 text-muted-foreground">{earlyStartRequest.reason}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={isMilestoneActionPending}
                              onClick={async () => {
                                setMilestoneActionPendingId(milestone.id);
                                const result = await handleRespondEarlyStart(earlyStartRequest.requestId, true);
                                if (!result.success) {
                                  setMilestoneActionError({ milestoneId: milestone.id, message: result.message || t('workspace.approveFailed', 'Could not approve request.') });
                                  toast.error(result.message || t('workspace.approveFailed', 'Could not approve request.'));
                                } else {
                                  toast.success(t('workspace.earlyStartApproved', 'Early start request approved.'));
                                }
                                setMilestoneActionPendingId(null);
                              }}
                              className="rounded bg-emerald-600 px-3 py-1.5 font-bold text-white cursor-pointer hover:bg-emerald-700 transition-colors"
                            >
                              {t('common.approve', 'Approve')}
                            </button>
                            <button
                              type="button"
                              disabled={isMilestoneActionPending}
                              onClick={() => {
                                openPromptModal({
                                  title: t('workspace.rejectEarlyStartTitle', 'Reject Early Start Request'),
                                  description: t('workspace.rejectEarlyStartDesc', 'Provide an optional rejection note for the freelancer.'),
                                  placeholder: t('workspace.rejectEarlyStartPlaceholder', 'Enter rejection note (optional)...'),
                                  required: false,
                                  confirmText: t('workspace.rejectRequest', 'Reject Request'),
                                  confirmVariant: 'danger',
                                  onConfirm: async (note) => {
                                    setMilestoneActionPendingId(milestone.id);
                                    const result = await handleRespondEarlyStart(earlyStartRequest.requestId, false, note || undefined);
                                    if (!result.success) {
                                      setMilestoneActionError({ milestoneId: milestone.id, message: result.message || t('workspace.rejectFailed', 'Could not reject request.') });
                                      toast.error(result.message || t('workspace.rejectFailed', 'Could not reject request.'));
                                    } else {
                                      toast.success(t('workspace.earlyStartRejected', 'Early start request rejected.'));
                                    }
                                    setMilestoneActionPendingId(null);
                                  },
                                });
                              }}
                              className="rounded border border-red-500/40 px-3 py-1.5 font-bold text-red-500 cursor-pointer hover:bg-red-500/10 transition-colors"
                            >
                              {t('common.reject', 'Reject')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Column 3: Interaction Pane (Right Pane - tabs: Chat, Files - 25-30% ratio) */}
          <aside
            className={`border-l border-border flex flex-col bg-card overflow-hidden transition-all duration-300 flex-shrink-0
              lg:${ showInfo ? 'w-[35%] xl:w-[30%] 2xl:w-[25%] max-w-[420px] min-w-[300px] opacity-100' : 'w-0 opacity-0 pointer-events-none' }
              ${mobileTab === 'chat' ? 'flex flex-1' : 'hidden lg:flex'}
              ${!showInfo ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : ''}
            `}
          >
            {/* 2 Tabs at the top */}
            <div className="flex border-b border-border bg-card">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare size={14} />
                <span>{t('nav.messages')}</span>
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'files'
                    ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText size={14} />
                <span>{t('workspace.sharedFiles')}</span>
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  {/* Chat Header */}
                  <div className="glass-header px-4 py-3 border-b border-border flex justify-between items-center flex-shrink-0">
                    {/* Partner info with JS-state hover popover */}
                    <div
                      className="flex items-center gap-3 relative cursor-pointer py-1"
                      onMouseEnter={() => {
                        if (profilePopoverTimeout.current) clearTimeout(profilePopoverTimeout.current);
                        setShowProfilePopover(true);
                      }}
                      onMouseLeave={() => {
                        profilePopoverTimeout.current = setTimeout(() => setShowProfilePopover(false), 150);
                      }}
                    >
                      <UserProfileLink userId={partnerUserId} role={isClient ? 'freelancer' : 'client'} className="flex items-center gap-3">
                        <span className="relative">
                          <UserAvatar name={partnerName} src={partnerAvatar} userId={partnerUserId} size="sm" />
                          {isPartnerOnline && (
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-card rounded-full"></span>
                          )}
                        </span>
                        <span>
                          <h2 className="text-xs font-semibold">{partnerName}</h2>
                          <p className="text-[9px] text-green-500 font-semibold uppercase tracking-widest">
                            {isPartnerOnline ? t('workspace.online') : t('workspace.offline')} • {partnerTitle}
                          </p>
                        </span>
                      </UserProfileLink>

                      {/* Hover Popover — stays open while hovered */}
                      {showProfilePopover && (
                        <div
                          className="absolute left-0 top-full w-64 bg-card border border-border rounded-xl shadow-2xl p-4 z-[80]"
                          onMouseEnter={() => {
                            if (profilePopoverTimeout.current) clearTimeout(profilePopoverTimeout.current);
                          }}
                          onMouseLeave={() => {
                            profilePopoverTimeout.current = setTimeout(() => setShowProfilePopover(false), 150);
                          }}
                        >
                          <div className="text-center">
                            <UserProfileLink userId={partnerUserId} role={isClient ? 'freelancer' : 'client'}>
                              <UserAvatar name={partnerName} src={partnerAvatar} userId={partnerUserId} size="lg" className="mx-auto mb-2" />
                              <h3 className="font-bold text-xs text-foreground">{partnerName}</h3>
                            </UserProfileLink>
                            <p className="text-[9px] text-muted-foreground mb-3">{partnerTitle} at {partnerCompany}</p>
                            <div className="flex justify-center gap-2 mb-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const path = getProfilePath(partnerUserId, isClient ? 'freelancer' : 'client');
                                  if (path) navigate(path);
                                }}
                                className="text-[8px] font-bold px-3 py-1 rounded-full bg-secondary text-foreground hover:bg-muted uppercase tracking-wider transition-all cursor-pointer"
                              >
                                {t('workspace.viewProfile')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsFavorited(!isFavorited);
                                }}
                                className={`text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                                  isFavorited ? 'bg-[var(--gb-cyan)] text-white' : 'bg-secondary text-foreground hover:bg-muted'
                                }`}
                              >
                                {isFavorited ? t('workspace.favorited') : t('workspace.favorite')}
                              </button>
                            </div>
                            <div className="border-t border-border pt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextBlocked = !isBlocked;
                                  setIsBlocked(nextBlocked);
                                  toast.success(nextBlocked ? t('workspace.contactBlocked') : t('workspace.contactUnblocked'));
                                }}
                                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${
                                  isBlocked ? 'border-green-500/30 text-green-500 hover:bg-green-500/5' : 'border-red-500/30 text-red-500 hover:bg-red-500/5'
                                }`}
                              >
                                <Ban size={10} />
                                {isBlocked ? t('workspace.unblockContact') : t('workspace.blockContact')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                    <div className="flex justify-center mb-1">
                      <span className="bg-muted px-2.5 py-0.5 rounded-full text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {t('workspace.chatHeader')}
                      </span>
                    </div>

                    {projectMessages.map((msg, index) => {
                      const isMe = msg.senderId === user?.id || (msg.senderId === 'client' && isClient) || (msg.senderId === 'freelancer' && !isClient);
                      const reportEvent = parseReportSystemMessageMetadata(msg.metadata);
                      const isSystemMessage = msg.type === 'system';

                      if (reportEvent) {
                        const detail = getReportSystemDetail(reportEvent);
                        const isSelected = viewReportId === reportEvent.reportId;
                        const isUnavailable = unavailableReportId === reportEvent.reportId;
                        const titleKey = reportEvent.eventType === 'created'
                          ? 'workspace.reportSystemCreatedTitle'
                          : reportEvent.eventType === 'resolved'
                            ? 'workspace.reportSystemResolvedTitle'
                            : 'workspace.reportSystemUpdatedTitle';

                        return (
                          <div key={msg.id || index} className="flex justify-center self-stretch">
                            <div
                              id={`report-system-${reportEvent.reportId}`}
                              className={`w-full max-w-md rounded-xl border bg-card p-4 shadow-sm transition-all ${
                                isSelected
                                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                                  : 'border-amber-500/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {reportEvent.eventType === 'resolved' ? (
                                    <CheckCircle size={18} className="text-green-500" />
                                  ) : (
                                    <AlertTriangle size={18} className="text-amber-500" />
                                  )}
                                  <h4 className="text-sm font-bold text-foreground">{t(titleKey)}</h4>
                                </div>
                                <span className={`rc-status rc-status-${reportEvent.status}`}>
                                  {t(REPORT_STATUS_KEYS[reportEvent.status] || 'workspace.reportStatusPending')}
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-muted-foreground">
                                {getReportSystemSummary(reportEvent, t)}
                              </p>

                              {reportEvent.eventType === 'created' && (
                                <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
                                  <div>
                                    <strong>{t('workspace.reportSystemReason')}:</strong>{' '}
                                    {t(REPORT_ISSUE_KEYS[reportEvent.issueType] || 'workspace.reportIssueTypeOther')}
                                  </div>
                                  <div>
                                    <strong>{t('workspace.reportDesiredResolution')}:</strong>{' '}
                                    {reportEvent.desiredResolution}
                                  </div>
                                  <div>
                                    <strong>{t('workspace.reportDescription')}:</strong>{' '}
                                    {reportEvent.description}
                                  </div>
                                </div>
                              )}

                              {reportEvent.eventType === 'updated' && (
                                <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
                                  <div>
                                    <strong>{t('workspace.reportSystemAction')}:</strong>{' '}
                                    {reportEvent.resolutionAction === null
                                      ? t('workspace.reportSystemUpdatedTitle')
                                      : t(REPORT_ACTION_KEYS[reportEvent.resolutionAction])}
                                  </div>
                                  {detail && (
                                    <div>
                                      <strong>{t('workspace.reportSystemReason')}:</strong> {detail}
                                    </div>
                                  )}
                                </div>
                              )}

                              {reportEvent.eventType === 'resolved' && (
                                <p className="mt-3 rounded-lg bg-green-500/10 p-3 text-xs font-medium text-green-600">
                                  {t('workspace.reportSystemResolvedBody')}
                                </p>
                              )}

                              {isUnavailable ? (
                                <p className="mt-3 text-xs font-semibold text-red-500">
                                  {t('workspace.reportUnavailable')}
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleViewContractReport(reportEvent.reportId)}
                                  disabled={isLoadingReportDetail && isSelected}
                                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-600 transition hover:bg-amber-500/10 disabled:opacity-50"
                                >
                                  {isLoadingReportDetail && isSelected
                                    ? t('common.loading')
                                    : t('workspace.reportView')}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (isSystemMessage) {
                        return (
                          <div key={msg.id || index} className="flex justify-center self-stretch">
                            <div className="max-w-md rounded-full border border-border bg-muted/80 px-4 py-1.5 text-center text-xs font-medium text-muted-foreground">
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id || index} className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : ''}`}>
                          {!isMe && (
                            <UserProfileLink userId={partnerUserId} role={isClient ? 'freelancer' : 'client'} className="flex-shrink-0">
                              <UserAvatar name={partnerName} src={partnerAvatar} userId={partnerUserId} size="sm" />
                            </UserProfileLink>
                          )}
                          <div className="flex flex-col gap-1">
                            {msg.type === 'file' ? (
                              <div className="bg-card p-3 rounded-xl shadow-sm border border-border max-w-[280px]">
                                <p className="text-xs text-foreground mb-2">{msg.content}</p>
                                <div className="rounded-lg overflow-hidden border border-border">
                                  {msg.fileUrl ? (
                                    <img alt="Attachment" className="w-full h-32 object-cover" src={msg.fileUrl} />
                                  ) : (
                                    <div className="w-full h-24 bg-muted flex items-center justify-center">
                                      <FileText size={24} className="text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="bg-muted p-1.5 flex justify-between items-center text-[9px] text-muted-foreground">
                                    <span className="truncate max-w-[150px]">{msg.fileName}</span>
                                    <Download size={12} className="cursor-pointer hover:text-[var(--gb-cyan)]" onClick={() => toast.info(t('workspace.downloadSim', { name: msg.fileName }))} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`p-3 rounded-xl shadow-sm border text-xs leading-relaxed ${isMe ? 'bg-[var(--gb-cyan)] text-white border-transparent rounded-br-none' : 'bg-card text-foreground border-border rounded-bl-none'}`}>
                                <p>{msg.content}</p>
                              </div>
                            )}
                            <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[9px] text-muted-foreground">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              {isMe && (
                                <span className="text-[10px] text-[var(--gb-cyan)] font-bold">✓✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input area */}
                  {isWorkspaceLocked ? (
                    <div className="p-4 bg-muted/50 border-t border-border text-center text-xs font-semibold text-muted-foreground">
                      {isContractDisputed ? (
                        <div className="workspace-dispute-lock">
                          <AlertTriangle size={18} />
                          <div>
                            <strong>{t('workspace.disputeLockedTitle')}</strong>
                            <p>{t('workspace.disputeLockedDescription')}</p>
                          </div>
                          {activeDisputeId && (
                            <button type="button" onClick={() => navigate(`/contracts/${workspaceContractId}/disputes/${activeDisputeId}`)}>
                              {t('workspace.openDispute')}
                            </button>
                          )}
                        </div>
                      ) : t('workspace.viewOnlyNotice')}
                    </div>
                  ) : (
                  <div className="p-3 bg-card border-t border-border flex-shrink-0">
                    <div className="flex flex-col border border-border rounded-xl bg-card relative focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 transition-all">
                      <textarea
                        className="w-full bg-transparent border-none focus:outline-none p-3 resize-none min-h-[44px] text-xs focus:ring-0"
                        placeholder={t('workspace.typeMessagePlaceholder')}
                        rows={1}
                        value={messageInput ?? ''}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />

                      <div className="flex justify-between items-center px-3 pb-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleSimulateAttachment}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer"
                            title={t('workspace.attachFile')}
                          >
                            <Paperclip size={14} />
                          </button>
                          <button
                            onClick={() => setMessageInput(prev => `${prev ?? ''}😊`)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer"
                            title={t('workspace.addEmoji')}
                          >
                            <Smile size={14} />
                          </button>
                        </div>
                        <button
                          onClick={handleSendMessage}
                          className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white h-8 px-4 rounded-full flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          <span>{t('workspace.send')}</span>
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-headline-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('workspace.sharedFiles')}</h4>
                    <button className="text-[10px] text-[var(--gb-cyan)] hover:underline font-semibold cursor-pointer">{t('workspace.seeAll')}</button>
                  </div>
                  <div className="space-y-3">
                    {productHandoffs.map(handoff => {
                      const productUrl = getProductHandoffUrl(handoff);
                      const isLink = handoff.sourceType === ContractProductHandoffSourceType.Link;

                      return (
                        <button
                          type="button"
                          key={handoff.contractProductHandoffId}
                          onClick={productUrl ? () => window.open(productUrl, '_blank', 'noopener,noreferrer') : undefined}
                          disabled={!productUrl}
                          aria-label={t('workspace.openHandoffAria', { defaultValue: `Open ${getProductHandoffLabel(handoff, t)} version ${handoff.version}`, label: getProductHandoffLabel(handoff, t), version: handoff.version })}
                          className={`w-full text-left flex items-center gap-3 p-3 bg-[var(--gb-cyan)]/5 rounded-lg transition-all border border-[var(--gb-cyan)]/20 ${
                            productUrl ? 'cursor-pointer hover:bg-[var(--gb-cyan)]/10' : 'cursor-default opacity-70'
                          }`}
                        >
                          <div className="w-9 h-9 rounded bg-[var(--gb-cyan)]/10 flex items-center justify-center flex-shrink-0 text-[var(--gb-cyan)]">
                            {isLink ? <Link2 size={18} /> : <FileText size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold truncate text-foreground">
                              {getProductHandoffLabel(handoff, t)}
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {t('workspace.version', { version: handoff.version })}
                              {handoff.note ? ` - ${handoff.note}` : ''}
                            </p>
                          </div>
                          {productUrl && (
                            <Download size={14} className="text-muted-foreground hover:text-[var(--gb-cyan)] flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    {[
                      { name: 'Contract_Alex_J.pdf', size: '2.4 MB', date: 'Oct 14', icon: <FileText className="text-red-500" /> },
                      { name: 'UI_Moodboard_v1.zip', size: '18.5 MB', date: 'Oct 13', icon: <ImageIcon className="text-[var(--gb-cyan)]" /> },
                      { name: 'Project_Timeline.xlsx', size: '120 KB', date: 'Oct 11', icon: <Table className="text-green-500" /> }
                    ].map(file => (
                      <div
                        key={file.name}
                        onClick={() => toast.info(t('workspace.downloadSim', { name: file.name }))}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-all border border-transparent hover:border-border"
                      >
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          {file.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate text-foreground">{file.name}</p>
                          <p className="text-[9px] text-muted-foreground">{file.size} • {file.date}</p>
                        </div>
                        <Download size={14} className="text-muted-foreground hover:text-[var(--gb-cyan)] flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <EarlyWithdrawalDialog
        open={Boolean(withdrawDialogMilestone)}
        milestoneTitle={withdrawDialogMilestone?.title || ''}
        availableAmount={withdrawDialogMilestone?.availableAmount || 0}
        submitting={Boolean(withdrawDialogMilestone && milestoneActionPendingId === withdrawDialogMilestone.milestoneId)}
        error={withdrawDialogMilestone && milestoneActionError?.milestoneId === withdrawDialogMilestone.milestoneId
          ? milestoneActionError.message
          : null}
        onConfirm={confirmMilestoneWithdrawal}
        onCancel={closeWithdrawDialog}
      />

      <ServiceFeeDialog
        open={endProjectModalOpen}
        mode={endProjectFeeMode}
        action="endProject"
        jobAmount={completedJobAmount}
        serviceFee={endProjectServiceFee}
        balance={endProjectBalance}
        loadingBalance={isLoadingEndProjectBalance}
        submitting={isEndingProject}
        error={endProjectError}
        onConfirm={handleConfirmEndProject}
        onCancel={closeEndProjectDialog}
        onTopUp={() => {
          setEndProjectModalOpen(false);
          navigate('/wallet/deposit');
        }}
      />

      <ProjectReviewDialog
        open={reviewDialogOpen}
        contract={activeContract}
        role={reviewRole}
        onClose={closeReviewDialog}
        onSubmitted={handleReviewSubmitted}
      />

      {submitModal && (
        <div className="workspace-submit-modal-backdrop" role="presentation">
          <div className="workspace-submit-modal" role="dialog" aria-modal="true" aria-labelledby="workspace-submit-title">
            <div className="workspace-submit-modal-header">
              <div>
                <h3 id="workspace-submit-title">{t('workspace.submitDeliverableModalTitle')}</h3>
                <p>{submitModal.title}</p>
              </div>
              <button
                type="button"
                onClick={resetSubmitModal}
                className="workspace-submit-icon-button"
                title={t('common.close')}
                disabled={isSubmittingDeliverable}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDeliverable} className="workspace-submit-form">
              {submitError && (
                <div className="workspace-submit-error">
                  <AlertCircle size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="workspace-submit-field">
                  <label htmlFor="workspace-deliverable-file">{t('workspace.fileSourceOption')}</label>
                  <input
                    ref={submitFileInputRef}
                    id="workspace-deliverable-file"
                    type="file"
                    onChange={handleSelectSubmitFile}
                    disabled={isSubmittingDeliverable}
                  />
                  {submitFile && (
                    <div className="workspace-submit-file">
                      <FileText size={15} />
                      <span>{submitFile.name}</span>
                      <strong>{(submitFile.size / (1024 * 1024)).toFixed(2)} MB</strong>
                    </div>
                  )}
                </div>

              <div className="workspace-submit-field">
                <label htmlFor="workspace-deliverable-description">{t('workspace.descriptionField')}</label>
                <textarea
                  id="workspace-deliverable-description"
                  value={submitDescription ?? ''}
                  onChange={(event) => setSubmitDescription(event.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder={t('workspace.addNotesPlaceholder')}
                  disabled={isSubmittingDeliverable}
                />
                <span className="workspace-submit-count">{(submitDescription ?? '').length}/5000</span>
              </div>

              <div className="workspace-submit-actions">
                <button
                  type="button"
                  className="workspace-submit-secondary"
                  onClick={resetSubmitModal}
                  disabled={isSubmittingDeliverable}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="workspace-submit-primary"
                  disabled={
                    isSubmittingDeliverable ||
                    !submitFile
                  }
                >
                  {isSubmittingDeliverable ? (
                    <>
                      <Loader2 size={15} className="workspace-submit-spin" />
                      {t('workspace.submitting')}
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      {t('common.submit')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productModalOpen && (
        <div className="workspace-submit-modal-backdrop" role="presentation">
          <div className="workspace-submit-modal" role="dialog" aria-modal="true" aria-labelledby="workspace-product-title">
            <div className="workspace-submit-modal-header">
              <div>
                <h3 id="workspace-product-title">{t('workspace.sendMaterialsModalTitle')}</h3>
                <p>{t('workspace.sendMaterialsModalDesc')}</p>
              </div>
              <button
                type="button"
                onClick={resetProductModal}
                className="workspace-submit-icon-button"
                title={t('common.close')}
                disabled={isSendingProduct}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendProductMaterials} className="workspace-submit-form">
              {productError && (
                <div className="workspace-submit-error">
                  <AlertCircle size={16} />
                  <span>{productError}</span>
                </div>
              )}

              <div className="workspace-submit-mode" role="tablist" aria-label="Work material source">
                <button
                  type="button"
                  className={productMode === 'file' ? 'active' : ''}
                  onClick={() => {
                    setProductMode('file');
                    setProductLink('');
                    setProductError(null);
                  }}
                >
                  <Upload size={15} />
                  {t('workspace.fileSourceOption')}
                </button>
                <button
                  type="button"
                  className={productMode === 'link' ? 'active' : ''}
                  onClick={() => {
                    setProductMode('link');
                    setProductFile(null);
                    setProductError(null);
                    if (productFileInputRef.current) {
                      productFileInputRef.current.value = '';
                    }
                  }}
                >
                  <Link2 size={15} />
                  {t('workspace.linkSourceOption')}
                </button>
              </div>

              {productMode === 'file' ? (
                <div className="workspace-submit-field">
                  <label htmlFor="workspace-product-file">{t('workspace.workMaterialFileField')}</label>
                  <input
                    ref={productFileInputRef}
                    id="workspace-product-file"
                    type="file"
                    onChange={handleSelectProductFile}
                    disabled={isSendingProduct}
                  />
                  {productFile && (
                    <div className="workspace-submit-file">
                      <FileText size={15} />
                      <span>{productFile.name}</span>
                      <strong>{(productFile.size / (1024 * 1024)).toFixed(2)} MB</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="workspace-submit-field">
                  <label htmlFor="workspace-product-link">{t('workspace.workMaterialLinkField')}</label>
                  <input
                    id="workspace-product-link"
                    type="url"
                    value={productLink ?? ''}
                    onChange={(event) => setProductLink(event.target.value)}
                    placeholder="https://..."
                    disabled={isSendingProduct}
                  />
                </div>
              )}

              <div className="workspace-submit-field">
                <label htmlFor="workspace-product-note">{t('workspace.noteField')}</label>
                <textarea
                  id="workspace-product-note"
                  value={productNote ?? ''}
                  onChange={(event) => setProductNote(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder={t('workspace.describeMaterialsPlaceholder')}
                  disabled={isSendingProduct}
                />
                <span className="workspace-submit-count">{(productNote ?? '').length}/2000</span>
              </div>

              <div className="workspace-submit-actions">
                <button
                  type="button"
                  className="workspace-submit-secondary"
                  onClick={resetProductModal}
                  disabled={isSendingProduct}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="workspace-submit-primary"
                  disabled={
                    isSendingProduct ||
                    (productMode === 'file' && !productFile) ||
                    (productMode === 'link' && !productLink.trim())
                  }
                >
                  {isSendingProduct ? (
                    <>
                      <Loader2 size={15} className="workspace-submit-spin" />
                      {t('workspace.sending')}
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      {t('workspace.sendButton')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workspaceContractId && (
        <RaiseIssueModal
          contractId={workspaceContractId}
          isOpen={raiseIssueModalOpen}
          onClose={() => setRaiseIssueModalOpen(false)}
          onSubmit={handleCreateContractReport}
          isSubmitting={isCreatingReport}
        />
      )}

      {reportListOpen && (
        <div className="rc-modal-backdrop" role="presentation" onClick={handleCloseReportList}>
          <div
            className="rc-modal rc-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rc-report-list-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rc-modal-header">
              <div>
                <h3 id="rc-report-list-title">{t('workspace.issueReports')}</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReportList}
                className="rc-icon-button"
                title={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>
            {reportError && (
              <div className="rc-form">
                <div className="rc-error">
                  <AlertCircle size={16} />
                  <span>{reportError}</span>
                </div>
              </div>
            )}
            <ReportList
              reports={contractReports}
              isLoading={isLoadingReports}
              currentUserId={user?.id ?? ''}
              onViewReport={handleViewContractReport}
            />
          </div>
        </div>
      )}

      {viewReportId && isLoadingReportDetail && (
        <div className="rc-modal-backdrop" role="presentation">
          <div className="rc-modal" role="status" aria-live="polite">
            <div className="rc-list-loading">
              <Loader2 size={20} className="rc-spin" />
              <span>{t('common.loading')}</span>
            </div>
          </div>
        </div>
      )}

      {viewReportId && selectedReport?.id === viewReportId && !isLoadingReportDetail && (
        <ReportDetailModal
          report={selectedReport}
          contractTitle={activeContract?.title || project.title}
          currentUserId={user?.id ?? ''}
          isOpen
          onClose={handleCloseReportDetail}
          onRespond={handleRespondToContractReport}
          onConfirm={handleConfirmContractReport}
          onEscalate={handleEscalateContractReport}
          onDisputeCreated={(disputeId) => navigate(`/contracts/${workspaceContractId}/disputes/${disputeId}`)}
          isResponding={isRespondingReport}
          isConfirming={isConfirmingReport}
          isEscalating={isEscalatingReport}
        />
      )}

      {promptModalConfig && (
        <WorkspacePromptModal
          isOpen={Boolean(promptModalConfig)}
          title={promptModalConfig.title}
          description={promptModalConfig.description}
          placeholder={promptModalConfig.placeholder}
          confirmText={promptModalConfig.confirmText}
          confirmVariant={promptModalConfig.confirmVariant}
          required={promptModalConfig.required}
          onConfirm={promptModalConfig.onConfirm}
          onClose={closePromptModal}
        />
      )}
    </AppLayout>
  );
}

interface WorkspacePromptModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  required?: boolean;
  onConfirm: (value: string) => Promise<void> | void;
  onClose: () => void;
}

function WorkspacePromptModal({
  isOpen,
  title,
  description,
  placeholder,
  confirmText = 'Submit',
  confirmVariant = 'primary',
  required = false,
  onConfirm,
  onClose,
}: WorkspacePromptModalProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (required && !value.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(value.trim());
      onClose();
    } catch {
      // Error handled in onConfirm callback
    } finally {
      setIsSubmitting(false);
    }
  };

  const btnColor = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : confirmVariant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 text-foreground">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold">{title}</h3>
          <button onClick={onClose} type="button" className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {description && <p className="text-xs text-muted-foreground mb-4">{description}</p>}
        <form onSubmit={handleSubmit}>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder || 'Enter details...'}
            rows={3}
            required={required}
            className="w-full bg-background border border-border rounded-xl p-3 text-xs mb-4 text-foreground focus:outline-none focus:border-[var(--gb-cyan)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-border hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (required && !value.trim())}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 ${btnColor}`}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
