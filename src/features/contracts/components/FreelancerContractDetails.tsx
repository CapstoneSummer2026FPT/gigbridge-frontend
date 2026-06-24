import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, AlertCircle, CheckCircle, Clock, DollarSign,
  User, FileText, Calendar, Download, ArrowLeft, Shield,
  Mail, ShieldAlert, ListChecks, Copy, Check, FileCheck, ChevronDown, Star
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import { ContractStatus, MilestoneStatus, type Milestone } from '../../../types/models/Contract';
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
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const milestonesTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
  const milestonesApproved = milestones.filter(m => m.status === MilestoneStatus.Approved).length;
  const milestonesPaid = milestones.filter(m => m.status === MilestoneStatus.PaymentConfirmed).length;

  // New Stepper ordering mapping
  let currentStep = 1;
  if (contract.status === ContractStatus.PendingContractConfirmation) {
    currentStep = 2;
  } else if (contract.status === ContractStatus.PendingSignature) {
    currentStep = 3;
  } else if (contract.status === ContractStatus.PendingEscrow) {
    currentStep = 4;
  } else if (contract.status >= ContractStatus.Active) {
    currentStep = 5;
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

  const handleConfirmDetails = async () => {
    setActionLoading(true);
    try {
      const res = await contractPostAPI.confirmDetails(contract.contractsId);
      if (res.success) {
        alert('Contract terms confirmed successfully!');
        onRefresh();
      } else {
        alert(res.message || 'Failed to confirm contract terms');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during confirmation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChange = async () => {
    const reason = prompt('Please enter the reason/requested changes:');
    if (!reason || !reason.trim()) return;

    setActionLoading(true);
    try {
      const res = await contractPostAPI.requestChange(contract.contractsId, reason.trim());
      if (res.success) {
        alert('Change request sent to client.');
        onRefresh();
      } else {
        alert(res.message || 'Failed to send change request');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while sending change request.');
    } finally {
      setActionLoading(false);
    }
  };

 const handleAcceptMilestones = async () => {
    setActionLoading(true);
    try {
      const res = await contractPostAPI.acceptMilestones(contract.contractsId);
      if (res.success) {
        alert('Milestones accepted. Workspace is now open while waiting for client escrow funding.');
        navigate(`/workspace/${contract.contractsId}`);
      } else {
        alert(res.message || 'Failed to accept milestones.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while accepting milestones.');
    } finally {
      setActionLoading(false);
    }
  };
  const handleRequestMilestoneChange = async () => {
    const reason = prompt('Please enter the milestone changes you want to request:');
    if (!reason || !reason.trim()) return;
    setActionLoading(true);
    try {
      const res = await contractPostAPI.requestMilestoneChange(contract.contractsId, reason.trim());
      if (res.success) {
        alert('Milestone change request sent to client.');
        navigate('/messages');
      } else {
        alert(res.message || 'Failed to request milestone changes.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while requesting milestone changes.');
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
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20" />
            <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
              {[
                { number: 1, label: 'Terms Setup', desc: 'Define milestones & terms' },
                { number: 2, label: 'Review & Confirm', desc: 'Freelancer review' },
                { number: 3, label: 'E-Signature', desc: 'Digitally sign' },
                { number: 4, label: 'Escrow Funding', desc: 'Secure project escrow' },
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
                
                {/* 1. Setup terms step (waiting for client) */}
                {contract.status === ContractStatus.PendingContractDetails && (
                  <>
                    <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-6 rounded-3xl flex items-center gap-3">
                      <Clock size={20} className="shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
                      <div className="text-sm font-semibold">
                        Waiting for the client to complete setting up terms and milestone schedules. You will be notified to review and confirm them.
                      </div>
                    </div>
                    {renderViewOnlyTerms()}
                  </>
                )}

                {/* 2. Review and Confirm step */}
                {contract.status === ContractStatus.PendingContractConfirmation && (
                  <>
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <ShieldAlert size={20} className="text-primary animate-pulse" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Confirm Contract Terms & Milestones</h2>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Please review the scope of work, clauses, and milestones scheduled by the client below. If you agree, confirm to proceed to the e-signature step. If changes are needed, click "Request Changes" to specify reasons.
                      </p>

                      <div className="flex gap-4 border-t border-border/50 pt-5">
                        <button
                          disabled={actionLoading}
                          onClick={handleConfirmDetails}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex-1 flex items-center justify-center gap-2 shadow-md border-none"
                        >
                          <CheckCircle size={18} />
                          Confirm & Proceed
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={handleRequestChange}
                          className="px-6 py-3 bg-destructive/10 hover:bg-destructive/20 border border-destructive/25 text-destructive rounded-xl text-sm font-bold transition-all cursor-pointer flex-1 flex items-center justify-center gap-2"
                        >
                          <AlertCircle size={18} />
                          Request Changes
                        </button>
                      </div>
                    </div>
                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* 3. E-Signature Step */}
                {contract.status === ContractStatus.PendingSignature && (
                  <>
                    <div className="glass-card p-8 md:p-10 space-y-6 text-center">
                      <div className="w-16 h-16 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center mx-auto">
                        <FileCheck size={28} />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">E-Sign Contract Document</h2>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Both client and freelancer must digitally sign the contract. Click the button below to review and sign the legal document.
                      </p>

                      <button
                        onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)}
                        className="btn-primary-custom px-8 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <FileCheck size={18} />
                        Proceed to E-sign Contract
                      </button>
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

                    {renderViewOnlyTerms()}
                    {renderViewOnlyMilestones()}
                  </>
                )}

                {/* 4. Escrow Funding Step */}
                {contract.status === ContractStatus.PendingEscrow && (
                  <>
                  <div className="glass-card p-8 md:p-10 space-y-5">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <ListChecks size={20} className="text-primary" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Milestone Review</h2>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Review the client-created milestones below. Accept them to confirm your agreement and allow the client to fund the escrow to begin work.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          disabled={actionLoading}
                          onClick={handleAcceptMilestones}
                          className="btn-primary-custom px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <CheckCircle size={17} />
                          Accept Milestones
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={handleRequestMilestoneChange}
                          className="px-6 py-3 bg-secondary/60 hover:bg-secondary border border-border/50 rounded-xl text-sm font-bold text-foreground transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <AlertCircle size={17} />
                          Request Changes
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex items-center gap-3">
                      <Clock size={20} className="shrink-0 animate-pulse" />
                      <div className="text-sm font-semibold">
                        Waiting for the client to fund the secure contract escrow deposit (80% of budget).
                      </div>
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
                  {contract.status === ContractStatus.Active && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/contracts/${contract.contractsId}/sign`)} 
                      className="btn-primary-custom w-full py-3 rounded-xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <FileCheck size={18} />
                      Sign Contract Document
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
                  {contract.clientProfile && (
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Client</span>
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
                          {contract.clientProfile.email && (
                            <a 
                              href={`mailto:${contract.clientProfile.email}`} 
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold truncate max-w-full"
                            >
                              <Mail size={11} />
                              {contract.clientProfile.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {contract.freelancerProfile && (
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Freelancer (You)</span>
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
