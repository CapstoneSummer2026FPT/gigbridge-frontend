import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Ban, Send, AlertTriangle, PanelLeftOpen, PanelLeftClose,
  PanelRightOpen, PanelRightClose,
  Paperclip, Smile, CheckCircle,
  FileText, CreditCard, MessageSquare,
  Upload, Link2, X, AlertCircle, Loader2, Wallet, LockKeyhole, Star,
  FolderOpen, RefreshCw, Award, ShieldAlert, Layers, Briefcase
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { ContractStatus, ContractWorkItemStatus, type WorkspaceFileDto } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import type { EscalateReportToDisputeInput } from '../../../types/models/Dispute';
import {
  ContractReportIssueType,
  ContractReportResolutionAction,
  ContractReportStatus,
} from '../../../types/models/ReportContract';
import '../styles/project-workspace-screen.css';
import { ChatSystemBanner } from '../../messages/components/ChatSystemBanner';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { EarlyWithdrawalDialog } from '../../../shared/components/EarlyWithdrawalDialog';
import { getEarlyWithdrawalEligibility } from '../../../shared/utils/earlyWithdrawal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../app/components/ui/alert-dialog';
import { useReportContract, RaiseIssueModal, CombinedIssueReportsModal } from '../../../features/report-contracts';
import { toast } from 'sonner';
import {
  parseReportSystemMessageMetadata,
  type ReportSystemMessageMetadata,
} from '../utils/reportSystemMessage';
import { ProjectReviewDialog } from '../../reviews/components/ProjectReviewDialog';
import '../../reviews/styles/reviews-screen.css';
import { FileTypeBadge } from '../../../shared/components/FileTypeBadge';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { ProjectReceiptCard } from '../../receipts/components/ProjectReceiptCard';

