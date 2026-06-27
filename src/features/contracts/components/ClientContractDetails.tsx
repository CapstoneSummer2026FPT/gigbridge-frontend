import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, CheckCircle, Clock,
  User, FileText, Calendar, Download, ArrowLeft,
  Mail, ShieldAlert, ListChecks, Copy, Check, ChevronDown, Star
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
import '../styles/view-contract-details-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';

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
}

export function ClientContractDetails({
  contract,
  milestones,
  auditTrail,
  onRefresh,
  isAdminOverride = false
}: ClientContractDetailsProps) {
  const navigate = useNavigate();

  // States
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isFullySignedPendingEscrow, setIsFullySignedPendingEscrow] = useState(false);

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
        return;
      }

      try {
        const response = await esignGetAPI.getDocumentByContract(contract.contractsId);
        if (isCancelled) {
          return;
        }

        const contractDocument = response.success ? response.data : null;
        const isContractFullySigned = contractDocument?.status === ESignDocumentStatus.FullySigned;
        const hasFreelancerContractSignature = Boolean(
          contractDocument?.signatures.some(
            signature =>
              signature.signerRole === ESignerRole.Freelancer &&
              signature.status === SignatureStatus.Signed
          )
        );

        let isClientJobPostSigned = false;
        const jobPostId = String(contract.jobPostsId || contract.jobPostId || '');
        if (!isContractFullySigned && hasFreelancerContractSignature && jobPostId) {
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

        setIsFullySignedPendingEscrow(
          isContractFullySigned || (hasFreelancerContractSignature && isClientJobPostSigned)
        );
      } catch (error) {
        if (!isCancelled) {
          setIsFullySignedPendingEscrow(false);
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
  const milestonesPaid = milestones.filter(m => m.status === MilestoneStatus.PaymentConfirmed).length;

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
        alert('Escrow funded successfully! Workspace is now open.');
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
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Contract Terms & Clauses</h2>
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Scope of Work</span>
          <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
            {contract?.scopeOfWork || 'No scope of work defined yet.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Payment Terms</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.paymentTerms || 'No payment terms defined yet.'}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Intellectual Property</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.intellectualPropertyTerms || 'No intellectual property terms defined yet.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Confidentiality (NDA)</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.confidentialityTerms || 'No confidentiality clauses defined yet.'}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Cancellation Policy</span>
            <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
              {contract?.cancellationTerms || 'No cancellation policy defined yet.'}
            </p>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Dispute Resolution</span>
          <p className="pl-4 border-l-2 border-primary/60 leading-relaxed text-sm text-foreground bg-secondary/10 py-3 pr-3 rounded-r-xl whitespace-pre-wrap">
            {contract?.disputeTerms || 'No dispute resolution terms defined yet.'}
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
          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-black font-zentry">Milestones ({milestones.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
            Total: {formatContractAmount(milestonesTotal)}
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
                  Due: {formatContractDate(milestone.due_date)}
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
                <span className="text-text-primary font-black uppercase tracking-wider text-xs">Contract Details (Client)</span>
                <span className={`status-badge ${getContractStatusClass(contract.status)} ml-2 text-[9px] py-0.5 px-2`}>
                  {getContractStatusLabel(contract.status)}
                </span>
              </h1>
            </div>
          </header>

          {/* Stepper Panel */}
          <div className="glass-card p-4 relative overflow-hidden text-left mb-4 shrink-0">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20" />
            <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
              {[
                { number: 1, label: 'Terms Setup', desc: 'Define milestones & terms' },
                { number: 2, label: 'Review & Confirm', desc: 'Freelancer review' },
                { number: 3, label: 'Escrow Funding', desc: 'Secure project escrow' },
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
                        <span className="text-[9px] text-muted-foreground/75 font-semibold leading-none">
                          {step.desc}
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
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Setup Contract Terms & Clauses</h2>
                      </div>
                      
                      <div className="bg-primary/10 text-primary border border-primary/20 p-4 rounded-2xl text-xs font-medium leading-relaxed">
                        Specify contract scope and milestone timelines below. Once submitted, the freelancer must confirm the terms before escrow funding is initiated.
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Scope of Work</label>
                          <textarea
                            value={scopeOfWork}
                            onChange={(e) => setScopeOfWork(e.target.value)}
                            className="w-full h-32 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                            placeholder="Detailed scope of deliverables and work description..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Payment Terms</label>
                            <textarea
                              value={paymentTerms}
                              onChange={(e) => setPaymentTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder="e.g., payment release upon milestone approval..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Intellectual Property Clauses</label>
                            <textarea
                              value={intellectualPropertyTerms}
                              onChange={(e) => setIntellectualPropertyTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder="Ownership details of work products..."
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Confidentiality (NDA)</label>
                            <textarea
                              value={confidentialityTerms}
                              onChange={(e) => setConfidentialityTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder="Non-disclosure terms..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Cancellation Policies</label>
                            <textarea
                              value={cancellationTerms}
                              onChange={(e) => setCancellationTerms(e.target.value)}
                              className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                              placeholder="Termination policies..."
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Dispute Resolution</label>
                          <textarea
                            value={disputeTerms}
                            onChange={(e) => setDisputeTerms(e.target.value)}
                            className="w-full h-24 px-4 py-3 bg-secondary/25 border border-border/40 hover:border-border-hover focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-foreground transition-all duration-300 outline-none resize-none font-medium"
                            placeholder="Arbitration and mediation procedures..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Milestones schedule form */}
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2.5">
                          <ListChecks size={20} className="text-primary" />
                          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Milestones Schedule</h2>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 border rounded-full text-xs font-bold transition-all duration-300
                            ${formMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0) === contract.totalBudget
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                              : 'bg-destructive/10 border-destructive/25 text-destructive animate-pulse'
                            }`}
                          >
                            Sum: {formatContractAmount(formMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0))} / {formatContractAmount(contract.totalBudget)}
                          </span>
                          <button
                            onClick={handleAddMilestone}
                            type="button"
                            className="btn-primary-custom px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            + Add Milestone
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {formMilestones.map((milestone, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row items-stretch gap-4 bg-secondary/15 border border-border/25 rounded-2xl p-4">
                            <div className="flex-1">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Title</label>
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                                className="w-full px-3 py-2 bg-card border border-border/30 rounded-xl text-xs text-foreground outline-none focus:border-blue-500 transition-all font-semibold"
                                placeholder="e.g. Initial Prototype, Final Delivery..."
                              />
                            </div>
                            <div className="w-full md:w-44">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Amount (Tokens)</label>
                              <input
                                type="number"
                                value={milestone.amount}
                                onChange={(e) => handleMilestoneChange(idx, 'amount', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-card border border-border/30 rounded-xl text-xs text-foreground outline-none focus:border-blue-500 transition-all font-semibold"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground mt-1 block pl-1">
                              </span>
                            </div>
                            <div className="w-full md:w-44">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Due Date</label>
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
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}

                        {formMilestones.length === 0 && (
                          <p className="text-muted-foreground text-center py-6 text-sm italic">No milestones defined. Please add at least one milestone.</p>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 border-t border-border/50 pt-5">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSaveDetails(false)}
                          className="px-5 py-2.5 bg-secondary/50 hover:bg-secondary border border-border/60 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Save Draft Details
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSaveDetails(true)}
                          className="btn-primary-custom px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Submit to Freelancer
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
                        Waiting for the freelancer to review and confirm the contract terms & milestones schedule.
                      </div>
                    </div>
                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* PendingSignature: Freelancer is still signing — show waiting state for client */}
                {effectiveStatus === ContractStatus.PendingSignature && (
                  <>
                    <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex items-center gap-3">
                      <Clock size={20} className="shrink-0 animate-pulse" />
                      <div className="text-sm font-semibold">
                        Waiting for the freelancer to digitally sign the contract. Once both signatures are collected, escrow funding will begin.
                      </div>
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
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Secure Contract Escrow</h2>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Escrow funding secures the payment for milestones. We require funding <strong>100% of the total budget</strong> to proceed.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Contract Budget</span>
                          <span className="text-2xl font-bold text-foreground mt-1.5 block">
                            {formatContractAmount(contract.totalBudget)}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1">
                          </span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Required Escrow (100%)</span>
                          <span className="text-2xl font-bold text-primary mt-1.5 block">
                            {formatContractAmount(escrowFundingAmount)}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1">
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-secondary/10 border border-border/20 rounded-2xl">
                        <div>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Your Wallet Balance</span>
                          <span className="text-xl font-bold text-foreground mt-1 block">
                            {walletBalance !== null ? `${walletBalance} Tokens` : 'Loading...'}
                          </span>
                          {walletBalance !== null && (
                            <span className="text-xs text-muted-foreground block mt-1">
                            </span>
                          )}
                        </div>
                        
                        {walletBalance !== null && walletBalance < escrowFundingAmount && (
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-destructive block mb-1">
                              Short of {escrowFundingAmount - walletBalance} Tokens
                            </span>
                          </div>
                        )}
                      </div>

                      {walletBalance !== null && walletBalance < escrowFundingAmount ? (
                        <div className="space-y-4">
                          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-2xl text-xs font-medium">
                            You do not have enough GigCoin to fund this contract escrow. Please top up your wallet first.
                          </div>
                          <button
                            onClick={() => navigate('/wallet/deposit')}
                            className="btn-primary-custom w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                          >
                            <GigCoinLogo size={17} />
                            Top Up Wallet
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={actionLoading || walletBalance === null}
                          onClick={handleFundEscrow}
                          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2 border-none"
                        >
                          <Lock size={17} />
                          Fund Escrow Now
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
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">Contract Information</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3 flex flex-col gap-2 bg-secondary/25 border border-border/30 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contract ID</span>
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
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  Copy ID
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 bg-secondary/15 border border-border/20 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Payment Type</span>
                          <span className="text-sm font-bold text-foreground mt-1">
                            Fixed Price
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
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Created At</span>
                            <span className="text-sm font-bold text-foreground mt-1">
                              {new Date(contract.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {contract.description && (
                        <div className="flex flex-col gap-3 mt-6">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contract Description</span>
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
                          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">E-Signature Contract Document</h2>
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
                              E-signature status: <span className="text-emerald-500 font-bold">Fully Signed & Secured</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                            <button
                              onClick={handleDownloadPDF}
                              className="px-4 py-2 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Download size={13} />
                              Download Signed PDF
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
                            <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">Milestones ({milestones.length})</h2>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-xs font-bold">
                              {milestonesPaid} Paid
                            </span>
                            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
                              {milestonesApproved} Approved
                            </span>
                            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
                              Total: {formatContractAmount(milestonesTotal)}
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
                                      {milestone.status === MilestoneStatus.PaymentConfirmed ? (
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
                                        Due: {formatContractDate(milestone.due_date)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-sm font-bold text-foreground">{formatContractAmount(milestone.amount)}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusClass.replace('milestone-status ', '')} 
                                      ${milestone.status === MilestoneStatus.PaymentConfirmed ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                        milestone.status === MilestoneStatus.Approved ? 'bg-primary/10 text-primary border border-primary/20' :
                                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                      {getMilestoneStatusLabel(milestone.status)}
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
                                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount</span>
                                          <span className="font-bold text-foreground text-sm">{formatContractAmount(milestone.amount)}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Due Date</span>
                                          <span className="font-bold text-foreground text-sm">{formatContractDate(milestone.due_date)}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</span>
                                          <span className="font-bold text-foreground text-sm">{getMilestoneStatusLabel(milestone.status)}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Paid Date</span>
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
                          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">Audit Trail History</h2>
                        </div>
                        <button
                          onClick={() => setShowAuditTrail(!showAuditTrail)}
                          className="px-4 py-2 bg-secondary/40 hover:bg-secondary/70 border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm"
                        >
                          {showAuditTrail ? 'Hide History' : 'Show History'}
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
                              <p className="text-muted-foreground text-center py-6 text-sm">No audit history entries available.</p>
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
                  Contract Summary
                </h3>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-blue-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Total Budget</span>
                      <span className="text-base font-black text-foreground mt-0.5 block">{formatContractAmount(contract.totalBudget)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <GigCoinLogo size={15} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-purple-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Start Date</span>
                      <span className="text-sm font-black text-foreground mt-0.5 block">{formatContractDate(contract.startDate)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <Calendar size={15} />
                    </div>
                  </div>

                  {contract.endDate && (
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-cyan-500/20 transition-all">
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">End Date</span>
                        <span className="text-sm font-black text-foreground mt-0.5 block">{formatContractDate(contract.endDate)}</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                        <Calendar size={15} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-emerald-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Milestones Status</span>
                      <span className="text-sm font-black text-foreground mt-0.5 block">
                        {milestonesPaid} Paid / {milestonesApproved} Approved
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
                <h2 className="text-base font-bold text-foreground uppercase tracking-tight mb-5 font-zentry">Quick Actions</h2>
                <div className="flex flex-col gap-3">
                  <motion.button 
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/contracts/${contract.contractsId}/milestones`)} 
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm cursor-pointer shadow flex items-center justify-center gap-2 border-none"
                  >
                    <ListChecks size={18} />
                    Manage Milestones
                  </motion.button>

                  {contract.esignContractPdfUrl && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDownloadPDF} 
                      className="w-full py-3 bg-secondary/50 hover:bg-secondary border border-border/60 rounded-xl font-bold text-sm text-foreground cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={17} />
                      Download PDF
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
                      Leave Review
                    </motion.button>
                  )}

                  {contract.status === ContractStatus.Active && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/contracts/${contract.contractsId}/disputes/create`)} 
                      className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldAlert size={17} />
                      File Dispute Case
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Parties Info Panel */}
              <div className="glass-card p-6">
                <div className="flex flex-col gap-6">
                  {contract.clientProfile && (
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Client (You)</span>
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
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Freelancer</span>
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
    </AppLayout>
  );
}
