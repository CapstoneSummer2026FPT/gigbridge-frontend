import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Clock,
  FileText, Calendar, ArrowLeft,
  ShieldAlert, ListChecks, Copy, Check, ChevronDown, Star, Sparkles, Eye, Mail, RefreshCw, LoaderCircle, CheckCircle, Users, Zap, ChevronRight, Briefcase, ExternalLink, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { ContractStatus, MilestoneStatus, type Milestone } from '../../../types/models/Contract';
import { ESignerRole, ESignDocumentStatus, SignatureStatus } from '../../../types/models/ESign';
import {
  getContractStatusLabel,
  getContractStatusClass,
  formatContractDate,
  getMilestoneStatusLabel,
} from '../../../shared/utils/contractUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/view-contract-details-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoinNumber, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import type { Dispute } from '../../../types/models/Dispute';
import { ContractChangeControlPanel } from './ContractChangeControlPanel';
import { ContractLegalCard } from './ContractLegalCard';
import { ClientEscrowFundingCard } from './ClientEscrowFundingCard';
import { ClientContractPlanEditor } from './ClientContractPlanEditor';
import { ContractPlanChangeRequestBanner } from './ContractPlanChangeRequestBanner';
import { useContractPlanChangeRequest } from '../hooks/useContractPlanChangeRequest';
import {
  contractStatusMayHaveESignDocument,
  useContractESignDocument,
} from '../hooks/useContractESignDocument';
import { ContractAreaTabs } from './ContractAreaTabs';
import { CancelContractButton } from './CancelContractButton';


interface AuditTrailEntry {
  id: string;
  action: string;
  timestamp: string;
  performedBy: string;
  performedByRole: 'Client' | 'Freelancer' | 'Admin';
  details?: string;
  metadata?: Record<string, any>;
}

interface ClientContractDetailsProps {
  contract: any;
  milestones: Milestone[];
  auditTrail: AuditTrailEntry[];
  onRefresh: () => void;
  isAdminOverride?: boolean;
  activeDispute: Dispute | null;
  activeDisputeError: string | null;
  activeDisputeLoading: boolean;
  onRetryDispute: () => void;
  onOpenReviewModal?: () => void;
}