type Translate = ReturnType<typeof useTranslation>['t'];

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

  // ── Workspace Files State ──────────────────────────────────────────────────
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileDto[]>([]);
  const [workspaceFilesLoading, setWorkspaceFilesLoading] = useState(false);
  const [workspaceFilesError, setWorkspaceFilesError] = useState<string | null>(null);
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
  const chatFileInputRef = useRef<HTMLInputElement>(null);

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
    chatAttachments,
    handleSelectChatFiles,
    handleRemoveChatFile,
    reviewPromptContractId,
    clearReviewPrompt,
    refreshWorkspace,
    handleSendMessage,
    handleRequestMilestoneUnlock,
    handleWithdrawMilestone,
    handleUpdateWorkItem,
    handleRespondEarlyStart,
    handleEndProject,
    handleSubmitMilestoneDeliverable,
    handleSubmitProductHandoff,
    chatEndRef,
  } = useProjectWorkspace(contractId || '');

  const [workspaceStatusTab, setWorkspaceStatusTab] = useState<'active' | 'completed' | 'disputed' | 'all'>('active');

  useEffect(() => {
    const currentProj = workspaceProjects.find(p => p.id === activeProjectId);
    if (currentProj) {
      if (currentProj.status === ContractStatus.Completed) {
        setWorkspaceStatusTab('completed');
      } else if (currentProj.status === ContractStatus.Disputed) {
        setWorkspaceStatusTab('disputed');
      } else if (currentProj.status === ContractStatus.Cancelled) {
        setWorkspaceStatusTab('all');
      } else {
        setWorkspaceStatusTab('active');
      }
    }
  }, [activeProjectId, workspaceProjects]);

  const activeProjectsCount = useMemo(
    () => workspaceProjects.filter(p =>
      p.status !== ContractStatus.Completed &&
      p.status !== ContractStatus.Disputed &&
      p.status !== ContractStatus.Cancelled
    ).length,
    [workspaceProjects]
  );
  const completedProjectsCount = useMemo(
    () => workspaceProjects.filter(p => p.status === ContractStatus.Completed).length,
    [workspaceProjects]
  );
  const disputedProjectsCount = useMemo(
    () => workspaceProjects.filter(p => p.status === ContractStatus.Disputed).length,
    [workspaceProjects]
  );
  const allProjectsCount = useMemo(
    () => workspaceProjects.length,
    [workspaceProjects]
  );

  const filteredWorkspaceProjects = useMemo(() => {
    if (workspaceStatusTab === 'completed') {
      return workspaceProjects.filter(p => p.status === ContractStatus.Completed);
    }
    if (workspaceStatusTab === 'disputed') {
      return workspaceProjects.filter(p => p.status === ContractStatus.Disputed);
    }
    if (workspaceStatusTab === 'all') {
      return workspaceProjects;
    }
    return workspaceProjects.filter(p =>
      p.status !== ContractStatus.Completed &&
      p.status !== ContractStatus.Disputed &&
      p.status !== ContractStatus.Cancelled
    );
  }, [workspaceProjects, workspaceStatusTab]);

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
    project.milestones.every(milestone => milestone.status === 'submitted' || milestone.status === 'approved' || milestone.status === 'completed');
  const allMilestonesApproved = project.milestones.length > 0 &&
    project.milestones.every(milestone => milestone.status === 'approved' || milestone.status === 'completed');
  const showEndProjectButton = isClient &&
    activeContract?.status === ContractStatus.Active &&
    allMilestonesSubmittedOrApproved;
  const isContractDisputed = activeContract?.status === ContractStatus.Disputed;
  const isWorkspaceViewOnly = activeContract?.status === ContractStatus.Completed;
  const isWorkspaceLocked = isWorkspaceViewOnly || isContractDisputed;
  const showFreelancerPayoutCard = !isClient &&
    activeContract?.status === ContractStatus.Completed &&
    allMilestonesApproved;
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

  const openEndProjectDialog = () => {
    setEndProjectError(null);
    setEndProjectModalOpen(true);
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
    setIsEndingProject(true);
    setEndProjectError(null);
    const result = await handleEndProject();
    if (!result.success) {
      setEndProjectError(result.message || t('workspace.failedEndProjectError'));
      setIsEndingProject(false);
      return;
    }

    setIsEndingProject(false);
    setEndProjectModalOpen(false);
    window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    if (result.receiptQueued) {
      toast.success(t('receipts.queuedAfterCompletion'));
    } else {
      toast.warning(t('receipts.prepareWarning'));
    }
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
                  className={`font-bold text-[10px] px-4 py-2 rounded-full transition-all uppercase tracking-widest cursor-pointer border ${reportListOpen
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
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${mobileTab === 'list'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
              }`}
          >
            {t('workspace.conversations')}
          </button>
          <button
            onClick={() => setMobileTab('milestones')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${mobileTab === 'milestones'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
              }`}
          >
            {t('workspace.milestones')}
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${mobileTab === 'chat'
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
            className={`border-r border-border flex flex-col bg-card flex-shrink-0 transition-all duration-300 ${isLeftPanelCollapsed ? 'w-0 opacity-0 overflow-hidden border-none pointer-events-none' : 'w-96 lg:w-[390px]'
              } lg:flex ${mobileTab === 'list' ? 'flex-1 w-full' : 'hidden lg:flex'}`}
          >
            {/* Sidebar Title Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between min-h-[48px] shrink-0">
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

            {/* Document Folder Index Tabs (Styled exact match to MessagesScreen) */}
            <div className="pt-2.5 px-2 bg-muted/30 flex items-end gap-1 relative shrink-0">
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border pointer-events-none z-0" />

              {/* Active Tab */}
              <button
                type="button"
                onClick={() => setWorkspaceStatusTab('active')}
                className={`flex-1 relative flex flex-col items-center justify-center rounded-t-xl transition-all duration-150 cursor-pointer text-center select-none ${workspaceStatusTab === 'active'
                    ? 'bg-card font-black border-t-2 border-x border-b-0 border-border border-t-emerald-500 text-emerald-600 dark:text-emerald-400 -mb-[1px] z-20 pt-2 pb-2 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-t border-x border-transparent rounded-t-lg pt-1.5 pb-1.5 px-1 mb-0 z-10 font-bold'
                  }`}
                title={t('workspace.tabActive', { defaultValue: 'Đang làm' })}
              >
                <div className="flex items-center justify-center gap-1 w-full">
                  <CheckCircle size={13} className={workspaceStatusTab === 'active' ? '' : 'opacity-65'} />
                  {activeProjectsCount > 0 && (
                    <span className="min-w-[15px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-emerald-500 text-white rounded-full leading-none shrink-0">
                      {activeProjectsCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-1 truncate max-w-full font-extrabold uppercase">
                  {t('workspace.tabActive', { defaultValue: 'Đang làm' })}
                </span>
              </button>

              {/* Completed Tab */}
              <button
                type="button"
                onClick={() => setWorkspaceStatusTab('completed')}
                className={`flex-1 relative flex flex-col items-center justify-center rounded-t-xl transition-all duration-150 cursor-pointer text-center select-none ${workspaceStatusTab === 'completed'
                    ? 'bg-card font-black border-t-2 border-x border-b-0 border-border border-t-brand text-brand -mb-[1px] z-20 pt-2 pb-2 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-t border-x border-transparent rounded-t-lg pt-1.5 pb-1.5 px-1 mb-0 z-10 font-bold'
                  }`}
                title={t('workspace.tabCompleted', { defaultValue: 'Hoàn thành' })}
              >
                <div className="flex items-center justify-center gap-1 w-full">
                  <Award size={13} className={workspaceStatusTab === 'completed' ? '' : 'opacity-65'} />
                  {completedProjectsCount > 0 && (
                    <span className="min-w-[15px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-brand text-white rounded-full leading-none shrink-0">
                      {completedProjectsCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-1 truncate max-w-full font-extrabold uppercase">
                  {t('workspace.tabCompleted', { defaultValue: 'Hoàn thành' })}
                </span>
              </button>

              {/* Disputed Tab */}
              <button
                type="button"
                onClick={() => setWorkspaceStatusTab('disputed')}
                className={`flex-1 relative flex flex-col items-center justify-center rounded-t-xl transition-all duration-150 cursor-pointer text-center select-none ${workspaceStatusTab === 'disputed'
                    ? 'bg-card font-black border-t-2 border-x border-b-0 border-border border-t-amber-500 text-amber-600 dark:text-amber-400 -mb-[1px] z-20 pt-2 pb-2 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-t border-x border-transparent rounded-t-lg pt-1.5 pb-1.5 px-1 mb-0 z-10 font-bold'
                  }`}
                title={t('workspace.tabDisputed', { defaultValue: 'Tranh chấp' })}
              >
                <div className="flex items-center justify-center gap-1 w-full">
                  <ShieldAlert size={13} className={workspaceStatusTab === 'disputed' ? '' : 'opacity-65'} />
                  {disputedProjectsCount > 0 && (
                    <span className="min-w-[15px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-amber-500 text-white rounded-full leading-none shrink-0">
                      {disputedProjectsCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-1 truncate max-w-full font-extrabold uppercase">
                  {t('workspace.tabDisputed', { defaultValue: 'Tranh chấp' })}
                </span>
              </button>

              {/* All Tab */}
              <button
                type="button"
                onClick={() => setWorkspaceStatusTab('all')}
                className={`flex-1 relative flex flex-col items-center justify-center rounded-t-xl transition-all duration-150 cursor-pointer text-center select-none ${workspaceStatusTab === 'all'
                    ? 'bg-card font-black border-t-2 border-x border-b-0 border-border border-t-blue-500 text-blue-600 dark:text-blue-400 -mb-[1px] z-20 pt-2 pb-2 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-t border-x border-transparent rounded-t-lg pt-1.5 pb-1.5 px-1 mb-0 z-10 font-bold'
                  }`}
                title={t('workspace.tabAll', { defaultValue: 'Tất cả' })}
              >
                <div className="flex items-center justify-center gap-1 w-full">
                  <Layers size={13} className={workspaceStatusTab === 'all' ? '' : 'opacity-65'} />
                  {allProjectsCount > 0 && (
                    <span className="min-w-[15px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-blue-500 text-white rounded-full leading-none shrink-0">
                      {allProjectsCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-1 truncate max-w-full font-extrabold uppercase">
                  {t('workspace.tabAll', { defaultValue: 'Tất cả' })}
                </span>
              </button>
            </div>

            {/* List Body Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-card relative z-10">
              {filteredWorkspaceProjects.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-muted-foreground space-y-2">
                  <p>{t('workspace.noProjectsInTab', { defaultValue: 'Không có dự án nào thuộc nhóm này.' })}</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredWorkspaceProjects.map((proj: typeof workspaceProjects[number]) => {
                    const isActive = proj.id === activeProjectId;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          navigate(`/workspace/${proj.id}`);
                        }}
                        className={`relative rounded-xl p-3 border transition-all duration-150 cursor-pointer select-none mb-1.5 ${
                          isActive
                            ? 'bg-card border border-[var(--brand)]/80 shadow-2xs'
                            : proj.unread
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-4 border-l-emerald-500 border-y-emerald-500/20 border-r-emerald-500/20 hover:bg-emerald-500/15'
                              : 'bg-card/40 hover:bg-muted/50 border-transparent hover:border-border/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* UserAvatar Component directly */}
                          <div className="shrink-0 mt-0.5">
                            <UserAvatar
                              name={proj.partnerName}
                              src={proj.partnerAvatar}
                              userId={proj.partnerUserId}
                              size="md"
                            />
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Top Row: Name + Unread Dot + Timestamp */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-xs md:text-sm truncate leading-tight ${
                                  proj.unread
                                    ? 'font-black text-foreground'
                                    : isActive
                                      ? 'font-extrabold text-[var(--brand)]'
                                      : 'font-bold text-foreground/90'
                                }`}>
                                  {proj.partnerName}
                                </span>
                                {proj.unread && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Tin nhắn mới" />
                                )}
                              </div>

                              <span className={`text-[10px] shrink-0 font-semibold ${
                                proj.unread
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : isActive
                                    ? 'text-[var(--brand)] font-bold'
                                    : 'text-muted-foreground'
                              }`}>
                                {proj.time}
                              </span>
                            </div>

                            {/* Job Title Tag Pill */}
                            {proj.title && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/80 border border-border/50 text-muted-foreground text-[10px] font-medium max-w-full truncate">
                                <Briefcase size={10} className="shrink-0 text-muted-foreground/80" />
                                <span className="truncate">{proj.title}</span>
                              </div>
                            )}

                            {/* Message Snippet & Status Badge */}
                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <p className={`text-xs truncate leading-snug flex-1 ${
                                proj.unread
                                  ? 'font-black text-foreground'
                                  : isActive
                                    ? 'font-bold text-foreground'
                                    : 'font-medium text-muted-foreground'
                              }`}>
                                {proj.latestMessage}
                              </p>

                              {/* Solid Full Dark Background Status Badges */}
                              {proj.status === ContractStatus.Disputed ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                                  <LockKeyhole size={9} /> {t('workspace.disputedBadge', { defaultValue: 'Tranh chấp' })}
                                </span>
                              ) : proj.status === ContractStatus.Cancelled ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                                  <LockKeyhole size={9} /> {t('workspace.disputeClosedBadge', { defaultValue: 'Đã đóng' })}
                                </span>
                              ) : proj.status === ContractStatus.Completed ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                                  <Award size={9} /> {t('workspace.completedBadge', { defaultValue: 'Hoàn thành' })}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black shrink-0 shadow-2xs">
                                  <CheckCircle size={9} /> {t('workspace.activeBadge', { defaultValue: 'Đang làm' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Column 2: Milestone Management (Center Pane - Flex-1 fill) */}
          <section
            className={`flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm min-w-0 transition-all duration-300 ${mobileTab === 'milestones' ? 'flex' : 'hidden lg:flex'
              }`}
          >

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

                {!showInfo && (
                  <button
                    type="button"
                    onClick={() => setShowInfo(true)}
                    className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer hidden lg:flex items-center justify-center shrink-0 shadow-2xs"
                    title={t('workspace.toggleChatInfo', { defaultValue: 'Mở bảng Trò chuyện & Thông tin' })}
                  >
                    <PanelRightOpen size={16} />
                  </button>
                )}
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

            {activeContract?.status === ContractStatus.Completed && activeProjectId && (
              <ProjectReceiptCard contractId={activeProjectId} />
            )}

            {/* Milestones timeline/list */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
              {project.milestones.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
                  <p className="text-sm font-bold">{t('workspace.noMilestones')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {project.milestones.map((milestone, idx) => {
                    const isCompleted = milestone.status === 'approved' || milestone.status === 'completed';
                    const isInProgress = milestone.status === 'in_progress';
                    const isSubmitted = milestone.status === 'submitted';
                    const isPending = milestone.status === 'pending';
                    const isLast = idx === project.milestones.length - 1;
                    const previousMilestone = idx > 0 ? project.milestones[idx - 1] : null;
                    const isPreviousMilestoneStarted = idx === 0 || (previousMilestone && previousMilestone.status !== 'pending');
                    const isConsecutiveEarlyStart = isPending && isPreviousMilestoneStarted;
                    const canUnlockOrStartMilestone = isInProgress || isConsecutiveEarlyStart;

                    const isLineFilled = isCompleted || isInProgress || isSubmitted;

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
                      <div key={milestone.id || idx} className="flex items-stretch gap-4 sm:gap-6 group">
                        {/* Left Timeline Column (Circles + Centered Line Segment) */}
                        <div className="flex flex-col items-center shrink-0 w-8 sm:w-10 relative">
                          {/* Timeline Circle Node */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 z-10 shrink-0 ${isCompleted || isInProgress || isSubmitted
                                ? 'bg-brand text-brand-foreground shadow-md ring-4 ring-brand/20'
                                : isConsecutiveEarlyStart
                                  ? 'bg-surface-card border-2 border-brand text-brand ring-4 ring-brand/10'
                                  : 'bg-surface-card border-2 border-border text-text-muted ring-4 ring-background'
                              }`}
                          >
                            {isCompleted ? (
                              <CheckCircle size={16} />
                            ) : isInProgress || isSubmitted ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-brand-foreground animate-ping" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>

                          {/* Vertical Connecting Line to Next Node */}
                          {!isLast && (
                            <div
                              className={`w-0 flex-1 my-1 transition-colors duration-500 bg-transparent ${isLineFilled ? 'border-l-2 border-brand' : 'border-l-2 border-border'
                                }`}
                            />
                          )}
                        </div>

                        {/* Right Milestone Card Body */}
                        <div className="flex-1">
                          <div
                            className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 shadow-xs hover:shadow-md ${isCompleted
                                ? 'bg-background/90 border-border/80'
                                : isInProgress || isSubmitted
                                  ? 'bg-background border-brand/40 ring-1 ring-brand/20 shadow-md'
                                  : isConsecutiveEarlyStart
                                    ? 'bg-background border-brand/30'
                                    : 'bg-surface-muted/30 border-border/60 opacity-85'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${isCompleted || isInProgress || isSubmitted
                                    ? 'bg-brand/10 text-brand border border-brand/20'
                                    : 'bg-surface-muted border border-border text-text-muted'
                                  }`}>
                                  M{idx + 1}
                                </span>

                                <div className="space-y-1">
                                  <h3 className="text-sm font-black text-text-primary tracking-tight leading-snug">{milestone.title}</h3>
                                  <p className="text-xs font-medium text-text-muted leading-relaxed">{milestone.description || t('workspace.noDescription')}</p>

                                  {/* Amounts & Timeline Bar */}
                                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-semibold text-text-muted">
                                    <span className="flex items-center gap-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">{t('workspace.amount')}:</span>
                                      <GigCoinAmount amount={milestone.amount} />
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">{t('workspace.released')}:</span>
                                      <GigCoinAmount amount={milestone.releasedAmount} />
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">{t('workspace.dueDate')}:</span>
                                      <span className="font-bold text-text-primary">{milestone.dueDate}</span>
                                    </span>
                                    {milestone.completedAt && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">{t('workspace.completed')}:</span>
                                          <span className="font-bold text-brand">{new Date(milestone.completedAt).toLocaleDateString()}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border shrink-0 ${isCompleted || isInProgress
                                  ? 'bg-brand/10 border-brand/30 text-brand'
                                  : isSubmitted
                                    ? 'bg-brand/10 border-brand/30 text-brand animate-pulse'
                                    : 'bg-surface-muted border-border text-text-muted'
                                }`}>
                                {milestone.status}
                              </span>
                            </div>

                            {/* Work Breakdown Structure */}
                            <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Work Breakdown Structure</h4>
                              {workItems.map((workItem, workIndex) => {
                                const status = Number(workItem.status);
                                const canStartWork = !isWorkspaceLocked && !isClient && canUnlockOrStartMilestone && (status === ContractWorkItemStatus.Todo || status === ContractWorkItemStatus.RevisionRequired);
                                const canCompleteWork = !isWorkspaceLocked && !isClient && canUnlockOrStartMilestone && status === ContractWorkItemStatus.InProgress;
                                return (
                                  <div key={workItem.workItemId} className="rounded-xl border border-border/70 bg-surface-card p-3 space-y-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <strong className="text-xs font-bold text-text-primary">{workIndex + 1}. {workItem.title}</strong>
                                        {workItem.description && <p className="mt-0.5 text-[11px] font-medium text-text-muted">{workItem.description}</p>}
                                      </div>
                                      <span className="rounded-md bg-surface-muted border border-border px-2 py-0.5 text-[10px] font-extrabold text-text-muted">
                                        {ContractWorkItemStatus[status] || status}
                                      </span>
                                    </div>
                                    {workItem.progressNote && <p className="text-[11px] font-medium text-text-primary"><strong>Progress:</strong> {workItem.progressNote}</p>}
                                    {(canStartWork || canCompleteWork) && (
                                      <button
                                        type="button"
                                        onClick={() => handleWorkItemTransition(milestone.id, workItem.workItemId, canCompleteWork ? ContractWorkItemStatus.Completed : ContractWorkItemStatus.InProgress)}
                                        disabled={isMilestoneActionPending}
                                        className="rounded-lg border border-border bg-background hover:bg-surface-hover px-3 py-1.5 text-[10px] font-black text-text-primary cursor-pointer transition disabled:opacity-50"
                                      >
                                        {canCompleteWork ? 'Mark completed' : status === ContractWorkItemStatus.RevisionRequired ? 'Start revision' : 'Start work item'}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {(isInProgress || isSubmitted || canFreelancerRequestUnlock || showFreelancerWithdraw || showEarlyWithdrawalCap || (!isClient && isCompleted && isReleasedInFull)) && (
                              <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex-1 max-w-xs">
                                  {showFreelancerWithdraw ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                      {t('earlyWithdrawal.availableBeforeEnd')} <GigCoinAmount amount={withdrawalEligibility.availableAmount} />
                                    </span>
                                  ) : !isClient && isCompleted && isReleasedInFull ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                                      {t('workspace.releasedInFull')}
                                    </span>
                                  ) : showEarlyWithdrawalCap ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                                      {t('earlyWithdrawal.maximumReached')}
                                    </span>
                                  ) : (isInProgress || isSubmitted) ? (
                                    <>
                                      <div className="flex justify-between text-[10px] mb-1 font-bold">
                                        <span className="text-text-muted">{t('workspace.progress')}</span>
                                        <span className="text-brand">{isSubmitted ? '90%' : '65%'}</span>
                                      </div>
                                      <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                                        <div className={`bg-brand h-full rounded-full transition-all duration-500 ${isSubmitted ? 'w-[90%]' : 'w-[65%]'}`} />
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                      {t('workspace.waitingClientUnlock')}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  {canClientReview ? (
                                    <button
                                      onClick={() => navigate(`/contracts/${workspaceContractId}/milestones/${milestone.id}/approve`)}
                                      className="bg-brand hover:bg-brand-hover text-brand-foreground px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md cursor-pointer"
                                    >
                                      {t('workspace.reviewMilestone')}
                                    </button>
                                  ) : canFreelancerSubmit ? (
                                    <button
                                      onClick={() => openSubmitModal(milestone)}
                                      className="bg-brand hover:bg-brand-hover text-brand-foreground px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md cursor-pointer"
                                    >
                                      {t('workspace.submitDeliverable')}
                                    </button>
                                  ) : canFreelancerRequestUnlock ? (
                                    <button
                                      onClick={() => handleRequestPendingMilestoneUnlock(milestone.id)}
                                      disabled={isMilestoneActionPending}
                                      className="bg-surface-card hover:bg-surface-hover disabled:opacity-60 text-text-primary border border-border px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
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
                                      className="bg-brand hover:bg-brand-hover disabled:bg-surface-muted disabled:text-text-muted disabled:cursor-not-allowed text-brand-foreground px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md cursor-pointer"
                                    >
                                      {isMilestoneActionPending ? t('earlyWithdrawal.submitting') : t('earlyWithdrawal.action')}
                                    </button>
                                  ) : !isClient && isCompleted && isReleasedInFull ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                                      {t('workspace.releasedInFull')}
                                    </span>
                                  ) : showEarlyWithdrawalCap ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                                      {t('earlyWithdrawal.maximumReached')}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                      {isSubmitted ? t('workspace.waitingClientReview') : t('workspace.waitingFreelancer')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {milestoneActionError?.milestoneId === milestone.id && (
                              <div className="mt-3 text-[11px] font-bold text-destructive">
                                {milestoneActionError.message}
                              </div>
                            )}

                            {showFreelancerWithdraw && !withdrawalEligibility.meetsApprovalThreshold && (
                              <div className="mt-3 text-[11px] font-bold text-text-muted">
                                {t('earlyWithdrawal.thresholdWarning', {
                                  approved: withdrawalEligibility.approvedMilestones,
                                  required: withdrawalEligibility.requiredApprovedMilestones,
                                })}
                              </div>
                            )}

                            {!isClient && isInProgress && !allWorkItemsCompleted && (
                              <p className="mt-3 text-[11px] font-bold text-text-muted">
                                Complete every work item before submitting this milestone.
                              </p>
                            )}

                            {!isWorkspaceLocked && isClient && earlyStartRequest && (
                              <div className="mt-3 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs">
                                <strong className="text-text-primary">{t('workspace.earlyStartRequested', 'Early start requested')}</strong>
                                <p className="mt-1 text-text-muted">{earlyStartRequest.reason}</p>
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
                                    className="rounded-lg bg-brand hover:bg-brand-hover text-brand-foreground px-3 py-1.5 font-black text-xs cursor-pointer transition"
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
                                    className="rounded-lg border border-destructive/40 px-3 py-1.5 font-black text-destructive cursor-pointer hover:bg-destructive/10 transition"
                                  >
                                    {t('common.reject', 'Reject')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Column 3: Interaction Pane (Right Pane - tabs: Chat, Files - 25-30% ratio) */}
          <aside
            className={`flex flex-col bg-card overflow-hidden transition-all duration-300 flex-shrink-0 ${showInfo
                ? 'w-80 lg:w-[32%] xl:w-[28%] 2xl:w-[24%] max-w-[420px] min-w-[300px] opacity-100 border-l border-border'
                : 'w-0 min-w-0 max-w-0 opacity-0 pointer-events-none border-none p-0 m-0'
              } ${mobileTab === 'chat' ? 'flex flex-1 w-full' : 'hidden lg:flex'}`}
          >
            {/* 2 Tabs at the top with Collapse icon on top-left */}
            <div className="flex items-center border-b border-border bg-card">
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="p-3.5 border-r border-border hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0 hidden lg:flex items-center justify-center"
                title={t('workspace.toggleChatInfo', { defaultValue: 'Thu gọn bảng Trò chuyện & Thông tin' })}
              >
                <PanelRightClose size={16} />
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'chat'
                    ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-black'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <MessageSquare size={14} />
                <span>{t('nav.messages')}</span>
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'files'
                    ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-black'
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
                                className={`text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-all cursor-pointer ${isFavorited ? 'bg-[var(--gb-cyan)] text-white' : 'bg-secondary text-foreground hover:bg-muted'
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
                                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${isBlocked ? 'border-green-500/30 text-green-500 hover:bg-green-500/5' : 'border-red-500/30 text-red-500 hover:bg-red-500/5'
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
                              className={`w-full max-w-md rounded-xl border bg-card p-4 shadow-sm transition-all ${isSelected
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
                          <ChatSystemBanner
                            key={msg.id || index}
                            content={msg.content}
                            contractId={contractId}
                            onNavigateContract={id => navigate(`/contracts/${id}`)}
                          />
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
                              <div className="flex flex-col gap-1.5 max-w-[280px]">
                                {msg.content && (
                                  <p className="text-xs text-foreground">{msg.content}</p>
                                )}
                                {(msg.attachments && msg.attachments.length > 0
                                  ? msg.attachments
                                  : msg.fileUrl || msg.fileName
                                    ? [{ messageAttachmentId: msg.id, fileName: msg.fileName ?? '', fileUrl: msg.fileUrl ?? '', mimeType: '', fileSizeBytes: 0, createdAt: msg.createdAt ?? '' }]
                                    : []
                                ).map(attachment => (
                                  <FileTypeBadge
                                    key={attachment.messageAttachmentId}
                                    fileName={attachment.fileName}
                                    fileUrl={attachment.fileUrl || null}
                                    fileSize={attachment.fileSizeBytes}
                                  />
                                ))}
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
                      <input
                        ref={chatFileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleSelectChatFiles(e.target.files);
                          }
                          e.target.value = '';
                        }}
                      />
                      {chatAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {chatAttachments.map((file, index) => (
                            <span
                              key={`${file.name}-${index}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted border border-border text-[10px] font-semibold text-foreground max-w-[180px]"
                            >
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveChatFile(index)}
                                className="text-muted-foreground hover:text-rose-500 cursor-pointer flex-shrink-0"
                                title={t('common.remove', { defaultValue: 'Remove' })}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
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
                              onClick={() => chatFileInputRef.current?.click()}
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
                <WorkspaceFilesPanel
                  contractId={contractId ?? ''}
                  files={workspaceFiles}
                  isLoading={workspaceFilesLoading}
                  error={workspaceFilesError}
                  onLoad={async () => {
                    if (!contractId) return;
                    setWorkspaceFilesLoading(true);
                    setWorkspaceFilesError(null);
                    try {
                      const res = await contractGetAPI.getWorkspaceFiles(contractId);
                      if (res.success && res.data) setWorkspaceFiles(res.data);
                      else setWorkspaceFilesError(res.message ?? 'Unable to load files');
                    } catch {
                      setWorkspaceFilesError('Unable to load files');
                    } finally {
                      setWorkspaceFilesLoading(false);
                    }
                  }}
                />
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

      <AlertDialog open={endProjectModalOpen} onOpenChange={(nextOpen) => !nextOpen && closeEndProjectDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workspace.endProjectModalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workspace.endProjectModalDesc')} {t('workspace.endProjectActionNotice')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {endProjectError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} />
              <span>{endProjectError}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEndingProject} onClick={closeEndProjectDialog}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-w-24 border border-transparent"
              style={{ backgroundColor: 'var(--brand, #494be7)', color: 'var(--brand-foreground, #ffffff)' }}
              disabled={isEndingProject}
              onClick={(event) => { event.preventDefault(); void handleConfirmEndProject(); }}
            >
              {isEndingProject ? (
                <span className="flex items-center gap-2" style={{ color: 'var(--brand-foreground, #ffffff)' }}>
                  <Loader2 size={15} className="animate-spin" />{t('workspace.ending')}
                </span>
              ) : (
                <span style={{ color: 'var(--brand-foreground, #ffffff)' }}>{t('workspace.endProject')}</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectReviewDialog
        open={reviewDialogOpen}
        contract={activeContract}
        role={reviewRole}
        onClose={closeReviewDialog}
        onSubmitted={handleReviewSubmitted}
      />

      {submitModal && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" role="presentation">
          <div className="bg-background border border-border/80 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="workspace-submit-title">
            {/* Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 id="workspace-submit-title" className="text-base font-black text-text-primary tracking-tight">
                    {t('workspace.submitDeliverableModalTitle')}
                  </h3>
                  <p className="text-xs font-bold text-brand mt-0.5">{submitModal.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetSubmitModal}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-muted transition cursor-pointer"
                title={t('common.close')}
                disabled={isSubmittingDeliverable}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDeliverable} className="p-6 space-y-5">
              {submitError && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Upload Dropzone / File Picker */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-text-muted block">
                  {t('workspace.fileSourceOption')} <span className="text-destructive">*</span>
                </label>
                <input
                  ref={submitFileInputRef}
                  id="workspace-deliverable-file"
                  type="file"
                  onChange={handleSelectSubmitFile}
                  disabled={isSubmittingDeliverable}
                  className="hidden"
                />

                {!submitFile ? (
                  <div
                    onClick={() => submitFileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/80 hover:border-brand/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-surface-card/40 hover:bg-surface-card transition text-center group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-110 transition-transform mb-3">
                      <Upload size={22} />
                    </div>
                    <p className="text-xs font-black text-text-primary">Click hoặc kéo thả file sản phẩm vào đây</p>
                    <p className="text-[10px] font-bold text-text-muted mt-1">Hỗ trợ các định dạng PDF, ZIP, RAR, PNG, MP4... (Tối đa 100MB)</p>
                  </div>
                ) : (
                  <div className="border border-brand/40 bg-brand/5 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-text-primary truncate">{submitFile.name}</p>
                        <p className="text-[10px] font-bold text-text-muted mt-0.5">{(submitFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitFile(null);
                        if (submitFileInputRef.current) submitFileInputRef.current.value = '';
                      }}
                      className="p-2 rounded-xl text-text-muted hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                      title="Xóa file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="workspace-deliverable-description" className="text-xs font-black uppercase tracking-wider text-text-muted">
                    {t('workspace.descriptionField')}
                  </label>
                  <span className="text-[10px] font-bold text-text-muted">{(submitDescription ?? '').length}/5000</span>
                </div>
                <textarea
                  id="workspace-deliverable-description"
                  value={submitDescription ?? ''}
                  onChange={(event) => setSubmitDescription(event.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder={t('workspace.addNotesPlaceholder')}
                  disabled={isSubmittingDeliverable}
                  className="w-full bg-surface-card border border-border/80 focus:border-brand rounded-2xl p-3.5 text-xs font-medium text-text-primary focus:outline-none transition resize-none placeholder:text-text-muted/60"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={resetSubmitModal}
                  disabled={isSubmittingDeliverable}
                  className="px-5 py-2.5 rounded-xl border border-border bg-surface-card hover:bg-surface-muted text-text-primary text-xs font-black transition cursor-pointer disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeliverable || !submitFile}
                  className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground text-xs font-black flex items-center gap-2 transition shadow-md cursor-pointer"
                >
                  {isSubmittingDeliverable ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
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
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" role="presentation">
          <div className="bg-background border border-border/80 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="workspace-product-title">
            {/* Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3 id="workspace-product-title" className="text-base font-black text-text-primary tracking-tight">
                    {t('workspace.sendMaterialsModalTitle')}
                  </h3>
                  <p className="text-xs font-medium text-text-muted mt-0.5">{t('workspace.sendMaterialsModalDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetProductModal}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-muted transition cursor-pointer"
                title={t('common.close')}
                disabled={isSendingProduct}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendProductMaterials} className="p-6 space-y-5">
              {productError && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{productError}</span>
                </div>
              )}

              {/* Source Mode Tabs */}
              <div className="p-1 rounded-2xl bg-surface-muted border border-border/60 grid grid-cols-2 gap-1" role="tablist">
                <button
                  type="button"
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${productMode === 'file'
                      ? 'bg-background text-brand shadow-sm border border-border/60'
                      : 'text-text-muted hover:text-text-primary'
                    }`}
                  onClick={() => {
                    setProductMode('file');
                    setProductLink('');
                    setProductError(null);
                  }}
                >
                  <Upload size={14} />
                  {t('workspace.fileSourceOption')}
                </button>
                <button
                  type="button"
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${productMode === 'link'
                      ? 'bg-background text-brand shadow-sm border border-border/60'
                      : 'text-text-muted hover:text-text-primary'
                    }`}
                  onClick={() => {
                    setProductMode('link');
                    setProductFile(null);
                    setProductError(null);
                    if (productFileInputRef.current) {
                      productFileInputRef.current.value = '';
                    }
                  }}
                >
                  <Link2 size={14} />
                  {t('workspace.linkSourceOption')}
                </button>
              </div>

              {productMode === 'file' ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted block">
                    {t('workspace.workMaterialFileField')} <span className="text-destructive">*</span>
                  </label>
                  <input
                    ref={productFileInputRef}
                    id="workspace-product-file"
                    type="file"
                    onChange={handleSelectProductFile}
                    disabled={isSendingProduct}
                    className="hidden"
                  />
                  {!productFile ? (
                    <div
                      onClick={() => productFileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/80 hover:border-brand/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-surface-card/40 hover:bg-surface-card transition text-center group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-110 transition-transform mb-3">
                        <Upload size={22} />
                      </div>
                      <p className="text-xs font-black text-text-primary">Click hoặc kéo thả file vật tư vào đây</p>
                    </div>
                  ) : (
                    <div className="border border-brand/40 bg-brand/5 rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-text-primary truncate">{productFile.name}</p>
                          <p className="text-[10px] font-bold text-text-muted mt-0.5">{(productFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProductFile(null);
                          if (productFileInputRef.current) productFileInputRef.current.value = '';
                        }}
                        className="p-2 rounded-xl text-text-muted hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        title="Xóa file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="workspace-product-link" className="text-xs font-black uppercase tracking-wider text-text-muted block">
                    {t('workspace.workMaterialLinkField')} <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="workspace-product-link"
                    type="url"
                    value={productLink ?? ''}
                    onChange={(event) => setProductLink(event.target.value)}
                    placeholder="https://..."
                    disabled={isSendingProduct}
                    className="w-full bg-surface-card border border-border/80 focus:border-brand rounded-2xl p-3.5 text-xs font-medium text-text-primary focus:outline-none transition"
                  />
                </div>
              )}

              {/* Note Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="workspace-product-note" className="text-xs font-black uppercase tracking-wider text-text-muted">
                    {t('workspace.noteField')}
                  </label>
                  <span className="text-[10px] font-bold text-text-muted">{(productNote ?? '').length}/2000</span>
                </div>
                <textarea
                  id="workspace-product-note"
                  value={productNote ?? ''}
                  onChange={(event) => setProductNote(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder={t('workspace.describeMaterialsPlaceholder')}
                  disabled={isSendingProduct}
                  className="w-full bg-surface-card border border-border/80 focus:border-brand rounded-2xl p-3.5 text-xs font-medium text-text-primary focus:outline-none transition resize-none placeholder:text-text-muted/60"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={resetProductModal}
                  disabled={isSendingProduct}
                  className="px-5 py-2.5 rounded-xl border border-border bg-surface-card hover:bg-surface-muted text-text-primary text-xs font-black transition cursor-pointer disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSendingProduct ||
                    (productMode === 'file' && !productFile) ||
                    (productMode === 'link' && !productLink.trim())
                  }
                  className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground text-xs font-black flex items-center gap-2 transition shadow-md cursor-pointer"
                >
                  {isSendingProduct ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
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

      <CombinedIssueReportsModal
        isOpen={reportListOpen || Boolean(viewReportId)}
        onClose={() => {
          handleCloseReportList();
          handleCloseReportDetail();
        }}
        reports={contractReports}
        isLoadingReports={isLoadingReports}
        reportError={reportError}
        currentUserId={user?.id ?? ''}
        contractTitle={activeContract?.title || project.title}
        workspaceContractId={workspaceContractId}
        selectedReportId={viewReportId}
        selectedReportDetail={selectedReport}
        isLoadingDetail={isLoadingReportDetail}
        onSelectReport={handleViewContractReport}
        onRespond={handleRespondToContractReport}
        onConfirm={handleConfirmContractReport}
        onEscalate={handleEscalateContractReport}
        onDisputeCreated={(disputeId) => navigate(`/contracts/${workspaceContractId}/disputes/${disputeId}`)}
        isResponding={isRespondingReport}
        isConfirming={isConfirmingReport}
        isEscalating={isEscalatingReport}
      />

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

// ─── WorkspaceFilesPanel ──────────────────────────────────────────────────────

interface WorkspaceFilesPanelProps {
  contractId: string;
  files: WorkspaceFileDto[];
  isLoading: boolean;
  error: string | null;
  onLoad: () => Promise<void>;
}

function WorkspaceFilesPanel({ files, isLoading, error, onLoad }: WorkspaceFilesPanelProps) {
  // Auto-fetch when panel first mounts
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      void onLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group by context / milestone — `files` is already normalized (contractAPI/GET.tsx).
  const grouped = files.reduce<Record<string, WorkspaceFileDto[]>>((acc, f) => {
    const group = f.milestoneTitle
      ? `Milestone: ${f.milestoneTitle}`
      : f.context
        ? f.context.charAt(0).toUpperCase() + f.context.slice(1)
        : 'Chung';
    if (!acc[group]) acc[group] = [];
    acc[group].push(f);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <FolderOpen size={14} />
          Shared Files
        </h4>
        <button
          type="button"
          onClick={() => void onLoad()}
          disabled={isLoading}
          className="p-1.5 rounded-lg border border-border bg-background text-text-muted hover:text-text-primary hover:border-brand/30 transition cursor-pointer disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && !files.length && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-surface-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen size={36} className="text-text-muted/30 mb-3" />
          <p className="text-xs font-extrabold text-text-muted">Chưa có file nào được chia sẻ</p>
          <p className="text-[10px] text-text-muted/60 mt-1">Các file trao đổi trong workspace sẽ xuất hiện ở đây</p>
        </div>
      )}

      {/* Files grouped */}
      {!isLoading && Object.keys(grouped).length > 0 && (
        <div className="space-y-5">
          {Object.entries(grouped).map(([groupName, groupFiles]) => (
            <div key={groupName} className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">{groupName}</p>
              <div className="space-y-2">
                {groupFiles.map(f => (
                  <FileTypeBadge
                    key={f.id}
                    fileName={f.fileName}
                    fileUrl={f.fileUrl}
                    isExternalLink={f.isExternalLink}
                    fileSize={f.fileSize}
                    uploadedAt={f.uploadedAt}
                    uploaderName={f.uploaderName}
                    note={f.note}
                    version={f.version}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
