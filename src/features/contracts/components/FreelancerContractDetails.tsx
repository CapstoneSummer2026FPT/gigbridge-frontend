import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, AlertCircle, CheckCircle, Clock, DollarSign,
  User, FileText, Calendar, Download, ArrowLeft, Shield,
  Mail, ListChecks, Copy, Check, FileCheck, ChevronDown,
  Star, ShieldAlert, Edit3, XCircle
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
  getMilestoneStatusLabel,
  getMilestoneStatusClass
} from '../../../shared/utils/contractUtils';
import '../styles/view-contract-details-screen.css';

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
}

export function FreelancerContractDetails({
  contract,
  milestones,
  auditTrail,
  onRefresh
}: FreelancerContractDetailsProps) {
  const navigate = useNavigate();
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
  const milestonesPaid = milestones.filter(m => m.status === MilestoneStatus.PaymentConfirmed).length;
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
        alert('Contract details confirmed! Proceeding to e-signature.');
        onRefresh();
      } else {
        alert(res.message || 'Failed to confirm contract details.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while confirming details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Request change for contract terms
  const handleRequestChange = async () => {
    if (!changeRequestReason.trim()) {
      alert('Please provide a reason for the change request.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await contractPostAPI.requestChange(contract.contractsId, changeRequestReason.trim());
      if (res.success) {
        alert('Change request submitted to client.');
        setShowChangeRequestModal(false);
        setChangeRequestReason('');
        onRefresh();
      } else {
        alert(res.message || 'Failed to submit change request.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while submitting the change request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Request milestone change
  const handleRequestMilestoneChange = async () => {
    if (!milestoneChangeReason.trim()) {
      alert('Please provide a reason for the milestone change request.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await contractPostAPI.requestMilestoneChange(contract.contractsId, milestoneChangeReason.trim());
      if (res.success) {
        alert('Milestone change request submitted to client.');
        setShowMilestoneChangeModal(false);
        setMilestoneChangeReason('');
        onRefresh();
      } else {
        alert(res.message || 'Failed to submit milestone change request.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while submitting the milestone change request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for rendering terms read-only
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
          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Milestones ({milestones.length})</h2>
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
              <span className="text-xs text-muted-foreground block">
                = {new Intl.NumberFormat('vi-VN').format(milestone.amount * 1000)} VND
              </span>
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
                <span className="text-text-primary font-black uppercase tracking-wider text-xs">Contract Details (Freelancer)</span>
                <span className={`status-badge ${getContractStatusClass(contract.status)} ml-2 text-[9px] py-0.5 px-2`}>
                  {getContractStatusLabel(contract.status)}
                </span>
              </h1>
            </div>
          </header>

          {/* Stepper Panel */}
          <div className="glass-card p-4 relative overflow-hidden text-left mb-4 shrink-0">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20" />
            <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
              {[
                { number: 1, label: 'Review & Confirm', desc: 'Review contract terms' },
                { number: 2, label: 'E-Signature', desc: 'Digitally sign' },
                { number: 3, label: 'Escrow Pending', desc: 'Client funds escrow' },
                { number: 4, label: 'Active', desc: 'Work in progress' },
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
                        <span className="text-[9px] text-muted-foreground/75 font-semibold leading-none">
                          {step.desc}
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
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Milestone Change Request Sent</h2>
                      </div>

                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-5 rounded-2xl text-sm font-semibold leading-relaxed flex items-start gap-3">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                          Waiting for the client to update the milestone schedule. You can review the current milestones below while the contract is returned to the client for editing.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Job</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{contract.jobTitle || contract.title}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Final Budget</span>
                          <span className="text-lg font-black text-primary mt-1 block">{formatContractAmount(contract.totalBudget)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Current Milestone Total</span>
                          <span className="text-lg font-black text-foreground mt-1 block">{formatContractAmount(milestonesTotal)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3">
                        <button
                          onClick={() => navigate('/contracts')}
                          className="px-5 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ArrowLeft size={14} />
                          Back to Contracts
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
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Review Contract Terms</h2>
                      </div>

                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-4 rounded-2xl text-xs font-medium leading-relaxed flex items-start gap-3">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          The client has submitted the contract terms and milestone schedule for your review. Please read everything carefully before confirming or requesting changes.
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
                          Confirm & Accept Terms
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => setShowChangeRequestModal(true)}
                          className="flex-1 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                        >
                          <Edit3 size={17} />
                          Request Changes
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
                            <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Review Final Contract Before Signing</h2>
                            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-2">
                              Please review final price, dates, job scope, and milestones before signing. Your signature confirms the terms shown below.
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-500 rounded-full text-xs font-bold uppercase tracking-wider shrink-0">
                          {hasSignedESignContract ? 'E-signature recorded' : 'Ready for E-signature'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Job</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{contract.jobTitle || contract.title}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Final Budget</span>
                          <span className="text-lg font-black text-primary mt-1 block">{formatContractAmount(contract.totalBudget)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Milestone Total</span>
                          <span className="text-lg font-black text-foreground mt-1 block">{formatContractAmount(milestonesTotal)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Start Date</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{formatContractDate(contract.startDate)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">End Date</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{formatContractDate(contract.endDate)}</span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Parties</span>
                          <span className="text-sm font-bold text-foreground mt-1 block">{contract.clientName || 'Client'} / {contract.freelancerName || 'Freelancer'}</span>
                        </div>
                      </div>

                      {!milestoneTotalMatchesBudget && (
                        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-4 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-3">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <span>Milestone total differs from final budget. Review the updated milestones below before signing.</span>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row gap-3">
                        <button
                          onClick={() => navigate('/contracts')}
                          className="px-5 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ArrowLeft size={14} />
                          Back to Contracts
                        </button>
                        <button
                          onClick={handleScrollToReview}
                          className="px-5 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ListChecks size={14} />
                          Review Milestones
                        </button>
                        {!hasSignedESignContract && (
                          <button
                            disabled={actionLoading}
                            onClick={() => setShowMilestoneChangeModal(true)}
                            className="px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                          >
                            <Edit3 size={14} />
                            Request Milestone Changes
                          </button>
                        )}
                        <button
                          onClick={hasSignedESignContract ? handleViewESignContract : () => navigate(`/contracts/${contract.contractsId}/sign`)}
                          className={hasSignedESignContract
                            ? "px-8 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-sm font-bold text-foreground transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                            : "btn-primary-custom px-8 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"}
                        >
                          {hasSignedESignContract ? <FileText size={18} /> : <FileCheck size={18} />}
                          {hasSignedESignContract ? 'View E-sign Contract' : 'Proceed to E-sign Contract'}
                        </button>
                      </div>
                    </div>

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
                              E-signature status: <span className="text-amber-500 font-bold">Awaiting Signatures</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                            <button
                              onClick={handleDownloadPDF}
                              className="px-4 py-2 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Download size={13} />
                              Download Draft PDF
                            </button>
                          </div>
                        </div>
                      </section>
                    )}

                    <div ref={reviewContentRef} className="scroll-mt-6 space-y-6">
                      <div className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Need milestone changes?</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ask the client to update milestone titles, dates, or amounts before you sign.
                          </p>
                        </div>
                        <button
                          disabled={actionLoading}
                          onClick={() => setShowMilestoneChangeModal(true)}
                          className="px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          <Edit3 size={14} />
                          Request Milestone Changes
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
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Waiting for Escrow Funding</h2>
                      </div>

                      <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex items-center gap-3">
                        <Clock size={22} className="shrink-0 animate-pulse" />
                        <div className="text-sm font-semibold">
                          The contract is fully signed. The client is now funding the escrow to activate your workspace and start work.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Contract Budget</span>
                          <span className="text-2xl font-bold text-foreground mt-1.5 block">
                            {formatContractAmount(contract.totalBudget)}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1">
                            = {new Intl.NumberFormat('vi-VN').format(contract.totalBudget * 1000)} VND
                          </span>
                        </div>
                        <div className="bg-secondary/15 border border-border/25 rounded-2xl p-5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Escrow Required (80%)</span>
                          <span className="text-2xl font-bold text-primary mt-1.5 block">
                            {formatContractAmount(contract.totalBudget * 0.8)}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1">
                            Client must fund this amount
                          </span>
                        </div>
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 text-xs text-emerald-600 font-semibold leading-relaxed">
                        Once the client funds the escrow, your workspace will be automatically activated and you can begin work on the milestones.
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
                          <span className="text-sm font-bold text-foreground mt-1">Fixed Price</span>
                        </div>

                        <div className="flex flex-col gap-1 bg-secondary/15 border border-border/20 rounded-2xl p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Job Post ID</span>
                          <span className="text-sm font-bold text-muted-foreground mt-1 truncate">{contract.jobPostsId}</span>
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
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
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
                                      <div className="p-5 space-y-4 text-xs">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                                        {/* Submit deliverables CTA for active milestones */}
                                        {milestone.status === MilestoneStatus.InProgress && (
                                          <div className="pt-2">
                                            <button
                                              onClick={() => navigate(`/milestones/${milestone.id}/submit`)}
                                              className="btn-primary-custom px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                                            >
                                              <FileCheck size={13} />
                                              Submit Deliverables
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
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-teal-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Total Budget</span>
                      <span className="text-base font-black text-foreground mt-0.5 block">{formatContractAmount(contract.totalBudget)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                      <DollarSign size={15} />
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

                  {contract.status >= ContractStatus.Active && (
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
                  )}
                </div>
              </div>
              
              {/* Quick Actions Panel */}
              <div className="glass-card p-6">
                <h2 className="text-base font-bold text-foreground uppercase tracking-tight mb-5 font-zentry">Quick Actions</h2>
                <div className="flex flex-col gap-3">
                  {contract.status === ContractStatus.PendingContractDetails && (
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/contracts')}
                      className="w-full py-3 bg-secondary/50 hover:bg-secondary border border-border/60 rounded-xl font-bold text-sm text-foreground cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={17} />
                      Back to Contracts
                    </motion.button>
                  )}

                  {/* Submit deliverables for active contracts */}
                  {contract.status === ContractStatus.Active && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/contracts/${contract.contractsId}/milestones`)} 
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm cursor-pointer shadow flex items-center justify-center gap-2 border-none"
                    >
                      <ListChecks size={18} />
                      View Milestones
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
                      View E-sign Contract
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
                      Request Milestone Change
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
                      Download PDF
                    </motion.button>
                  )}

                  {contract.status === ContractStatus.Completed && (
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
                <h2 className="text-base font-bold text-foreground uppercase tracking-tight mb-5 font-zentry">Contract Parties</h2>
                <div className="flex flex-col gap-6">
                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Client</span>
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
                          <p className="text-[10px] text-muted-foreground font-semibold">Email not available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Freelancer (You)</span>
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
                          <p className="text-[10px] text-muted-foreground font-semibold">Email not available</p>
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
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight font-zentry">Request Contract Changes</h3>
                <button
                  onClick={() => { setShowChangeRequestModal(false); setChangeRequestReason(''); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground cursor-pointer border-none"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Describe what changes you'd like the client to make to the contract terms. The contract will return to the client for editing.
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
                  Cancel
                </button>
                <button
                  disabled={actionLoading || !changeRequestReason.trim()}
                  onClick={handleRequestChange}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Submit Change Request
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
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight font-zentry">Request Milestone Changes</h3>
                <button
                  onClick={() => { setShowMilestoneChangeModal(false); setMilestoneChangeReason(''); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground cursor-pointer border-none"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Describe what changes you'd like to the milestone schedule. The client will need to update and resubmit.
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
                  Cancel
                </button>
                <button
                  disabled={actionLoading || !milestoneChangeReason.trim()}
                  onClick={handleRequestMilestoneChange}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Submit Milestone Change
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
