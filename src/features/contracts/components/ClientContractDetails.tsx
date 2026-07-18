import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, CheckCircle, Clock,
  User, FileText, Calendar, Download, ArrowLeft,
  Mail, ShieldAlert, ListChecks, Copy, Check, ChevronDown, Star, LoaderCircle, RefreshCw
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { ContractStatus, MilestoneStatus, type Milestone } from '../../../types/models/Contract';
import { ESignerRole, ESignDocumentStatus, SignatureStatus } from '../../../types/models/ESign';
import {
  getContractStatusLabel,
  getContractStatusClass,
  formatContractAmount,
  formatContractDate,
  getMilestoneStatusLabel,
  getMilestoneStatusClass
} from '../../../shared/utils/contractUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/view-contract-details-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import type { Dispute } from '../../../types/models/Dispute';

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
  onRetryDispute
}: ClientContractDetailsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // States
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isFullySignedPendingEscrow, setIsFullySignedPendingEscrow] = useState(false);
  const [hasClientSignedContract, setHasClientSignedContract] = useState(false);
  const [showEscrowSuccess, setShowEscrowSuccess] = useState(false);

  // Form states (pre-populated from props)
  const [scopeOfWork, setScopeOfWork] = useState(contract.scopeOfWork || '');
  const [paymentTerms, setPaymentTerms] = useState(contract.paymentTerms || '');
  const [intellectualPropertyTerms, setIntellectualPropertyTerms] = useState(contract.intellectualPropertyTerms || '');
  const [confidentialityTerms, setConfidentialityTerms] = useState(contract.confidentialityTerms || '');
  const [cancellationTerms, setCancellationTerms] = useState(contract.cancellationTerms || '');
  const [disputeTerms, setDisputeTerms] = useState(contract.disputeTerms || '');
  const [formMilestones, setFormMilestones] = useState<any[]>(
    milestones.map(m => ({
      milestoneId: m.id,
      title: m.title,
      amount: m.amount,
      dueDate: m.due_date ? m.due_date.substring(0, 10) : '',
    }))
  );

  // Sync state if contract/milestones props update
  useEffect(() => {
    setScopeOfWork(contract.scopeOfWork || '');
    setPaymentTerms(contract.paymentTerms || '');
    setIntellectualPropertyTerms(contract.intellectualPropertyTerms || '');
    setConfidentialityTerms(contract.confidentialityTerms || '');
    setCancellationTerms(contract.cancellationTerms || '');
    setDisputeTerms(contract.disputeTerms || '');
    setFormMilestones(
      milestones.map(m => ({
        milestoneId: m.id,
        title: m.title,
        amount: m.amount,
        dueDate: m.due_date ? m.due_date.substring(0, 10) : '',
      }))
    );
  }, [contract, milestones]);

  useEffect(() => {
    let isCancelled = false;

    const loadESignStatus = async (): Promise<void> => {
      if (!contract?.contractsId || contract.status !== ContractStatus.PendingSignature) {
        setIsFullySignedPendingEscrow(false);
        setHasClientSignedContract(false);
        return;
      }

      try {
        const response = await esignGetAPI.getDocumentByContract(contract.contractsId);
        if (isCancelled) {
          return;
        }

        const contractDocument = response.success ? response.data : null;
        const isContractFullySigned = contractDocument?.status === ESignDocumentStatus.FullySigned;
        const hasClientContractSignature = Boolean(
          contractDocument?.signatures.some(
            signature =>
              signature.signerRole === ESignerRole.Client &&
              signature.status === SignatureStatus.Signed
          )
        );
        const hasFreelancerContractSignature = Boolean(
          contractDocument?.signatures.some(
            signature =>
              signature.signerRole === ESignerRole.Freelancer &&
              signature.status === SignatureStatus.Signed
          )
        );

        let isClientJobPostSigned = false;
        const jobPostId = String(contract.jobPostsId || contract.jobPostId || '');
        if (!isContractFullySigned && !hasClientContractSignature && jobPostId) {
          try {
            const jobPostDocumentResponse = await esignGetAPI.getDocumentByJob(jobPostId);
            if (isCancelled) {
              return;
            }

            isClientJobPostSigned = Boolean(
              jobPostDocumentResponse.success &&
              jobPostDocumentResponse.data?.status === ESignDocumentStatus.FullySigned
            );
          } catch (error) {
            isClientJobPostSigned = false;
          }
        }

        const hasClientSignature = hasClientContractSignature || isClientJobPostSigned;
        setHasClientSignedContract(hasClientSignature);
        setIsFullySignedPendingEscrow(
          isContractFullySigned || (hasFreelancerContractSignature && hasClientSignature)
        );
      } catch (error) {
        if (!isCancelled) {
          setIsFullySignedPendingEscrow(false);
          setHasClientSignedContract(false);
        }
      }
    };

    void loadESignStatus();

    return () => {
      isCancelled = true;
    };
  }, [contract?.contractsId, contract?.jobPostId, contract?.jobPostsId, contract.status]);

  const effectiveStatus =
    contract.status === ContractStatus.PendingSignature && isFullySignedPendingEscrow
      ? ContractStatus.PendingEscrow
      : contract.status;
  const escrowFundingAmount = Number(contract.totalBudget || 0);

  // Fetch Wallet Balance if in PendingEscrow status
  useEffect(() => {
    if (effectiveStatus === ContractStatus.PendingEscrow) {
      walletGetAPI.getMyWallet().then(res => {
        if (res.success && res.data) {
          setWalletBalance(res.data.availableTokens);
        }
      });
    } else {
      setWalletBalance(null);
    }
  }, [effectiveStatus]);

  const milestonesTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
  const milestonesApproved = milestones.filter(m => m.status === MilestoneStatus.Approved).length;
  const milestonesPaid = milestones.filter(m => (m.releasedAmount ?? 0) >= m.amount).length;

  // Stepper: Terms Setup -> Review & Confirm -> Escrow Funding
  // (Client already e-signed during job post session — no separate signature step)
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

  // Handlers
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

  const handleAddMilestone = () => {
    setFormMilestones([
      ...formMilestones,
      {
        milestoneId: null,
        title: `Milestone ${formMilestones.length + 1}`,
        amount: 0,
        dueDate: '',
      }
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    setFormMilestones(formMilestones.filter((_, idx) => idx !== index));
  };

  const handleMilestoneChange = (index: number, field: string, value: any) => {
    const updated = [...formMilestones];
    updated[index] = { ...updated[index], [field]: value };
    setFormMilestones(updated);
  };

  const handleSaveDetails = async (isSubmit: boolean) => {
    setActionLoading(true);
    try {
      const payload = {
        scopeOfWork,
        paymentTerms,
        intellectualPropertyTerms,
        confidentialityTerms,
        cancellationTerms,
        disputeTerms,
        milestones: formMilestones.map((m, idx) => ({
          milestoneId: m.milestoneId || null,
          title: m.title,
          amount: Number(m.amount),
          dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null,
          sortOrder: idx + 1,
        })),
      };

      const updateRes = await contractPutAPI.updateDetails(contract.contractsId, payload);
      if (!updateRes.success) {
        alert(updateRes.message || 'Failed to save details');
        return;
      }

      if (isSubmit) {
        const totalMilestonesSum = formMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
        if (totalMilestonesSum !== contract?.totalBudget) {
          alert(`Total milestone amounts (${formatContractAmount(totalMilestonesSum)}) must equal the contract budget (${formatContractAmount(contract?.totalBudget || 0)}).`);
          return;
        }

        const submitRes = await contractPostAPI.submitDetails(contract.contractsId);
        if (submitRes.success) {
          alert('Contract details submitted to freelancer!');
          navigate('/jobs/my-jobs');
        } else {
          alert(submitRes.message || 'Failed to submit details');
        }
      } else {
        alert('Draft contract details saved successfully!');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFundEscrow = async () => {
    setActionLoading(true);
    try {
      const res = await contractPostAPI.fundEscrow(contract.contractsId);
      if (res.success) {
        setShowEscrowSuccess(true);
        onRefresh();
      } else {
        alert(res.message || 'Failed to fund escrow.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while funding escrow.');
    } finally {
      setActionLoading(false);
    }
  };

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
          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-black font-zentry">{t('contracts.milestoneBreakdown')} ({milestones.length})</h2>
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
                title="Back to Contracts"
              >
                <ArrowLeft size={15} />
              </button>
              <h1 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <span className="font-bold text-primary truncate max-w-[150px] md:max-w-xl">{contract.title}</span>
                <span className="text-text-subtle">/</span>
                <span className="text-text-primary font-black uppercase tracking-wider text-xs">{t('contracts.contractDetailsClient')}</span>
                <span className={`status-badge ${getContractStatusClass(effectiveStatus)} ml-2 text-[9px] py-0.5 px-2`}>
                  {t('contracts.status.' + effectiveStatus, { defaultValue: getContractStatusLabel(effectiveStatus) })}
                </span>
              </h1>
            </div>
          </header>

          {/* Stepper Panel */}
          <div className="glass-card p-4 relative overflow-hidden text-left mb-4 shrink-0">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20" />
            <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
              {[
                { number: 1, label: t('contracts.defineMilestonesTerms') },
                { number: 2, label: t('contracts.freelancerReview') },
                { number: 3, label: t('contracts.secureProjectEscrow') },
              ].map((step, idx) => {
                const isCompleted = currentStep > step.number;
                const isActive = currentStep === step.number;

                return (
                  <div key={step.number} className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 border shrink-0
                        ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 
                          isActive ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-500/15 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 
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
                    {idx < 2 && (
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
                
                {/* 1. Setup terms step */}
                {contract.status === ContractStatus.PendingContractDetails && (
                  <>
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <FileText size={20} className="text-primary" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.defineMilestonesTerms')}</h2>
                      </div>
                      
                      <div className="bg-primary/10 text-primary border border-primary/20 p-4 rounded-2xl text-xs font-medium leading-relaxed">
                        {t('contracts.defineMilestonesTermsDesc')}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('contracts.scopeOfWork')}</label>
                          <textarea
                            value={scopeOfWork}
                            onChange={(e) => setScopeOfWork(e.target.value)}
                            className="w-full h-32 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                            placeholder={t('contracts.detailedScopePlaceholder')}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('contracts.paymentTerms')}</label>
                            <textarea
                              value={paymentTerms}
                              onChange={(e) => setPaymentTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder={t('contracts.paymentTermsPlaceholder')}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('contracts.intellectualProperty')}</label>
                            <textarea
                              value={intellectualPropertyTerms}
                              onChange={(e) => setIntellectualPropertyTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder={t('contracts.ipTermsPlaceholder')}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('contracts.confidentiality')}</label>
                            <textarea
                              value={confidentialityTerms}
                              onChange={(e) => setConfidentialityTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder={t('contracts.ndaTermsPlaceholder')}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('contracts.cancellationPolicy')}</label>
                            <textarea
                              value={cancellationTerms}
                              onChange={(e) => setCancellationTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder={t('contracts.cancellationTermsPlaceholder')}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('contracts.disputeResolution')}</label>
                          <textarea
                            value={disputeTerms}
                            onChange={(e) => setDisputeTerms(e.target.value)}
                            className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                            placeholder={t('contracts.disputeTermsPlaceholder')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Milestones schedule form */}
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2.5">
                          <ListChecks size={20} className="text-primary" />
                          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.milestonesSchedule')}</h2>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 border rounded-full text-xs font-bold transition-all duration-300
                            ${formMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0) === contract.totalBudget
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                              : 'bg-destructive/10 border-destructive/25 text-destructive animate-pulse'
                            }`}
                          >
                            {t('contracts.sum')}: {formatContractAmount(formMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0))} / {formatContractAmount(contract.totalBudget)}
                          </span>
                          <button
                            onClick={handleAddMilestone}
                            type="button"
                            className="btn-primary-custom px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            {t('contracts.addMilestone')}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {formMilestones.map((milestone, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row items-stretch gap-4 bg-secondary/15 border border-border/25 rounded-2xl p-4">
                            <div className="flex-1">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">{t('projects.title')}</label>
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                                className="w-full px-3 py-2 bg-card border border-border/30 rounded-xl text-xs text-foreground outline-none focus:border-blue-500 transition-all font-semibold"
                                placeholder={t('contracts.milestoneTitlePlaceholder')}
                              />
                            </div>
                            <div className="w-full md:w-44">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">{t('contracts.amountTokens')}</label>
                              <input
                                type="number"
                                value={milestone.amount}
                                onChange={(e) => handleMilestoneChange(idx, 'amount', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-card border border-border/30 rounded-xl text-xs text-foreground outline-none focus:border-blue-500 transition-all font-semibold"
                                placeholder="0"
                              />
                            </div>
                            <div className="w-full md:w-44">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">{t('contracts.dueDate')}</label>
                              <input
                                type="date"
                                value={milestone.dueDate}
                                onChange={(e) => handleMilestoneChange(idx, 'dueDate', e.target.value)}
                                className="w-full px-3 py-2 bg-card border border-border/30 rounded-xl text-xs text-foreground outline-none focus:border-blue-500 transition-all font-semibold"
                              />
                            </div>
                            <div className="flex items-end justify-end">
                              <button
                                onClick={() => handleRemoveMilestone(idx)}
                                type="button"
                                className="p-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-xl transition-all cursor-pointer font-bold"
                              >
                                {t('contracts.delete')}
                              </button>
                            </div>
                          </div>
                        ))}

                        {formMilestones.length === 0 && (
                          <p className="text-muted-foreground text-center py-6 text-sm italic">{t('contracts.noMilestonesDefined')}</p>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 border-t border-border/50 pt-5">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSaveDetails(false)}
                          className="px-5 py-2.5 bg-secondary/50 hover:bg-secondary border border-border/60 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          {t('contracts.saveDraftDetails')}
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSaveDetails(true)}
                          className="btn-primary-custom px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          {t('contracts.submitToFreelancer')}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Review and Confirm step (waiting for freelancer) */}
                {contract.status === ContractStatus.PendingContractConfirmation && (
                  <>
                    <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex items-center gap-3">
                      <Clock size={20} className="shrink-0 animate-pulse" />
                      <div className="text-sm font-semibold">
                        {t('contracts.waitingFreelancerReview')}
                      </div>
                    </div>
                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* PendingSignature: each party signs the contract before escrow funding. */}
                {effectiveStatus === ContractStatus.PendingSignature && (
                  <>
                    <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center gap-4">
                      <Clock size={20} className={hasClientSignedContract ? "shrink-0 animate-pulse" : "shrink-0"} />
                      <div className="flex-1 text-sm font-semibold">
                        {hasClientSignedContract
                          ? t('contracts.waitingFreelancerSign')
                          : t('contracts.readyForEsign')}
                      </div>
                      {!hasClientSignedContract && (
                        <button
                          onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)}
                          className="btn-primary-custom px-6 py-3 rounded-xl text-sm font-bold cursor-pointer inline-flex items-center justify-center gap-2"
                        >
                          <FileText size={18} />
                          {t('contracts.proceedToEsign')}
                        </button>
                      )}
                    </div>
                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* 4. Escrow Funding Step */}
                {effectiveStatus === ContractStatus.PendingEscrow && (
                  <>
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <Lock size={20} className="text-primary" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">{t('contracts.secureContractEscrow')}</h2>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('contracts.escrowFundingDesc')}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.budget')}</span>
                          <span className="text-2xl font-bold text-foreground mt-1.5 block">
                            {formatContractAmount(contract.totalBudget)}
                          </span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.requiredEscrow')}</span>
                          <span className="text-2xl font-bold text-primary mt-1.5 block">
                            {formatContractAmount(escrowFundingAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-secondary/10 border border-border/20 rounded-2xl">
                        <div>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{t('contracts.yourWalletBalance')}</span>
                          <span className="text-xl font-bold text-foreground mt-1 block">
                            {walletBalance !== null ? `${walletBalance} G-coin` : 'Loading...'}
                          </span>
                        </div>
                        
                        {walletBalance !== null && walletBalance < escrowFundingAmount && (
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-destructive block mb-1">
                              {t('contracts.shortOf', { amount: escrowFundingAmount - walletBalance })}
                            </span>
                          </div>
                        )}
                      </div>

                      {walletBalance !== null && walletBalance < escrowFundingAmount ? (
                        <div className="space-y-4">
                          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-2xl text-xs font-medium">
                            {t('contracts.insufficientTokensDesc')}
                          </div>
                          <button
                            onClick={() => navigate('/wallet/deposit')}
                            className="btn-primary-custom w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                          >
                            <GigCoinLogo size={17} />
                            {t('contracts.topUpWallet')}
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={actionLoading || walletBalance === null}
                          onClick={handleFundEscrow}
                          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2 border-none"
                        >
                          <Lock size={17} />
                          {t('contracts.fundEscrowNow')}
                        </button>
                      )}
                    </div>
                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* 5. Active Contract / Complete View */}
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
                          <span className="text-sm font-bold text-foreground mt-1">
                            {t('contracts.fixedPrice')}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 bg-secondary/15 border border-border/20 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Job Post ID</span>
                          <span className="text-sm font-bold text-muted-foreground mt-1 truncate">
                            {contract.jobPostsId}
                          </span>
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
                            const statusClass = getMilestoneStatusClass(milestone.status);

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
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusClass.replace('milestone-status ', '')} 
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
                                      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
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
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-blue-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.budget')}</span>
                      <span className="text-base font-black text-foreground mt-0.5 block">{formatContractAmount(contract.totalBudget)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
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
                </div>
              </div>
              
              {/* Quick Actions Panel */}
              <div className="glass-card p-6">
                <h2 className="text-base font-bold text-foreground uppercase tracking-tight mb-5 font-zentry">{t('contracts.quickActions')}</h2>
                <div className="flex flex-col gap-3">
                  <motion.button 
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/workspace/${contract.contractsId}`)} 
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm cursor-pointer shadow flex items-center justify-center gap-2 border-none"
                  >
                    <ListChecks size={18} />
                    {t('contracts.manageMilestones')}
                  </motion.button>

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
                <div className="flex flex-col gap-6">
                  {contract.clientProfile && (
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">{t('contracts.clientYou')}</span>
                      <div className="bg-secondary/25 border border-border/30 rounded-2xl p-4 flex items-start gap-3.5 profile-avatar-halo">
                        <img
                          src={contract.clientProfile.profileImageUrl || '/img/avatar-fallback.png'}
                          alt={contract.clientProfile.fullName}
                          className="w-12 h-12 rounded-full border border-card shadow object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + (contract.clientProfile?.fullName || 'Client');
                          }}
                        />
                        <div className="flex-1 min-width-0 space-y-1">
                          <h4 className="text-sm font-bold text-foreground truncate">{contract.clientProfile.fullName}</h4>
                          {contract.clientProfile.companyName && (
                            <p className="text-[11px] text-muted-foreground font-semibold truncate">{contract.clientProfile.companyName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {contract.freelancerProfile && (
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">{t('contracts.freelancer')}</span>
                      <div className="bg-secondary/25 border border-border/30 rounded-2xl p-4 flex items-start gap-3.5 profile-avatar-halo">
                        <img
                          src={contract.freelancerProfile.profileImageUrl || '/img/avatar-fallback.png'}
                          alt={contract.freelancerProfile.fullName}
                          className="w-12 h-12 rounded-full border border-card shadow object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + (contract.freelancerProfile?.fullName || 'Freelancer');
                          }}
                        />
                        <div className="flex-1 min-width-0 space-y-1">
                          <h4 className="text-sm font-bold text-foreground truncate">{contract.freelancerProfile.fullName}</h4>
                          {contract.freelancerProfile.headline && (
                            <p className="text-[11px] text-muted-foreground leading-snug font-medium line-clamp-2">{contract.freelancerProfile.headline}</p>
                          )}
                          {contract.freelancerProfile.email && (
                            <a 
                              href={`mailto:${contract.freelancerProfile.email}`} 
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold truncate max-w-full"
                            >
                              <Mail size={11} />
                              {contract.freelancerProfile.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEscrowSuccess && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="escrow-success-title"
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-emerald-500/25 bg-card p-7 text-center shadow-2xl"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <CheckCircle size={30} />
              </div>
              <h2 id="escrow-success-title" className="text-xl font-bold text-foreground">
                {t('contracts.escrowFundedTitle', { defaultValue: 'Escrow funded successfully' })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t('contracts.escrowFundedMessage', { defaultValue: 'The project funds are secured and your workspace is ready.' })}
              </p>
              <div className="mt-5 rounded-xl border border-border/40 bg-secondary/20 p-4">
                <span className="block text-[10px] font-black uppercase text-muted-foreground">{t('contracts.fundedAmount', { defaultValue: 'Funded amount' })}</span>
                <span className="mt-1 block text-2xl font-bold text-emerald-500">{formatContractAmount(escrowFundingAmount)}</span>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowEscrowSuccess(false)}
                  className="flex-1 rounded-xl border border-border/50 bg-secondary/50 px-5 py-3 text-sm font-bold text-foreground cursor-pointer"
                >
                  {t('common.close', { defaultValue: 'Close' })}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/workspace/${contract.contractsId}`)}
                  className="btn-primary-custom flex-1 rounded-xl px-5 py-3 text-sm font-bold cursor-pointer"
                >
                  {t('proposals.goToWorkspace', { defaultValue: 'Go to Workspace' })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
