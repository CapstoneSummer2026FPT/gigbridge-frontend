import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, AlertCircle, CheckCircle, Clock,
  User, FileText, Calendar, Download, ArrowLeft, Shield,
  Mail, ListChecks, Copy, Check, FileCheck, ChevronDown,
  Star, ShieldAlert, Edit3, XCircle, LoaderCircle, RefreshCw
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import { ContractStatus, MilestoneStatus, type Milestone } from '../../../types/models/Contract';
import { SignatureStatus } from '../../../types/models/ESign';
import {
  getContractStatusLabel,
  getContractStatusClass,
  formatContractAmount,
  formatContractDate,
  getMilestoneStatusLabel
} from '../../../shared/utils/contractUtils';
import '../styles/view-contract-details-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import type { Dispute } from '../../../types/models/Dispute';
import { ContractChangeControlPanel } from './ContractChangeControlPanel';

interface AuditTrailEntry {
  id: string;
  action: string;
  timestamp: string;
  performedBy: string;
  performedByRole: 'Client' | 'Freelancer' | 'Admin';
  details?: string;
  metadata?: Record<string, any>;
}

interface FreelancerContractDetailsProps {
  contract: any;
  milestones: Milestone[];
  auditTrail: AuditTrailEntry[];
  onRefresh: () => void;
  isAdminOverride?: boolean;
  activeDispute: Dispute | null;
  activeDisputeError: string | null;
  activeDisputeLoading: boolean;
  onRetryDispute: () => void;
}

