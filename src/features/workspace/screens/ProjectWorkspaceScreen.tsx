import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  FileText, CreditCard,
  Upload, Link2, X, AlertCircle, Loader2,
  FolderOpen
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { ContractStatus, ContractWorkItemStatus, type WorkspaceFileDto } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import type { EscalateReportToDisputeInput } from '../../../types/models/Dispute';
import '../styles/project-workspace-screen.css';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { EarlyWithdrawalDialog } from '../../../shared/components/EarlyWithdrawalDialog';
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
import { ProjectReviewDialog } from '../../reviews/components/ProjectReviewDialog';
import '../../reviews/styles/reviews-screen.css';
import { WorkspaceHeaderBar } from '../components/WorkspaceHeaderBar';
import { WorkspaceListBar } from '../components/WorkspaceListBar';
import { ManageMilestone } from '../components/ManageMilestone';
import { ChatAndInfoPanel } from '../components/ChatAndInfoPanel';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';

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
    isWorkspaceLoading,
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
      <div className="project-workspace-page flex flex-col h-[calc(100vh-4.25rem)] p-3 sm:p-3.5 gap-3 text-foreground overflow-hidden">
        {/* Top Header Bar Component */}
        <WorkspaceHeaderBar
          titleLong={currentProjData.titleLong}
          jobId={project.jobId}
          isClient={isClient}
          activeContractStatus={activeContract?.status}
          workspaceContractId={workspaceContractId}
          unreadReportCount={contractReports.filter((r) => r.status === 0).length}
          onNavigateBack={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/contracts');
            }
          }}
          onNavigateJobDetail={() => navigate(isClient ? `/jobs/my-jobs/${project.jobId}` : `/jobs/${project.jobId}`)}
          onRaiseIssue={() => setRaiseIssueModalOpen(true)}
          onOpenReportList={handleToggleReportList}
          onNavigateContract={() => navigate(`/contracts/${project.contractId || contractId || ''}`)}
        />

        {activeContract?.status === ContractStatus.PendingEscrow && (
          <div className="px-6 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 shrink-0">
            <CreditCard size={14} />
            <span>{t('workspace.escrowPending')}</span>
          </div>
        )}

        {/* Mobile Navigation Tabs (visible only on mobile/tablet) */}
        <div className="flex lg:hidden rounded-xl border border-border bg-card overflow-hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'list'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t('workspace.conversations', { defaultValue: 'Hội thoại' })}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('milestones')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'milestones'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t('workspace.milestones', { defaultValue: 'Cột mốc' })}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'chat'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t('workspace.chatFiles', { defaultValue: 'Chat & File' })}
          </button>
        </div>

        {/* 3-Column Workspace Main Layout */}
        <div className="flex flex-1 overflow-hidden gap-3 min-h-0">
          {/* Component 1: WorkspaceListBar (Left Sidebar) */}
          <WorkspaceListBar
            isLeftPanelCollapsed={isLeftPanelCollapsed}
            toggleLeftPanel={toggleLeftPanel}
            workspaceStatusTab={workspaceStatusTab}
            setWorkspaceStatusTab={setWorkspaceStatusTab}
            activeProjectsCount={activeProjectsCount}
            completedProjectsCount={completedProjectsCount}
            disputedProjectsCount={disputedProjectsCount}
            allProjectsCount={allProjectsCount}
            filteredWorkspaceProjects={filteredWorkspaceProjects}
            activeProjectId={activeProjectId}
            mobileTab={mobileTab}
            onSelectProject={(id) => {
              setActiveProjectId(id);
              navigate(`/workspace/${id}`);
            }}
          />

          {isWorkspaceLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-card border border-[var(--brand)]/30 rounded-2xl shadow-sm min-w-0 p-8 text-center relative overflow-hidden">
              <LemniscateBloomLoader
                label={t('workspace.loadingWorkspaceData', { defaultValue: 'Đang tải dữ liệu không gian làm việc...' })}
                size={56}
              />
            </div>
          ) : (
            <>
              {/* Component 2: ManageMilestone (Center Pane) */}
              <ManageMilestone
                project={project as any}
                activeContract={activeContract}
                activeProjectId={activeProjectId}
                isClient={isClient}
                isFreelancer={isFreelancer}
                isLeftPanelCollapsed={isLeftPanelCollapsed}
                toggleLeftPanel={toggleLeftPanel}
                showInfo={showInfo}
                setShowInfo={setShowInfo}
                mobileTab={mobileTab}
                showEndProjectButton={showEndProjectButton}
                allMilestonesApproved={allMilestonesApproved}
                openEndProjectDialog={openEndProjectDialog}
                setReviewDialogOpen={setReviewDialogOpen}
                showFreelancerPayoutCard={showFreelancerPayoutCard}
                earlyStartRequests={earlyStartRequests}
                milestoneActionPendingId={milestoneActionPendingId}
                milestoneActionError={milestoneActionError}
                handleWorkItemTransition={handleWorkItemTransition}
                handleRequestPendingMilestoneUnlock={handleRequestPendingMilestoneUnlock}
                openWithdrawDialog={openWithdrawDialog}
                handleRespondEarlyStart={handleRespondEarlyStart}
                openPromptModal={openPromptModal}
                setSubmitModal={setSubmitModal}
                setMilestoneActionPendingId={setMilestoneActionPendingId}
                isWorkspaceLocked={isWorkspaceLocked}
                navigate={navigate}
              />

              {/* Component 3: ChatAndInfoPanel (Right Pane) */}
              <ChatAndInfoPanel
                showInfo={showInfo}
                setShowInfo={setShowInfo}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                mobileTab={mobileTab}
                partnerName={partnerName}
                partnerAvatar={partnerAvatar}
                partnerUserId={partnerUserId}
                partnerTitle={partnerTitle}
                partnerCompany={partnerCompany}
                isPartnerOnline={isPartnerOnline}
                showProfilePopover={showProfilePopover}
                setShowProfilePopover={setShowProfilePopover}
                profilePopoverTimeout={profilePopoverTimeout}
                isFavorited={isFavorited}
                setIsFavorited={setIsFavorited}
                isBlocked={isBlocked}
                setIsBlocked={setIsBlocked}
                projectMessages={projectMessages}
                chatAttachments={chatAttachments}
                chatFileInputRef={chatFileInputRef}
                chatEndRef={chatEndRef}
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                handleSelectChatFiles={handleSelectChatFiles}
                handleRemoveChatFile={handleRemoveChatFile}
                handleSendMessage={handleSendMessage}
                isWorkspaceLocked={isWorkspaceLocked}
                isContractDisputed={isContractDisputed}
                activeDisputeId={activeDisputeId}
                workspaceContractId={workspaceContractId}
                contractId={contractId}
                isClient={isClient}
                activeContract={activeContract}
                setProductModalOpen={setProductModalOpen}
                viewReportId={viewReportId}
                unavailableReportId={unavailableReportId}
                isLoadingReportDetail={isLoadingReportDetail}
                handleViewContractReport={handleViewContractReport}
                workspaceFiles={workspaceFiles}
                workspaceFilesLoading={workspaceFilesLoading}
                workspaceFilesError={workspaceFilesError}
                setWorkspaceFilesLoading={setWorkspaceFilesLoading}
                setWorkspaceFilesError={setWorkspaceFilesError}
                setWorkspaceFiles={setWorkspaceFiles}
                user={user}
                navigate={navigate}
              />
            </>
          )}
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