export function ClientContractDetails({
  contract,
  milestones,
  auditTrail,
  onRefresh,
  isAdminOverride = false,
  activeDispute,
  activeDisputeError,
  activeDisputeLoading,
  onRetryDispute,
  onOpenReviewModal,
}: ClientContractDetailsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['contracts', 'common', 'reviews']);

  // States
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isFullySignedPendingEscrow, setIsFullySignedPendingEscrow] = useState(false);
  const [hasClientSignedContract, setHasClientSignedContract] = useState(false);

  const esignDocumentState = useContractESignDocument(
    contract?.contractsId,
    contractStatusMayHaveESignDocument(contract.status)
  );

  // Only step 1 can act on a rework request, so the lookup is skipped everywhere else.
  const { request: planChangeRequest } = useContractPlanChangeRequest(
    contract?.contractsId,
    Number(contract.status) === ContractStatus.PendingContractDetails,
    contract?.updatedAt ?? contract?.revisionNumber ?? null,
  );

  useEffect(() => {
    if (contract.status === ContractStatus.PendingSignature &&
      esignDocumentState.document?.status === ESignDocumentStatus.FullySigned) {
      onRefresh();
    }
  }, [contract.status, esignDocumentState.document?.status, onRefresh]);
  useEffect(() => {
    const loadESignStatus = (): void => {
      if (!contract?.contractsId || contract.status !== ContractStatus.PendingSignature) {
        setIsFullySignedPendingEscrow(false);
        setHasClientSignedContract(false);
        return;
      }
      if (esignDocumentState.isLoading) {
        return;
      }

      const contractDocument = esignDocumentState.document;
      const isContractFullySigned = contractDocument?.status === ESignDocumentStatus.FullySigned;
      const hasClientContractSignature = Boolean(
        contractDocument?.signatures.some(
          signature =>
            signature.signerRole === ESignerRole.Client &&
            (signature.status === SignatureStatus.Signed ||
              (signature.status === SignatureStatus.Pending && signature.isDraftValid === true))
        )
      );
      setHasClientSignedContract(hasClientContractSignature);
      setIsFullySignedPendingEscrow(isContractFullySigned);
    };

    void loadESignStatus();

  }, [
    contract?.contractsId,
    contract.status,
    esignDocumentState.document,
    esignDocumentState.isLoading,
  ]);

  const effectiveStatus =
    contract.status === ContractStatus.PendingSignature && isFullySignedPendingEscrow
      ? ContractStatus.PendingEscrow
      : contract.status;

  const milestonesTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
  const milestonesApproved = milestones.filter(
    m => m.status === MilestoneStatus.Approved || m.status === MilestoneStatus.Completed,
  ).length;
  const milestonesPaid = milestones.filter(m => (m.releasedAmount ?? 0) >= m.amount).length;

  let currentStep = 1;
  if (effectiveStatus === ContractStatus.PendingContractConfirmation) {
    currentStep = 2;
  } else if (
    effectiveStatus === ContractStatus.PendingSignature ||
    effectiveStatus === ContractStatus.PendingEscrow
  ) {
    currentStep = 3;
  } else if (effectiveStatus >= ContractStatus.Active) {
    currentStep = 4;
  }

  const handleCopyContractId = () => {
    if (contract?.contractsId) {
      navigator.clipboard.writeText(contract.contractsId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const renderViewOnlyMilestones = () => (
    <div className="glass-card p-6 md:p-8 relative space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <ListChecks size={20} className="text-brand" />
          <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">{t('contracts.milestoneBreakdown')} ({milestones.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand rounded-full text-xs font-extrabold">
            <span>{t('contracts.sum')}:</span>
            <GCoinIcon size={14} />
            <span>{formatGigCoinNumber(milestonesTotal)}</span>
            <span className="text-[10.5px] font-semibold opacity-85">(≈ {formatGigCoinToVnd(milestonesTotal)})</span>
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="border border-border bg-background hover:border-brand/40 rounded-2xl p-4 transition duration-300 flex justify-between items-center gap-4 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20 font-black text-xs">
                {index + 1}
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-xs font-extrabold text-text-primary truncate">{milestone.title}</h3>
                <span className="text-[11px] text-text-muted mt-0.5 font-semibold flex items-center gap-1.5">
                  <Calendar size={12} />
                  {t('contracts.duePrefix')}: {formatContractDate(milestone.due_date)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-sm font-black text-text-primary">
                <GCoinIcon size={15} />
                <span>{formatGigCoinNumber(milestone.amount)}</span>
              </div>
              <span className="text-[11px] font-semibold text-text-muted">
                ≈ {formatGigCoinToVnd(milestone.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const clientProfile = contract.clientProfile;
  const freelancerProfile = contract.freelancerProfile;

  const clientUserId = contract.clientUserId || contract.clientProfilesId || clientProfile?.profilesId || clientProfile?.userId;
  const clientName = clientProfile?.fullName || contract.clientName || 'Client';
  const clientCompany = clientProfile?.companyName || contract.clientCompany || '';
  const clientEmail = clientProfile?.email || contract.clientEmail || '';
  const clientAvatar = clientProfile?.profileImageUrl || clientProfile?.avatarUrl || clientProfile?.avatar || clientProfile?.profilePictureUrl || contract.clientProfileImageUrl || contract.clientAvatarUrl || contract.clientAvatar || null;

  const freelancerUserId = contract.freelancerUserId || contract.freelancerProfilesId || freelancerProfile?.profilesId || freelancerProfile?.userId;
  const freelancerName = freelancerProfile?.fullName || contract.freelancerName || 'Freelancer';
  const freelancerHeadline = freelancerProfile?.headline || contract.freelancerHeadline || '';
  const freelancerEmail = freelancerProfile?.email || contract.freelancerEmail || '';
  const freelancerAvatar = freelancerProfile?.profileImageUrl || freelancerProfile?.avatarUrl || freelancerProfile?.avatar || freelancerProfile?.profilePictureUrl || contract.freelancerProfileImageUrl || contract.freelancerAvatarUrl || contract.freelancerAvatar || null;

  return (
    <AppLayout fullWidth>
      <div className="bg-background min-h-[calc(100vh-4rem)] flex flex-col text-left font-sans text-text-primary">

        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 px-3.5 py-3.5 sm:py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/contracts')}
                className="back-button shrink-0 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer shadow-xs"
                title="Back to Contracts"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <div className="mb-0.5 flex items-center gap-1.5 sm:gap-2 text-[10px] font-black uppercase tracking-wider text-brand">
                  <Sparkles size={13} className="shrink-0" />
                  <span className="truncate">{t('contracts.contractDetailsClient')}</span>
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-text-primary flex flex-wrap items-center gap-2 min-w-0 break-all [overflow-wrap:anywhere]">
                  <span>{contract.title}</span>
                  <span className="text-brand italic font-light">Details</span>
                  <span className={`status-badge ${getContractStatusClass(effectiveStatus)} text-[10px] py-0.5 sm:py-1 px-2.5 sm:px-3 shrink-0`}>
                    {getContractStatusLabel(effectiveStatus, t)}
                  </span>
                </h1>
              </div>
            </div>

            <ContractAreaTabs />
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="mx-auto max-w-[1600px] w-full space-y-4 sm:space-y-6 px-3.5 py-4 sm:py-6 lg:px-8 flex-1 min-w-0">

          {/* Stepper Panel */}
          <section className="glass-card p-3.5 sm:p-4 relative overflow-hidden text-left shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand via-mint to-cyan" />
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-1.5 custom-scrollbar touch-pan-x scroll-smooth whitespace-nowrap">
              {[
                { number: 1, label: t('contracts.defineProjectPlan') },
                { number: 2, label: t('contracts.freelancerReview') },
                { number: 3, label: t('contracts.secureProjectEscrow') },
              ].map((step, idx) => {
                const isCompleted = currentStep > step.number;
                const isActive = currentStep === step.number;
                const needsRework = step.number === 1 && Boolean(planChangeRequest);

                return (
                  <div key={step.number} className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-300 border shrink-0
                        ${needsRework ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-500/25 shadow-sm' :
                          isCompleted ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm' :
                            isActive ? 'bg-brand text-white border-brand ring-2 ring-brand/20 shadow-sm' :
                              'bg-surface-muted text-text-muted border-border'}`}
                      >
                        {needsRework ? <AlertTriangle size={14} /> : isCompleted ? <Check size={14} /> : step.number}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                          {step.label}
                        </span>
                        {needsRework && (
                          <span
                            data-testid="contract-plan-change-step-badge"
                            className="mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400"
                          >
                            {t('contracts.planChangeRequest.badge')}
                          </span>
                        )}
                      </div>
                    </div>
                    {idx < 2 && (
                      <div className={`w-8 md:w-12 h-[2px] transition-all duration-300 shrink-0
                        ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 'bg-border'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dispute alert banner if active dispute */}
          {activeDispute && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-bold text-text-primary flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={20} className="text-rose-500 shrink-0" />
                <div>
                  <span className="font-extrabold">{t('contracts.disputeTerms')}: </span>
                  <span>{activeDispute.reason || 'Dispute in progress'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/disputes/${activeDispute.id}`)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-rose-600 transition cursor-pointer"
              >
                <Eye size={14} /> {t('contracts.viewDispute')}
              </button>
            </div>
          )}

          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-12 gap-6">

            {/* Left Column (Main Details & Forms) */}
            <div className="col-span-12 lg:col-span-8 space-y-6">

              {/* Active Contract Workspace Banner Badge */}
              {Number(contract.status) === ContractStatus.Active && (
                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-5 sm:p-6 shadow-2xl text-white group hover:border-emerald-400/60 transition-all">
                  {/* Decorative glowing background element */}
                  <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-400/30 transition-all" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {t('contracts.activeBanner.badge')}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider">
                          <Sparkles size={11} /> {t('contracts.activeBanner.readyBadge')}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <Briefcase size={20} className="text-emerald-300 shrink-0" />
                        <span>{t('contracts.activeBanner.title')}</span>
                      </h3>

                      <p className="text-xs sm:text-sm font-medium text-emerald-100/90 leading-relaxed max-w-xl">
                        {t('contracts.activeBanner.description')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/workspace/${contract.contractsId}`)}
                      className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                    >
                      <ListChecks size={18} className="text-emerald-700" />
                      <span>{t('contracts.activeBanner.ctaButton')}</span>
                      <ArrowRight size={16} className="text-emerald-700 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Change request control panel */}
              <ContractChangeControlPanel
                contractId={contract.contractsId}
                contractStatus={contract.status}
                role="client"
                milestones={milestones}
                onApplied={onRefresh}
              />

              <CancelContractButton
                contractId={contract.contractsId}
                contractStatus={contract.status}
                contractCreatedAt={contract.createdAt}
                onCancelled={onRefresh}
              />

              {/* Step 1: Define project plan */}
              {contract.status === ContractStatus.PendingContractDetails && (
                <>
                  {planChangeRequest && (
                    <ContractPlanChangeRequestBanner
                      request={planChangeRequest}
                      milestones={milestones}
                    />
                  )}

                  <ClientContractPlanEditor
                    contractId={contract.contractsId}
                    contractBudget={contract.totalBudget}
                    milestones={milestones}
                    onRefresh={onRefresh}
                  />

                  <ContractLegalCard
                    contractId={contract.contractsId}
                    documentState={esignDocumentState}
                  />
                </>
              )}

              {/* Step 2: Review and Confirm (waiting for freelancer) */}
              {contract.status === ContractStatus.PendingContractConfirmation && (
                <>
                  <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4.5 sm:p-5 flex items-center gap-3.5 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Clock size={18} className="animate-pulse" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-black text-text-primary">
                        {t('contracts.waitingFreelancerReview', { defaultValue: 'Awaiting Freelancer Review' })}
                      </h4>
                      <p className="text-[11px] font-medium text-text-muted">
                        {t('contracts.waitingFreelancerReviewSub', { defaultValue: 'Kế hoạch dự án đã được gửi cho Freelancer xem xét và xác nhận hoặc gửi yêu cầu điều chỉnh.' })}
                      </p>
                    </div>
                  </div>
                  <ContractLegalCard
                    contractId={contract.contractsId}
                    documentState={esignDocumentState}
                  />
                  {renderViewOnlyMilestones()}
                </>
              )}

              {/* Step 3: PendingSignature */}
              {effectiveStatus === ContractStatus.PendingSignature && (
                <>
                  <div className="bg-brand/10 text-brand border border-brand/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
                    <Clock size={20} className={hasClientSignedContract ? "shrink-0 animate-pulse" : "shrink-0"} />
                    <div className="flex-1 text-xs font-bold">
                      {hasClientSignedContract
                        ? t('contracts.waitingFreelancerSign')
                        : t('contracts.readyForEsign')}
                    </div>
                  </div>
                  <ContractLegalCard
                    contractId={contract.contractsId}
                    documentState={esignDocumentState}
                  />
                  {renderViewOnlyMilestones()}
                </>
              )}

              {/* Step 4: Escrow Funding */}
              {effectiveStatus === ContractStatus.PendingEscrow && (
                <>
                  <ClientEscrowFundingCard
                    contractId={contract.contractsId}
                    escrow={contract.escrow}
                    onFunded={onRefresh}
                    onRetryQuote={onRefresh}
                  />
                  <ContractLegalCard
                    contractId={contract.contractsId}
                    documentState={esignDocumentState}
                  />
                  {renderViewOnlyMilestones()}
                </>
              )}

              {/* Step 5: Active Contract / Full View */}
              {contract.status >= ContractStatus.Active && (
                <>
                  <section className="rounded-2xl border border-border bg-background p-6 md:p-8 space-y-6 shadow-xs">
                    <div className="flex items-center gap-2.5 border-b border-border pb-4">
                      <FileText size={20} className="text-brand" />
                      <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">{t('contracts.contractInfo')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-3 flex flex-col gap-2 bg-surface-muted/30 border border-border rounded-2xl p-4">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('contracts.contractId')}</span>
                        <div className="flex items-center justify-between gap-3">
                          <code className="font-mono text-xs font-bold text-text-primary select-all bg-background border border-border px-3 py-1.5 rounded-xl truncate flex-1 shadow-xs">
                            {contract.contractsId}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyContractId}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-xs border-none
                              ${copySuccess
                                ? 'bg-emerald-500 text-white'
                                : 'bg-brand text-white hover:opacity-90'
                              }`}
                          >
                            {copySuccess ? (
                              <>
                                <Check size={14} />
                                {t('contracts.copied')}
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                {t('contracts.copyId')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 bg-surface-muted/30 border border-border rounded-2xl p-4">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('contracts.paymentTypeLabel')}</span>
                        <span className="text-xs font-black text-text-primary mt-1">
                          {t('contracts.fixedPrice')}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 bg-surface-muted/30 border border-border rounded-2xl p-4">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Job Post ID</span>
                        <span className="text-xs font-bold text-text-muted mt-1 truncate">
                          {contract.jobPostsId}
                        </span>
                      </div>

                      {contract.createdAt && (
                        <div className="flex flex-col gap-1 bg-surface-muted/30 border border-border rounded-2xl p-4">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('contracts.createdAt')}</span>
                          <span className="text-xs font-black text-text-primary mt-1">
                            {new Date(contract.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {contract.description && (
                      <div className="flex flex-col gap-2 mt-4">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('contracts.contractDescription')}</span>
                        <p className="text-xs font-semibold leading-relaxed bg-surface-muted/30 border border-border rounded-2xl p-4 text-text-primary border-l-4 border-l-brand">
                          {contract.description}
                        </p>
                      </div>
                    )}
                  </section>

                  <ContractLegalCard
                    contractId={contract.contractsId}
                    documentState={esignDocumentState}
                  />

                  {/* Milestones Accordions */}
                  {milestones.length > 0 && (
                    <section className="rounded-2xl border border-border bg-background p-6 md:p-8 space-y-6 shadow-xs">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                        <div className="flex items-center gap-2.5">
                          <ListChecks size={20} className="text-brand" />
                          <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">{t('contracts.milestoneBreakdown')} ({milestones.length})</h2>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black">
                            {t('contracts.milestonesPaidCount', { milestonesPaid })}
                          </span>
                          <span className="px-3 py-1 bg-brand/10 border border-brand/20 text-brand rounded-full text-xs font-black">
                            {t('contracts.milestonesApprovedCount', { milestonesApproved })}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand rounded-full text-xs font-black">
                            <span>{t('contracts.sum')}:</span>
                            <GCoinIcon size={13} />
                            <span>{formatGigCoinNumber(milestonesTotal)}</span>
                            <span className="text-[10.5px] font-semibold opacity-85">(≈ {formatGigCoinToVnd(milestonesTotal)})</span>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {milestones.map((milestone, idx) => {
                          const isExpanded = expandedMilestone === milestone.id;
                          return (
                            <div key={milestone.id || idx} className="border border-border rounded-2xl overflow-hidden bg-background shadow-xs">
                              <div
                                onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                                className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-muted/40 transition"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand font-black text-xs">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <h3 className="text-xs font-extrabold text-text-primary truncate">{milestone.title}</h3>
                                    <span className="text-[11px] font-semibold text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                                      <span className="inline-flex items-center gap-1 text-text-primary font-black">
                                        <GCoinIcon size={13} />
                                        <span>{formatGigCoinNumber(milestone.amount)}</span>
                                      </span>
                                      <span className="text-text-muted">(≈ {formatGigCoinToVnd(milestone.amount)})</span>
                                      <span>·</span>
                                      <span>{t('contracts.duePrefix')}: {formatContractDate(milestone.due_date)}</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="px-2.5 py-0.5 rounded-full border border-border bg-surface-muted text-[10px] font-black text-text-primary">
                                    {t('contracts.milestoneStatus.' + milestone.status, { defaultValue: getMilestoneStatusLabel(milestone.status) })}
                                  </span>
                                  <ChevronDown className={`transition-transform duration-200 text-text-muted ${isExpanded ? 'rotate-180' : ''}`} size={16} />
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="border-t border-border bg-surface-muted/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
                                  <div>
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-1">{t('contracts.amountTokens')}</span>
                                    <div className="flex items-center gap-1.5 font-black text-text-primary">
                                      <GCoinIcon size={14} />
                                      <span>{formatGigCoinNumber(milestone.amount)}</span>
                                    </div>
                                    <span className="text-[10.5px] font-semibold text-text-muted block mt-0.5">
                                      ≈ {formatGigCoinToVnd(milestone.amount)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-1">{t('contracts.dueDate')}</span>
                                    <span className="text-text-primary">{formatContractDate(milestone.due_date)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-1">Status</span>
                                    <span className="text-text-primary">{getMilestoneStatusLabel(milestone.status)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-1">{t('contracts.paidPrefix')}</span>
                                    <span className="text-text-primary">{milestone.paid_at ? new Date(milestone.paid_at).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Audit Trail */}
                  <section className="rounded-2xl border border-border bg-background p-6 md:p-8 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div className="flex items-center gap-2.5">
                        <Clock size={20} className="text-brand" />
                        <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">{t('contracts.auditTrailHistory')}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAuditTrail(!showAuditTrail)}
                        className="px-4 py-2 bg-background hover:bg-surface-muted border border-border rounded-xl text-xs font-extrabold text-text-primary transition cursor-pointer shadow-xs"
                      >
                        {showAuditTrail ? t('contracts.hideHistory') : t('contracts.showHistory')}
                      </button>
                    </div>

                    {showAuditTrail && (
                      <div className="space-y-4 pt-2">
                        {auditTrail.length > 0 ? (
                          <div className="space-y-3">
                            {auditTrail.map(entry => (
                              <div key={entry.id} className="rounded-2xl border border-border bg-surface-muted/20 p-4 space-y-1 text-xs">
                                <div className="flex items-center justify-between font-extrabold text-text-primary">
                                  <span>{entry.action}</span>
                                  <span className="text-[10px] text-text-muted">{new Date(entry.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-text-muted font-semibold">{entry.details}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted font-semibold text-center py-4">{t('contracts.noAuditHistory')}</p>
                        )}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* Right Column (Sidebar Cards) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">

              {/* Client & Freelancer Profiles Card */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-muted border-b border-border pb-3 flex items-center gap-2">
                  <Users size={14} className="text-brand" />
                  {t('contracts.contractParties', { defaultValue: 'Contract Parties' })}
                </h3>

                {/* Client Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">{t('contracts.clientYou')}</span>
                  <UserProfileLink userId={clientUserId} role="client" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-surface-muted/30 hover:border-brand/40 transition">
                      <UserAvatar name={clientName} src={clientAvatar} userId={clientUserId} size="md" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-text-primary truncate">{clientName}</h4>
                        {clientCompany && (
                          <p className="text-[11px] font-extrabold text-brand truncate">{clientCompany}</p>
                        )}
                        {clientEmail && (
                          <p className="text-[10px] text-text-muted truncate font-semibold">{clientEmail}</p>
                        )}
                      </div>
                    </div>
                  </UserProfileLink>
                </div>

                {/* Freelancer Section */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">{t('contracts.freelancer')}</span>
                  <UserProfileLink userId={freelancerUserId} role="freelancer" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-surface-muted/30 hover:border-brand/40 transition">
                      <UserAvatar name={freelancerName} src={freelancerAvatar} userId={freelancerUserId} size="md" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-text-primary truncate">{freelancerName}</h4>
                        {freelancerHeadline && (
                          <p className="text-[11px] font-semibold text-text-muted truncate">{freelancerHeadline}</p>
                        )}
                        {freelancerEmail && (
                          <a
                            href={`mailto:${freelancerEmail}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-brand font-bold truncate max-w-full hover:underline"
                          >
                            <Mail size={10} />
                            {freelancerEmail}
                          </a>
                        )}
                      </div>
                    </div>
                  </UserProfileLink>
                </div>
              </div>

              {/* Contract Summary */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-muted border-b border-border pb-3">
                  {t('contracts.contractSummary')}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-surface-muted/40 rounded-xl border border-border">
                    <div>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">{t('contracts.budget')}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <GCoinIcon size={16} />
                        <span className="text-base font-black text-brand">{formatGigCoinNumber(contract.totalBudget)}</span>
                      </div>
                      <span className="text-[10.5px] font-semibold text-text-muted block mt-0.5">
                        ≈ {formatGigCoinToVnd(contract.totalBudget)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <GigCoinLogo size={16} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-surface-muted/40 rounded-xl border border-border">
                    <div>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">{t('contracts.startDate')}</span>
                      <span className="text-xs font-black text-text-primary mt-0.5 block">{formatContractDate(contract.startDate)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-surface-muted/40 rounded-xl border border-border">
                    <div>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">{t('contracts.milestonesStatus')}</span>
                      <span className="text-xs font-black text-text-primary mt-0.5 block">
                        {t('contracts.milestonesPaidCount', { milestonesPaid })} / {t('contracts.milestonesApprovedCount', { milestonesApproved })}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Overview Panel */}
              {(contract.jobPostsId || (contract as any).jobPostId || (contract as any).jobId) && (
                <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[var(--border)]/70 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--brand,#494be7)]/10 text-[var(--brand,#494be7)] flex items-center justify-center">
                        <Briefcase size={15} />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                        {t('jobs.jobOverview', { defaultValue: 'Thông tin bài tuyển dụng' })}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-extrabold text-foreground leading-snug line-clamp-2">
                      {contract.jobTitle || contract.title}
                    </h4>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Hợp đồng công việc được liên kết trực tiếp với bài đăng này.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${contract.jobPostsId || (contract as any).jobPostId || (contract as any).jobId}`)}
                    className="group relative w-full py-2.5 px-3.5 rounded-xl font-extrabold text-xs text-[var(--brand,#494be7)] bg-[var(--brand,#494be7)]/10 border border-[var(--brand,#494be7)]/20 hover:bg-[var(--brand,#494be7)] hover:text-white transition-all duration-200 flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{t('jobs.viewJobDetail', { defaultValue: 'Xem chi tiết bài đăng' })}</span>
                    <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                </div>
              )}

              {/* Quick Actions Panel */}
              {Number(contract.status) !== ContractStatus.PendingSignature &&
                Number(contract.status) !== ContractStatus.PendingEscrow &&
                Number(contract.status) !== ContractStatus.PendingContractConfirmation &&
                Number(contract.status) !== ContractStatus.PendingContractDetails && (
                  <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md p-5 space-y-4">
                    {/* Background Ambient Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand,#494be7)]/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between border-b border-[var(--border)]/70 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--brand,#494be7)]/10 text-[var(--brand,#494be7)] flex items-center justify-center">
                          <Zap size={15} className="fill-[var(--brand,#494be7)]/20" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                          {t('contracts.quickActions')}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2.5 relative z-10">
                      {/* Go to Workspace (Brand Indigo Gradient: Dark to Light) */}
                      {(contract.status === ContractStatus.Active ||
                        contract.status === ContractStatus.Completed ||
                        contract.status === ContractStatus.Disputed ||
                        Number(contract.status) === 7 ||
                        Number(contract.status) === 8 ||
                        Number(contract.status) === 10) && (
                          <button
                            type="button"
                            onClick={() => navigate(`/workspace/${contract.contractsId}`)}
                            className="group relative w-full py-3 px-3.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-[#3f41d0] via-[var(--brand,#494be7)] to-[#6366f1] hover:from-[#3436be] hover:to-[var(--brand,#494be7)] hover:shadow-lg hover:shadow-[var(--brand,#494be7)]/25 transition-all duration-300 flex items-center justify-between cursor-pointer border-none overflow-hidden"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                                <ListChecks size={15} />
                              </div>
                              <span className="truncate">{t('contracts.goToWorkspace', { defaultValue: 'Go to workspace' })}</span>
                            </div>
                            <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform shrink-0" />
                          </button>
                        )}

                      {/* Review Partner (Golden Amber Gradient: Dark to Light) */}
                      {contract.canReview && (
                        <button
                          type="button"
                          onClick={() => (onOpenReviewModal ? onOpenReviewModal() : navigate(`/reviews/create?contractId=${contract.contractsId}`))}
                          className="group relative w-full py-3 px-3.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-orange-600 via-amber-600 to-amber-400 hover:from-orange-700 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 flex items-center justify-between cursor-pointer border-none overflow-hidden"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                              <Star size={15} className="fill-white" />
                            </div>
                            <span className="truncate">{t('reviews.leaveForFreelancer')}</span>
                          </div>
                          <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform shrink-0" />
                        </button>
                      )}

                      {/* Reviewed Status (Emerald Green Gradient: Dark to Light) */}
                      {contract.hasReviewedByCurrentUser && contract.status === ContractStatus.Completed && (
                        <div className="relative w-full py-3 px-3.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-400 shadow-sm flex items-center justify-between overflow-hidden">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                              <CheckCircle size={15} />
                            </div>
                            <span className="truncate">{t('reviews.reviewed')}</span>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/20">OK</span>
                        </div>
                      )}

                      {/* Dispute Status / Retry (Rose Red Gradient) */}
                      {!isAdminOverride && activeDisputeLoading && (
                        <div className="relative w-full py-3 px-3.5 rounded-xl font-black text-xs text-white bg-slate-700 dark:bg-slate-800 flex items-center justify-between overflow-hidden">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                              <LoaderCircle size={15} className="animate-spin" />
                            </div>
                            <span>{t('contracts.checkingDispute', { defaultValue: 'Checking dispute status…' })}</span>
                          </div>
                        </div>
                      )}

                      {!isAdminOverride && !activeDisputeLoading && activeDisputeError && (
                        <div className="w-full p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl text-xs font-extrabold space-y-2">
                          <p className="m-0">{activeDisputeError}</p>
                          <button
                            type="button"
                            onClick={onRetryDispute}
                            className="w-full py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer font-black border-none"
                          >
                            <RefreshCw size={14} /> {t('common.retry', { defaultValue: 'Retry' })}
                          </button>
                        </div>
                      )}

                      {!isAdminOverride && !activeDisputeLoading && !activeDisputeError && activeDispute && (
                        <button
                          type="button"
                          onClick={() => navigate(`/disputes/${activeDispute.id}`)}
                          className="group relative w-full py-3 px-3.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 hover:shadow-lg hover:shadow-rose-600/25 transition-all duration-300 flex items-center justify-between cursor-pointer border-none overflow-hidden"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                              <ShieldAlert size={15} />
                            </div>
                            <span className="truncate">{t('contracts.viewDispute', { defaultValue: 'View Dispute Case' })}</span>
                          </div>
                          <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform shrink-0" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