export function FreelancerContractDetails({
  contract,
  milestones,
  auditTrail,
  onRefresh,
  isAdminOverride = false,
  activeDispute,
  activeDisputeError,
  activeDisputeLoading,
  onRetryDispute
}: FreelancerContractDetailsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useApp();

  // States
  const reviewContentRef = useRef<HTMLDivElement | null>(null);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [showMilestoneChangeModal, setShowMilestoneChangeModal] = useState(false);
  const [milestoneChangeReason, setMilestoneChangeReason] = useState('');
  const [currentUserSignedESign, setCurrentUserSignedESign] = useState(false);

  const milestonesTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
  const milestonesApproved = milestones.filter(m => m.status === MilestoneStatus.Approved).length;
  const milestonesPaid = milestones.filter(m => (m.releasedAmount ?? 0) >= m.amount).length;
  const milestoneTotalMatchesBudget = Math.abs(milestonesTotal - Number(contract.totalBudget || 0)) < 0.01;
  const clientProfile = contract.clientProfile;
  const freelancerProfile = contract.freelancerProfile;
  const clientName = clientProfile?.fullName || contract.clientName || 'Client';
  const clientEmail = clientProfile?.email || contract.clientEmail || '';
  const clientCompany = clientProfile?.companyName || '';
  const clientAvatar = clientProfile?.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(clientName)}`;
  const freelancerName = freelancerProfile?.fullName || contract.freelancerName || 'Freelancer';
  const freelancerEmail = freelancerProfile?.email || contract.freelancerEmail || '';
  const freelancerHeadline = freelancerProfile?.headline || '';
  const freelancerAvatar = freelancerProfile?.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(freelancerName)}`;
  const hasSignedESignContract =
    currentUserSignedESign ||
    contract.status === ContractStatus.PendingEscrow ||
    contract.status >= ContractStatus.Active;

  useEffect(() => {
    let isCancelled = false;

    const loadESignStatus = async () => {
      if (!contract?.contractsId || !user?.id) {
        setCurrentUserSignedESign(false);
        return;
      }

      try {
        const response = await esignGetAPI.getDocumentByContract(contract.contractsId);
        if (isCancelled) {
          return;
        }

        const hasSigned = Boolean(
          response.success &&
          response.data?.signatures.some(
            signature => signature.userId === user.id && signature.status === SignatureStatus.Signed
          )
        );
        setCurrentUserSignedESign(hasSigned);
      } catch (error) {
        if (!isCancelled) {
          setCurrentUserSignedESign(false);
        }
      }
    };

    void loadESignStatus();

    return () => {
      isCancelled = true;
    };
  }, [contract?.contractsId, user?.id]);

  // Stepper: PendingContractConfirmation -> PendingSignature -> PendingEscrow -> Active
  let currentStep = 1;
  if (contract.status === ContractStatus.PendingSignature) {
    currentStep = 2;
  } else if (contract.status === ContractStatus.PendingEscrow) {
    currentStep = 3;
  } else if (contract.status >= ContractStatus.Active) {
    currentStep = 4;
  }

  const handleCopyContractId = () => {
    if (contract?.contractsId) {
      navigator.clipboard.writeText(contract.contractsId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadPDF = () => {
    if (contract?.esignContractPdfUrl) {
      window.open(contract.esignContractPdfUrl, '_blank');
    }
  };

  const handleScrollToReview = () => {
    reviewContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleViewESignContract = () => {
    navigate(`/contracts/${contract.contractsId}/sign`);
  };

  // Confirm contract details (step 1)
  const handleConfirmDetails = async () => {
    setActionLoading(true);
    try {
      const res = await contractPostAPI.confirmDetails(contract.contractsId);
      if (res.success) {
        alert(t('contracts.alerts.confirmed'));
        onRefresh();
      } else {
        alert(res.message || t('contracts.alerts.failedConfirm'));
      }
    } catch (err) {
      console.error(err);
      alert(t('contracts.alerts.errorOccurred'));
    } finally {
      setActionLoading(false);
    }
  };

  // Request change for contract terms
  const handleRequestChange = async () => {
    if (!changeRequestReason.trim()) {
      alert(t('contracts.alerts.reasonRequired'));
      return;
    }
    setActionLoading(true);
    try {
      const res = await contractPostAPI.requestChange(contract.contractsId, changeRequestReason.trim());
      if (res.success) {
        alert(t('contracts.alerts.changeSubmitted'));
        setShowChangeRequestModal(false);
        setChangeRequestReason('');
        onRefresh();
      } else {
        alert(res.message || t('contracts.alerts.failedChange'));
      }
    } catch (err) {
      console.error(err);
      alert(t('contracts.alerts.errorOccurred'));
    } finally {
      setActionLoading(false);
    }
  };

  // Request milestone change
  const handleRequestMilestoneChange = async () => {
    if (!milestoneChangeReason.trim()) {
      alert(t('contracts.alerts.milestoneReasonRequired'));
      return;
    }
    setActionLoading(true);
    try {
      const res = await contractPostAPI.requestMilestoneChange(contract.contractsId, milestoneChangeReason.trim());
      if (res.success) {
        alert(t('contracts.alerts.milestoneChangeSubmitted'));
        setShowMilestoneChangeModal(false);
        setMilestoneChangeReason('');
        onRefresh();
      } else {
        alert(res.message || t('contracts.alerts.failedMilestoneChange'));
      }
    } catch (err) {
      console.error(err);
      alert(t('contracts.alerts.errorOccurred'));
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for rendering terms read-only
  const renderViewOnlyTerms = () => (
    <div className="glass-card p-8 md:p-10 space-y-6">
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
        <FileText size={20} className="text-primary" />
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.contractTerms')}</h2>
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">{t('contracts.scopeOfWork')}</span>
          <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
            {contract?.scopeOfWork || t('contracts.noScopeDefined')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">{t('contracts.paymentTerms')}</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.paymentTerms || t('contracts.noPaymentTerms')}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">{t('contracts.intellectualProperty')}</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.intellectualPropertyTerms || t('contracts.noIpTerms')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">{t('contracts.confidentiality')}</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.confidentialityTerms || t('contracts.noNdaTerms')}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">{t('contracts.cancellationPolicy')}</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.cancellationTerms || t('contracts.noCancellationPolicy')}
            </p>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">{t('contracts.disputeResolution')}</span>
          <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
            {contract?.disputeTerms || t('contracts.noDisputeTerms')}
          </p>
        </div>
      </div>
    </div>
  );

  const renderViewOnlyMilestones = () => (
    <div className="glass-card p-8 md:p-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5 mb-6">
        <div className="flex items-center gap-2.5">
          <ListChecks size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.milestoneBreakdown')} ({milestones.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
            {t('contracts.sum')}: {formatContractAmount(milestonesTotal)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="border border-border/40 hover:border-primary/30 rounded-2xl p-5 bg-secondary/15 hover:bg-secondary/25 transition-all duration-300 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center shrink-0 border border-border/40 text-primary font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-foreground">{milestone.title}</h3>
                <span className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                  <Calendar size={12} />
                  {t('contracts.duePrefix')}: {formatContractDate(milestone.due_date)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-foreground block">{formatContractAmount(milestone.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout excludeMeshGradient>
      <div className="bg-background h-auto lg:h-[calc(100vh-7.5rem)] flex flex-col relative w-full lg:overflow-hidden text-left font-sans">
        
        {/* Decorative Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <div className="client-dash-glow-orb orb-purple absolute" />
          <div className="client-dash-glow-orb orb-cyan absolute" />
          <div className="client-dash-glow-orb orb-blue absolute" />
          <div className="absolute -top-10 -left-10 text-[20vw] font-black text-primary/[0.008] dark:text-primary/[0.004] avant-garde-heading uppercase leading-none">
            CONTRACT
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-4 md:px-8 py-4 lg:py-6 lg:overflow-hidden min-h-0">
          
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border/30 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/contracts')}
                className="back-button shrink-0 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                title={t('common.back')}
              >
                <ArrowLeft size={15} />
              </button>
              <h1 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <span className="font-bold text-primary truncate max-w-[150px] md:max-w-xl">{contract.title}</span>
                <span className="text-text-subtle">/</span>
                <span className="text-text-primary font-black uppercase tracking-wider text-xs">{t('contracts.contractDetailsFreelancer')}</span>
                <span className={`status-badge ${getContractStatusClass(contract.status)} ml-2 text-[9px] py-0.5 px-2`}>
                  {t('contracts.status.' + contract.status, { defaultValue: getContractStatusLabel(contract.status) })}
                </span>
              </h1>
            </div>
          </header>

          {/* Stepper Panel */}
          <div className="glass-card p-4 relative overflow-hidden text-left mb-4 shrink-0">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20" />
            <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
              {[
                { number: 1, label: t('contracts.reviewContractTerms') },
                { number: 2, label: t('contracts.esignContractDocument') },
                { number: 3, label: t('contracts.waitingEscrowFunding') },
                { number: 4, label: t('contracts.status.7') },
              ].map((step, idx) => {
                const isCompleted = currentStep > step.number;
                const isActive = currentStep === step.number;

                return (
                  <div key={step.number} className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 border shrink-0
                        ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 
                          isActive ? 'bg-teal-500 text-white border-teal-500 ring-2 ring-teal-500/15 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 
                          'bg-secondary/20 text-muted-foreground border-border/40'}`}
                      >
                        {isCompleted ? <Check size={14} /> : step.number}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-foreground font-extrabold' : 'text-muted-foreground font-semibold'}`}>
                          {step.label}
                        </span>
                      </div>
                    </div>
                    {idx < 3 && (
                      <div className={`w-8 md:w-12 h-[2px] transition-all duration-300 shrink-0
                        ${isCompleted ? 'bg-gradient-to-r from-emerald-500/40 to-emerald-500/10' : 'bg-border/30'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Layout */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
            
            {/* Main Column */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="col-span-12 lg:col-span-8 flex flex-col lg:h-full min-h-0 lg:overflow-hidden gap-6 pb-6 lg:pb-0"
            >
              <div className="flex-1 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar space-y-6">
                
                {/* STEP 1A: PendingContractDetails - Waiting for client update after change request */}
                {contract.status === ContractStatus.PendingContractDetails && (
                  <>
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <Clock size={20} className="text-amber-500" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.milestoneChangeRequestSent')}</h2>
                      </div>

                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-5 rounded-2xl text-sm font-semibold leading-relaxed flex items-start gap-3">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                          {t('contracts.waitingClientMilestoneUpdate')}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('projects.jobDetails')}</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{contract.jobTitle || contract.title}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.finalBudget')}</span>
                          <span className="text-lg font-black text-primary mt-1 block">{formatContractAmount(contract.totalBudget)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.currentMilestoneTotal')}</span>
                          <span className="text-lg font-black text-foreground mt-1 block">{formatContractAmount(milestonesTotal)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3">
                        <button
                          onClick={() => navigate('/contracts')}
                          className="px-5 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ArrowLeft size={14} />
                          {t('contracts.backToContracts')}
                        </button>
                      </div>
                    </div>

                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* STEP 1B: PendingContractConfirmation - Review & Confirm */}
                {contract.status === ContractStatus.PendingContractConfirmation && (
                  <>
                    {/* Review Banner */}
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <Shield size={20} className="text-primary" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.reviewContractTerms')}</h2>
                      </div>

                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-4 rounded-2xl text-xs font-medium leading-relaxed flex items-start gap-3">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          {t('contracts.reviewContractTermsDesc')}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          disabled={actionLoading}
                          onClick={handleConfirmDetails}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2 border-none"
                        >
                          <CheckCircle size={17} />
                          {t('contracts.confirmAcceptTerms')}
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => setShowChangeRequestModal(true)}
                          className="flex-1 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                        >
                          <Edit3 size={17} />
                          {t('contracts.requestChanges')}
                        </button>
                      </div>
                    </div>

                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* STEP 2: PendingSignature - E-Sign */}
                {contract.status === ContractStatus.PendingSignature && (
                  <>
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-teal-500/10 text-teal-500 border border-teal-500/20 rounded-full flex items-center justify-center">
                            <FileCheck size={28} />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.reviewFinalBeforeSign')}</h2>
                            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-2">
                              {t('contracts.reviewFinalBeforeSignDesc')}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-500 rounded-full text-xs font-bold uppercase tracking-wider shrink-0">
                          {hasSignedESignContract ? t('contracts.esignRecorded') : t('contracts.readyForEsign')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('projects.jobDetails')}</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{contract.jobTitle || contract.title}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.finalBudget')}</span>
                          <span className="text-lg font-black text-primary mt-1 block">{formatContractAmount(contract.totalBudget)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.currentMilestoneTotal')}</span>
                          <span className="text-lg font-black text-foreground mt-1 block">{formatContractAmount(milestonesTotal)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.startDate')}</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{formatContractDate(contract.startDate)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.endDate')}</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{formatContractDate(contract.endDate)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.parties')}</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{contract.clientName || 'Client'} / {contract.freelancerName || 'Freelancer'}</span>
                        </div>
                      </div>

                      {!milestoneTotalMatchesBudget && (
                        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-4 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-3">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <span>{t('contracts.milestoneDiffersBudget')}</span>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row gap-3">
                        <button
                          onClick={() => navigate('/contracts')}
                          className="px-5 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ArrowLeft size={14} />
                          {t('contracts.backToContracts')}
                        </button>
                        <button
                          onClick={handleScrollToReview}
                          className="px-5 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ListChecks size={14} />
                          {t('contracts.reviewMilestones')}
                        </button>
                        {!hasSignedESignContract && (
                          <button
                            disabled={actionLoading}
                            onClick={() => setShowMilestoneChangeModal(true)}
                            className="px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                          >
                            <Edit3 size={14} />
                            {t('contracts.requestMilestoneChanges')}
                          </button>
                        )}
                        <button
                          onClick={hasSignedESignContract ? handleViewESignContract : () => navigate(`/contracts/${contract.contractsId}/sign`)}
                          className={hasSignedESignContract
                            ? "px-8 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-sm font-bold text-foreground transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                            : "btn-primary-custom px-8 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"}
                        >
                          {hasSignedESignContract ? <FileText size={18} /> : <FileCheck size={18} />}
                          {hasSignedESignContract ? t('contracts.viewEsignContract') : t('contracts.proceedToEsign')}
                        </button>
                      </div>
                    </div>

                    {contract.esignContractPdfUrl && (
                      <section className="glass-card p-8 md:p-10 relative overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b border-border/50 pb-4 mb-5">
                          <FileCheck size={20} className="text-primary" />
                          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">{t('contracts.esignContractDocument')}</h2>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4 bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            <FileText size={24} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {contract.title.replace(/\s+/g, '_')}_ESign_Document.pdf
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                              {t('contracts.esignStatusLabel')}: <span className="text-amber-500 font-bold">{t('contracts.esignAwaitingSignatures')}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                            <button
                              onClick={handleDownloadPDF}
                              className="px-4 py-2 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Download size={13} />
                              {t('contracts.downloadDraftPdf')}
                            </button>
                          </div>
                        </div>
                      </section>
                    )}

                    <div ref={reviewContentRef} className="scroll-mt-6 space-y-6">
                      <div className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-foreground">{t('contracts.needMilestoneChanges')}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('contracts.needMilestoneChangesDesc')}
                          </p>
                        </div>
                        <button
                          disabled={actionLoading}
                          onClick={() => setShowMilestoneChangeModal(true)}
                          className="px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          <Edit3 size={14} />
                          {t('contracts.requestMilestoneChanges')}
                        </button>
                      </div>
                      {renderViewOnlyMilestones()}
                    </div>
                  </>
                )}

                {/* STEP 3: PendingEscrow - Waiting for client */}
                {contract.status === ContractStatus.PendingEscrow && (
                  <>
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <Lock size={20} className="text-primary" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.waitingEscrowFunding')}</h2>
                      </div>

                      <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex items-center gap-3">
                        <Clock size={22} className="shrink-0 animate-pulse" />
                        <div className="text-sm font-semibold">
                          {t('contracts.waitingEscrowFundingDesc')}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.budget')}</span>
                          <span className="text-2xl font-bold text-foreground mt-1.5 block">
                            {formatContractAmount(contract.totalBudget)}
                          </span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.escrowRequiredPercent')}</span>
                          <span className="text-2xl font-bold text-primary mt-1.5 block">
                            {formatContractAmount(contract.totalBudget * 0.8)}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1">
                            {t('contracts.escrowRequiredPercentDesc')}
                          </span>
                        </div>
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 text-xs text-emerald-600 font-semibold leading-relaxed">
                        {t('contracts.workspaceActivateNote')}
                      </div>
                    </div>

                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* STEP 4+: Active/Completed Contract */}
                {contract.status >= ContractStatus.Active && (
                  <>
                    <section className="glass-card p-8 md:p-10 relative overflow-hidden">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4 mb-6">
                        <FileText size={20} className="text-primary" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">{t('contracts.contractInfo')}</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3 flex flex-col gap-2 bg-secondary/25 border border-border/30 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('contracts.contractId')}</span>
                          <div className="flex items-center justify-between gap-3">
                            <code className="font-mono text-sm text-foreground select-all bg-card border border-border/40 px-3 py-1.5 rounded-lg truncate flex-1">
                              {contract.contractsId}
                            </code>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={handleCopyContractId}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-1.5 shadow-sm border-none
                                ${copySuccess 
                                  ? 'bg-emerald-500 text-white shadow-emerald-500/10' 
                                  : 'bg-primary text-white shadow-primary/10 hover:bg-brand-hover'
                                }`}
                            >
                              {copySuccess ? (
                                <>
                                  <Check size={13} />
                                  {t('contracts.copied')}
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  {t('contracts.copyId')}
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 bg-secondary/15 border border-border/20 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('contracts.paymentTypeLabel')}</span>
                          <span className="text-sm font-bold text-foreground mt-1">{t('contracts.fixedPrice')}</span>
                        </div>

                        <div className="flex flex-col gap-1 bg-secondary/15 border border-border/20 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Job Post ID</span>
                          <span className="text-sm font-bold text-muted-foreground mt-1 truncate">{contract.jobPostsId}</span>
                        </div>

                        {contract.createdAt && (
                          <div className="flex flex-col gap-1 bg-secondary/15 border border-border/20 rounded-2xl p-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('contracts.createdAt')}</span>
                            <span className="text-sm font-bold text-foreground mt-1">
                              {new Date(contract.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {contract.description && (
                        <div className="flex flex-col gap-3 mt-6">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('contracts.contractDescription')}</span>
                          <p className="description-text pl-4 border-l-4 border-primary/80 leading-relaxed text-sm bg-secondary/15 border-border/30 rounded-r-2xl py-4 pr-4 text-muted-foreground">
                            {contract.description}
                          </p>
                        </div>
                      )}
                    </section>

                    {renderViewOnlyTerms()}

                    {contract.esignContractPdfUrl && (
                      <section className="glass-card p-8 md:p-10 relative overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b border-border/50 pb-4 mb-5">
                          <FileCheck size={20} className="text-primary" />
                          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">{t('contracts.esignContractDocument')}</h2>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4 bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            <FileText size={24} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {contract.title.replace(/\s+/g, '_')}_ESign_Document.pdf
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                              {t('contracts.esignStatusLabel')}: <span className="text-emerald-500 font-bold">{t('contracts.esignFullySigned')}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                            <button
                              onClick={handleDownloadPDF}
                              className="px-4 py-2 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Download size={13} />
                              {t('contracts.downloadSignedPdf')}
                            </button>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Milestones Accordions */}
                    {milestones.length > 0 && (
                      <section className="glass-card p-8 md:p-10 relative">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5 mb-6">
                          <div className="flex items-center gap-2.5">
                            <ListChecks size={20} className="text-primary" />
                            <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">{t('contracts.milestoneBreakdown')} ({milestones.length})</h2>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-xs font-bold">
                              {t('contracts.milestonesPaidCount', { milestonesPaid })}
                            </span>
                            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
                              {t('contracts.milestonesApprovedCount', { milestonesApproved })}
                            </span>
                            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
                              {t('contracts.sum')}: {formatContractAmount(milestonesTotal)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          {milestones.map((milestone) => {
                            const isExpanded = expandedMilestone === milestone.id;

                            return (
                              <div
                                key={milestone.id}
                                className={`border rounded-2xl overflow-hidden transition-all duration-300
                                  ${isExpanded 
                                    ? 'border-primary/40 shadow-md bg-secondary/25' 
                                    : 'border-border/40 hover:border-primary/25 bg-secondary/15 hover:bg-secondary/20'}`}
                              >
                                <div
                                  onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                                  className="flex items-center justify-between p-5 cursor-pointer gap-4 select-none hover:bg-secondary/15 transition-colors"
                                >
                                  <div className="flex items-center gap-3.5 min-width-0 flex-1">
                                    <div className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center shrink-0 border border-border/40 text-primary">
                                      {(milestone.releasedAmount ?? 0) >= milestone.amount ? (
                                        <CheckCircle size={18} className="text-emerald-500" />
                                      ) : milestone.status === MilestoneStatus.Approved ? (
                                        <Clock size={18} className="text-primary" />
                                      ) : (
                                        <Clock size={18} className="text-amber-500" />
                                      )}
                                    </div>
                                    <div className="flex flex-col min-width-0 flex-1">
                                      <h3 className="text-sm font-bold text-foreground truncate">{milestone.title}</h3>
                                      <span className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        {t('contracts.duePrefix')}: {formatContractDate(milestone.due_date)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-sm font-bold text-foreground">{formatContractAmount(milestone.amount)}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                                      ${(milestone.releasedAmount ?? 0) >= milestone.amount ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                        milestone.status === MilestoneStatus.Approved ? 'bg-primary/10 text-primary border border-primary/20' :
                                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                      {t('contracts.milestoneStatus.' + milestone.status, { defaultValue: getMilestoneStatusLabel(milestone.status) })}
                                    </span>
                                    <ChevronDown 
                                      size={16} 
                                      className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180 text-foreground' : ''}`} 
                                    />
                                  </div>
                                </div>

                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0 }}
                                      animate={{ height: "auto" }}
                                      exit={{ height: 0 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="overflow-hidden bg-secondary/15 border-t border-border/50"
                                    >
                                      <div className="p-5 space-y-4 text-xs">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('contracts.amountTokens')}</span>
                                            <span className="font-bold text-foreground text-sm">{formatContractAmount(milestone.amount)}</span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('contracts.dueDate')}</span>
                                            <span className="font-bold text-foreground text-sm">{formatContractDate(milestone.due_date)}</span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('projects.status')}</span>
                                            <span className="font-bold text-foreground text-sm">{t('contracts.milestoneStatus.' + milestone.status, { defaultValue: getMilestoneStatusLabel(milestone.status) })}</span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('contracts.paidPrefix')}</span>
                                            <span className="font-bold text-foreground text-sm">
                                              {milestone.paid_at ? new Date(milestone.paid_at).toLocaleString() : 'N/A'}
                                            </span>
                                          </div>
                                        </div>

                                        {(milestone.description || milestone.deliverables || milestone.acceptanceCriteria) && <div className="grid gap-3 rounded-xl border border-border/40 bg-card/60 p-4 md:grid-cols-2">
                                          {milestone.description && <div className="md:col-span-2"><strong className="text-[10px] uppercase text-muted-foreground">Scope</strong><p className="mt-1 whitespace-pre-wrap text-foreground">{milestone.description}</p></div>}
                                          {milestone.deliverables && <div><strong className="text-[10px] uppercase text-muted-foreground">Deliverables</strong><p className="mt-1 whitespace-pre-wrap text-foreground">{milestone.deliverables}</p></div>}
                                          {milestone.acceptanceCriteria && <div><strong className="text-[10px] uppercase text-muted-foreground">Acceptance criteria</strong><p className="mt-1 whitespace-pre-wrap text-foreground">{milestone.acceptanceCriteria}</p></div>}
                                        </div>}

                                        <div className="space-y-2">
                                          <strong className="text-[10px] uppercase tracking-wider text-muted-foreground">Work Breakdown Structure</strong>
                                          {(milestone.workItems || []).map((workItem, workIndex) => <div key={workItem.workItemId} className="rounded-lg border border-border/40 bg-card/60 p-3">
                                            <div className="flex justify-between gap-2"><strong>{workIndex + 1}. {workItem.title}</strong><span className="text-muted-foreground">{workItem.estimatedDuration}</span></div>
                                            {workItem.description && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{workItem.description}</p>}
                                            {workItem.deliverables && <p className="mt-1"><strong>Deliverables:</strong> {workItem.deliverables}</p>}
                                          </div>)}
                                        </div>

                                        {/* Submit deliverables CTA for active milestones */}
                                        {milestone.status === MilestoneStatus.InProgress && (milestone.workItems || []).every(item => Number(item.status) === 2) && (
                                          <div className="pt-2">
                                            <button
                                              onClick={() => navigate(`/milestones/${milestone.id}/submit`)}
                                              className="btn-primary-custom px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                                            >
                                              <FileCheck size={13} />
                                              {t('contracts.submitDeliverables')}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* Audit Trail Timeline */}
                    <section className="glass-card p-8 md:p-10 relative">
                      <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-5 gap-4">
                        <div className="flex items-center gap-2.5">
                          <Clock size={20} className="text-primary" />
                          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">{t('contracts.auditTrailHistory')}</h2>
                        </div>
                        <button
                          onClick={() => setShowAuditTrail(!showAuditTrail)}
                          className="px-4 py-2 bg-secondary/40 hover:bg-secondary/70 border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm"
                        >
                          {showAuditTrail ? t('contracts.hideHistory') : t('contracts.showHistory')}
                        </button>
                      </div>

                      <AnimatePresence>
                        {showAuditTrail && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            {auditTrail.length > 0 ? (
                              <div className="relative pl-6 border-l border-border/60 ml-3 py-2 space-y-8">
                                {auditTrail.map((entry) => (
                                  <div key={entry.id} className="relative group">
                                    <div className="w-2.5 h-2.5 bg-primary rounded-full border border-card absolute -left-[29.5px] top-1.5 ring-4 ring-primary/10 group-hover:scale-125 group-hover:ring-primary/25 transition-all duration-300" />

                                    <div className="bg-secondary/25 border border-border/30 rounded-2xl p-5 hover:border-primary/20 transition-all duration-300">
                                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                        <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">{entry.action}</h4>
                                        <span className="text-[10px] text-muted-foreground font-semibold">
                                          {new Date(entry.timestamp).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                                        <User size={13} />
                                        <span>{entry.performedBy}</span>
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 text-[9px] font-black uppercase tracking-wider ml-1">
                                          {entry.performedByRole}
                                        </span>
                                      </div>
                                      {entry.details && <p className="text-xs text-muted-foreground leading-relaxed">{entry.details}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-center py-6 text-sm">{t('contracts.noAuditHistory')}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  </>
                )}
              </div>
            </motion.div>

            {/* Sidebar Column */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="col-span-12 lg:col-span-4 flex flex-col gap-4 lg:h-full min-h-0 lg:overflow-y-auto pb-6 lg:pb-0 shrink-0"
            >
              {/* Summary Panel */}
              <div className="glass-card p-5 flex flex-col gap-4 text-left">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest border-b border-border/20 pb-2 font-zentry">
                  {t('contracts.contractSummary')}
                </h3>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-teal-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.budget')}</span>
                      <span className="text-base font-black text-foreground mt-0.5 block">{formatContractAmount(contract.totalBudget)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                      <GigCoinLogo size={15} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-purple-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.startDate')}</span>
                      <span className="text-sm font-black text-foreground mt-0.5 block">{formatContractDate(contract.startDate)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <Calendar size={15} />
                    </div>
                  </div>

                  {contract.endDate && (
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-cyan-500/20 transition-all">
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.endDate')}</span>
                        <span className="text-sm font-black text-foreground mt-0.5 block">{formatContractDate(contract.endDate)}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                        <Calendar size={15} />
                      </div>
                    </div>
                  )}

                  {contract.status >= ContractStatus.Active && (
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-emerald-500/20 transition-all">
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.milestonesStatus')}</span>
                        <span className="text-sm font-black text-foreground mt-0.5 block">
                          {t('contracts.milestonesPaidCount', { milestonesPaid })} / {t('contracts.milestonesApprovedCount', { milestonesApproved })}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle size={15} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Quick Actions Panel */}
              <div className="glass-card p-6">
                <h2 className="text-base font-bold text-foreground uppercase tracking-tight mb-5 font-zentry">{t('contracts.quickActions')}</h2>
                <div className="flex flex-col gap-3">
                  {contract.status === ContractStatus.PendingContractDetails && (
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/contracts')}
                      className="w-full py-3 bg-secondary/50 hover:bg-secondary border border-border/60 rounded-xl font-bold text-sm text-foreground cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={17} />
                      {t('contracts.backToContracts')}
                    </motion.button>
                  )}

                  {/* Submit deliverables for active contracts */}
                  {contract.status === ContractStatus.Active && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/workspace/${contract.contractsId}`)} 
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm cursor-pointer shadow flex items-center justify-center gap-2 border-none"
                    >
                      <ListChecks size={18} />
                      {t('contracts.reviewMilestones')}
                    </motion.button>
                  )}

                  {/* Review terms action in PendingContractConfirmation */}
                  {contract.status === ContractStatus.PendingSignature && hasSignedESignContract && (
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleViewESignContract}
                      className="w-full py-3 bg-secondary/50 hover:bg-secondary border border-border/60 rounded-xl font-bold text-sm text-foreground cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={17} />
                      {t('contracts.viewEsignContract')}
                    </motion.button>
                  )}

                  {(contract.status === ContractStatus.PendingContractConfirmation ||
                    (contract.status === ContractStatus.PendingSignature && !hasSignedESignContract)) && (
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowMilestoneChangeModal(true)}
                      className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 size={17} />
                      {t('contracts.requestMilestoneChanges')}
                    </motion.button>
                  )}

                  {contract.esignContractPdfUrl && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDownloadPDF} 
                      className="w-full py-3 bg-secondary/50 hover:bg-secondary border border-border/60 rounded-xl font-bold text-sm text-foreground cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={17} />
                      {t('contracts.downloadPdf')}
                    </motion.button>
                  )}

                  {contract.canReview && (
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/reviews/create?contractId=${contract.contractsId}`)}
                      className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Star size={17} />
                      {t('contracts.leaveReview')}
                    </motion.button>
                  )}

                  {!isAdminOverride && activeDisputeLoading && (
                    <div className="w-full py-3 border border-border/50 rounded-xl text-muted-foreground text-sm font-semibold flex items-center justify-center gap-2">
                      <LoaderCircle size={17} className="animate-spin" />
                      {t('contracts.checkingDispute', { defaultValue: 'Checking dispute status…' })}
                    </div>
                  )}

                  {!isAdminOverride && !activeDisputeLoading && activeDisputeError && (
                    <div className="w-full p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl text-sm font-semibold">
                      <p className="m-0 mb-2">{activeDisputeError}</p>
                      <button onClick={onRetryDispute} className="w-full py-2 border border-red-500/30 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                        <RefreshCw size={15} /> {t('common.retry', { defaultValue: 'Retry' })}
                      </button>
                    </div>
                  )}

                  {!isAdminOverride && !activeDisputeLoading && !activeDisputeError && activeDispute && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/contracts/${contract.contractsId}/disputes/${activeDispute.id}`)}
                      className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldAlert size={17} />
                      {t('contracts.viewDispute', { defaultValue: 'View Dispute Case' })}
                    </motion.button>
                  )}

                </div>
              </div>

              {/* Parties Info Panel */}
              <div className="glass-card p-6">
                <h2 className="text-base font-bold text-foreground uppercase tracking-tight mb-5 font-zentry">{t('contracts.contractParties')}</h2>
                <div className="flex flex-col gap-6">
                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">{t('contracts.client')}</span>
                    <div className="bg-secondary/25 border border-border/30 rounded-2xl p-4 flex items-start gap-3.5 profile-avatar-halo">
                      <img
                        src={clientAvatar}
                        alt={clientName}
                        className="w-12 h-12 rounded-full border border-card shadow object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(clientName)}`;
                        }}
                      />
                      <div className="flex-1 min-width-0 space-y-1">
                        <h4 className="text-sm font-bold text-foreground truncate">{clientName}</h4>
                        {clientCompany && (
                          <p className="text-[11px] text-muted-foreground font-semibold truncate">{clientCompany}</p>
                        )}
                        {clientEmail ? (
                          <a
                            href={`mailto:${clientEmail}`}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold truncate max-w-full"
                          >
                            <Mail size={11} />
                            {clientEmail}
                          </a>
                        ) : (
                          <p className="text-[10px] text-muted-foreground font-semibold">{t('contracts.emailNotAvailable')}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">{t('contracts.freelancerYou')}</span>
                    <div className="bg-secondary/25 border border-border/30 rounded-2xl p-4 flex items-start gap-3.5 profile-avatar-halo">
                      <img
                        src={freelancerAvatar}
                        alt={freelancerName}
                        className="w-12 h-12 rounded-full border border-card shadow object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(freelancerName)}`;
                        }}
                      />
                      <div className="flex-1 min-width-0 space-y-1">
                        <h4 className="text-sm font-bold text-foreground truncate">{freelancerName}</h4>
                        {freelancerHeadline && (
                          <p className="text-[11px] text-muted-foreground leading-snug font-medium line-clamp-2">{freelancerHeadline}</p>
                        )}
                        {freelancerEmail ? (
                          <a
                            href={`mailto:${freelancerEmail}`}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold truncate max-w-full"
                          >
                            <Mail size={11} />
                            {freelancerEmail}
                          </a>
                        ) : (
                          <p className="text-[10px] text-muted-foreground font-semibold">{t('contracts.emailNotAvailable')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Change Request Modal (Terms) */}
      <AnimatePresence>
        {showChangeRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border/50 rounded-3xl p-8 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight font-zentry">{t('contracts.requestContractChanges')}</h3>
                <button
                  onClick={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground cursor-pointer border-none"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {t('contracts.requestContractChangesDesc')}
              </p>

              <textarea
                value={changeRequestReason}
                onChange={(e) => setChangeRequestReason(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                placeholder="e.g., Please clarify the scope in milestone 2, update payment terms to net-30..."
              />

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); }}
                  className="px-5 py-2.5 bg-secondary/50 hover:bg-secondary border border-border/60 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('contracts.cancel')}
                </button>
                <button
                  disabled={actionLoading || !changeRequestReason.trim()}
                  onClick={handleRequestChange}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {t('contracts.submitChangeRequest')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone Change Request Modal */}
      <AnimatePresence>
        {showMilestoneChangeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border/50 rounded-3xl p-8 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight font-zentry">{t('contracts.requestMilestoneChanges')}</h3>
                <button
                  onClick={() => { setShowMilestoneChangeModal(false); setMilestoneChangeReason(''); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground cursor-pointer border-none"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {t('contracts.requestMilestoneChangesDesc')}
              </p>

              <textarea
                value={milestoneChangeReason}
                onChange={(e) => setMilestoneChangeReason(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                placeholder="e.g., Milestone 1 needs more time, milestone 3 budget is too low..."
              />

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => { setShowMilestoneChangeModal(false); setMilestoneChangeReason(''); }}
                  className="px-5 py-2.5 bg-secondary/50 hover:bg-secondary border border-border/60 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('contracts.cancel')}
                </button>
                <button
                  disabled={actionLoading || !milestoneChangeReason.trim()}
                  onClick={handleRequestMilestoneChange}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {t('contracts.submitChangeRequest')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isAdminOverride && <ContractChangeControlPanel contractId={contract.contractsId} contractStatus={contract.status} role="freelancer" milestones={milestones} onApplied={onRefresh} />}
    </AppLayout>
  );
}
