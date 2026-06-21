import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, EyeOff, Lock, AlertCircle, CheckCircle, Clock, DollarSign,
  User, FileText, Calendar, Download, ArrowLeft, Shield,
  Mail, MapPin, Briefcase, Heart, ShieldAlert, ListChecks,
  Copy, Check, FileCheck, Layers, ChevronDown, Star
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import {
  getContractStatusLabel,
  getContractStatusClass,
  formatContractAmount,
  formatContractDate,
  getMilestoneStatusLabel,
  getMilestoneStatusClass
} from '../../../shared/utils/contractUtils';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
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

interface ClientProfile {
  profilesId?: string;
  fullName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  companyName?: string;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified';
}

interface FreelancerProfile {
  profilesId?: string;
  fullName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  headline?: string;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified';
}

interface ContractDetailsData extends ContractDto {
  clientProfile?: ClientProfile;
  freelancerProfile?: FreelancerProfile;
  milestones?: Milestone[];
  auditTrail?: AuditTrailEntry[];
}

type UserRole = 'client' | 'freelancer' | 'admin' | 'none';

const CONTRACT_STATUSES = [
  { value: ContractStatus.Active, label: 'Active', color: '#10b981' },
  { value: ContractStatus.Completed, label: 'Completed', color: '#3b82f6' },
  { value: ContractStatus.Cancelled, label: 'Cancelled', color: '#ef4444' },
  { value: ContractStatus.Disputed, label: 'Disputed', color: '#f59e0b' },
];

export default function ViewContractDetailsScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useApp();

  // State
  const [contract, setContract] = useState<ContractDetailsData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('none');
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Form Details States
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [intellectualPropertyTerms, setIntellectualPropertyTerms] = useState('');
  const [confidentialityTerms, setConfidentialityTerms] = useState('');
  const [cancellationTerms, setCancellationTerms] = useState('');
  const [disputeTerms, setDisputeTerms] = useState('');
  const [formMilestones, setFormMilestones] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Determine user role relative to contract
  useEffect(() => {
    if (!user || !contract) return;

    const userProfileId = (user as any).profileId || user.id;

    // Admin role check
    const isAdmin = user.role === UserRole.Admin;
    if (isAdmin) {
      setUserRole('admin');
      return;
    }

    const isMock = contract.contractsId.startsWith('contract_mock_') || contract.contractsId.includes('mock');

    // Check if user is client
    const isClient = user.role === UserRole.Client;
    if (contract.clientProfilesId === userProfileId || (!((user as any).profileId) && isClient) || (isMock && isClient)) {
      setUserRole('client');
      return;
    }

    // Check if user is freelancer
    const isFreelancer = user.role === UserRole.Freelancer;
    if (contract.freelancerProfilesId === userProfileId || (!((user as any).profileId) && isFreelancer) || (isMock && isFreelancer)) {
      setUserRole('freelancer');
      return;
    }

    setUserRole('none');
  }, [user, contract]);

  // Load contract details from API with mock fallback
  useEffect(() => {
    const loadContractDetails = async () => {
      if (!contractId) {
        setError('No contract ID provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try fetching from backend API first
        const apiResponse = await contractGetAPI.getContractById(contractId);
        
        if (apiResponse.success && apiResponse.data) {
          const contractData = apiResponse.data as ContractDetailsData;
          
          // Fetch milestones for this contract from API
          const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
          const milestonesList = milestonesResponse.success && milestonesResponse.data 
            ? milestonesResponse.data 
            : [];
            
          setContract(contractData);
          setMilestones(milestonesList);
          generateAuditTrail(contractData);

          // Populate Form States
          setScopeOfWork(contractData.scopeOfWork || '');
          setPaymentTerms(contractData.paymentTerms || '');
          setIntellectualPropertyTerms(contractData.intellectualPropertyTerms || '');
          setConfidentialityTerms(contractData.confidentialityTerms || '');
          setCancellationTerms(contractData.cancellationTerms || '');
          setDisputeTerms(contractData.disputeTerms || '');
          setFormMilestones(milestonesList.map(m => ({
            milestoneId: m.id,
            title: m.title,
            amount: m.amount,
            dueDate: m.due_date ? m.due_date.substring(0, 10) : '',
          })));

          if (contractData.status === ContractStatus.PendingEscrow && user?.role === UserRole.Client) {
            const walletRes = await walletGetAPI.getMyWallet();
            if (walletRes.success && walletRes.data) {
              setWalletBalance(walletRes.data.availableTokens);
            }
          }
        } else {
          // Fallback only if dev mock flag is set
          if (import.meta.env.VITE_USE_MOCK === 'true') {
            const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
            if (!mockContract) {
              setError('Contract details not found');
              return;
            }
            setContract(mockContract);
            setMilestones(mockContract.milestones || []);
            generateAuditTrail(mockContract);
          } else {
            setError(apiResponse.message || 'Failed to retrieve contract details');
          }
        }
      } catch (err) {
        if (import.meta.env.VITE_USE_MOCK === 'true') {
          const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
          if (mockContract) {
            setContract(mockContract);
            setMilestones(mockContract.milestones || []);
            generateAuditTrail(mockContract);
          } else {
            setError('Mock contract details not found');
          }
        } else {
          const errorMsg = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMsg);
          console.error('Failed to load contract details:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadContractDetails();
  }, [contractId]);

  // Generate audit trail entries from contract metadata
  const generateAuditTrail = (contractData: ContractDetailsData) => {
    const trail: AuditTrailEntry[] = [];

    // Contract created
    trail.push({
      id: '1',
      action: 'Contract Created',
      timestamp: contractData.createdAt,
      performedBy: contractData.clientProfilesId || 'Client',
      performedByRole: 'Client',
      details: `Contract "${contractData.title}" created from proposal`,
      metadata: {
        budget: contractData.totalBudget,
        contractType: 'Fixed Price',
      }
    });

    // Contract started
    if (contractData.startDate) {
      trail.push({
        id: '2',
        action: 'Contract Started',
        timestamp: contractData.startDate,
        performedBy: 'System',
        performedByRole: 'Admin',
        details: 'Contract work period began'
      });
    }

    // Contract status changes
    if (contractData.status === ContractStatus.Completed && contractData.completedAt) {
      trail.push({
        id: '3',
        action: 'Contract Completed',
        timestamp: contractData.completedAt,
        performedBy: contractData.clientProfilesId || 'Client',
        performedByRole: 'Client',
        details: 'All milestones approved and paid'
      });
    }

    setAuditTrail(trail);
  };

  const hasAccess = (): boolean => {
    return userRole !== 'none';
  };

  // Copy to clipboard
  const handleCopyContractId = () => {
    if (contract?.contractsId) {
      navigator.clipboard.writeText(contract.contractsId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Download contract PDF
  const handleDownloadPDF = () => {
    if (contract?.esignContractPdfUrl) {
      window.open(contract.esignContractPdfUrl, '_blank');
    }
  };

  // Navigate to sign contract
  const handleSignContract = () => {
    navigate(`/contracts/${contractId}/sign`);
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

      const updateRes = await contractPutAPI.updateDetails(contractId, payload);
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

        const submitRes = await contractPostAPI.submitDetails(contractId);
        if (submitRes.success) {
          alert('Contract details submitted to freelancer!');
          window.location.reload();
        } else {
          alert(submitRes.message || 'Failed to submit details');
        }
      } else {
        alert('Draft contract details saved successfully!');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDetails = async () => {
    setActionLoading(true);
    try {
      const res = await contractPostAPI.confirmDetails(contractId);
      if (res.success) {
        alert('Contract terms confirmed successfully!');
        window.location.reload();
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
      const res = await contractPostAPI.requestChange(contractId, reason.trim());
      if (res.success) {
        alert('Change request sent to client.');
        window.location.reload();
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

  const handleFundEscrow = async () => {
    setActionLoading(true);
    try {
      const res = await contractPostAPI.fundEscrow(contractId);
      if (res.success) {
        alert('Escrow funded successfully! Contract is now ready for signing.');
        window.location.reload();
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
              <span className="text-xs text-muted-foreground block">
                = {new Intl.NumberFormat('vi-VN').format(milestone.amount * 1000)} VND
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!contractId) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive border border-destructive/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Invalid Contract</h2>
          <p className="text-muted-foreground text-sm mt-2">No contract ID provided in parameters.</p>
          <button 
            onClick={() => navigate('/contracts')} 
            className="btn-primary-custom mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Back to Contracts
          </button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-10 animate-pulse space-y-8">
          {/* Header shimmer */}
          <div className="bg-card border border-border/50 rounded-3xl p-8 h-48 w-full" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main shimmer */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-60 w-full" />
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-80 w-full" />
            </div>
            {/* Sidebar shimmer */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-40 w-full" />
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-64 w-full" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !contract) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive border border-destructive/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Unable to Load Contract</h2>
          <p className="text-muted-foreground text-sm mt-2">{error || 'The requested contract was not found.'}</p>
          <button 
            onClick={() => navigate('/contracts')} 
            className="btn-primary-custom mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Back to Contracts
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess()) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground text-sm mt-2">MSG57: You do not have permission to access this resource.</p>
          <button 
            onClick={() => navigate('/contracts')} 
            className="btn-primary-custom mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Back to Contracts
          </button>
        </div>
      </AppLayout>
    );
  }

  const contractStatus = CONTRACT_STATUSES.find(s => s.value === contract.status);
  const milestonesTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
  const milestonesApproved = milestones.filter(m => m.status === MilestoneStatus.Approved).length;
  const milestonesPaid = milestones.filter(m => m.status === MilestoneStatus.Paid).length;

  let currentStep = 1;
  if (contract.status === ContractStatus.PendingContractConfirmation) {
    currentStep = 2;
  } else if (contract.status === ContractStatus.PendingEscrow) {
    currentStep = 3;
  } else if (contract.status === ContractStatus.PendingSignature) {
    currentStep = 4;
  } else if (contract.status >= ContractStatus.Active) {
    currentStep = 4;
  }

  return (
    <AppLayout excludeMeshGradient>
      <div className="bg-background h-auto lg:h-[calc(100vh-7.5rem)] flex flex-col relative w-full lg:overflow-hidden text-left font-sans">
        
        {/* Structural Typography & Ambient Orbs in Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <div className="client-dash-glow-orb orb-purple absolute" />
          <div className="client-dash-glow-orb orb-cyan absolute" />
          <div className="client-dash-glow-orb orb-blue absolute" />

          <div className="absolute -top-10 -left-10 text-[20vw] font-black text-primary/[0.008] dark:text-primary/[0.004] avant-garde-heading uppercase leading-none">
            CONTRACT
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-4 md:px-8 py-4 lg:py-6 lg:overflow-hidden min-h-0">

          {/* Shrunken, Compact Header Top-Bar */}
          <header className="flex items-center justify-between border-b border-border/30 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/contracts')}
                className="back-button shrink-0 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                title="Back to Contracts"
              >
                <ArrowLeft size={15} />
              </button>
              {contract && (
                <h1 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <span className="font-bold text-primary truncate max-w-[150px] md:max-w-xl">{contract.title}</span>
                  <span className="text-text-subtle">/</span>
                  <span className="text-text-primary font-black uppercase tracking-wider text-xs">Contract Details</span>
                  <span className={`status-badge ${getContractStatusClass(contract.status)} ml-2 text-[9px] py-0.5 px-2`}>
                    {getContractStatusLabel(contract.status)}
                  </span>
                </h1>
              )}
            </div>
          </header>

          {/* Stepper Panel */}
          <div className="glass-card p-4 relative overflow-hidden text-left mb-4 shrink-0">
            {/* Decorative line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20" />
            <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
              {[
                { number: 1, label: 'Terms Setup', desc: 'Define milestones & terms' },
                { number: 2, label: 'Review & Confirm', desc: 'Freelancer review' },
                { number: 3, label: 'Escrow Funding', desc: 'Secure project escrow' },
                { number: 4, label: 'E-Signature', desc: 'Digitally sign' },
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

          {/* Responsive Grid Layout */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
            
            {/* Main Column (col-span-8) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="col-span-12 lg:col-span-8 flex flex-col lg:h-full min-h-0 lg:overflow-hidden gap-6 pb-6 lg:pb-0"
            >
              <div className="flex-1 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar space-y-6">
              
              {/* Conditional Panel Rendering */}
              {contract.status === ContractStatus.PendingContractDetails && (
                <>
                  {userRole === 'client' ? (
                    <>
                      {/* Setup form */}
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

                      {/* Milestones form */}
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
                                  = {new Intl.NumberFormat('vi-VN').format(Number(milestone.amount) * 1000)} VND
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
                  ) : (
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
                </>
              )}

              {contract.status === ContractStatus.PendingContractConfirmation && (
                <>
                  {userRole === 'freelancer' ? (
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <ShieldAlert size={20} className="text-primary animate-pulse" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Confirm Contract Terms & Milestones</h2>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Please review the scope of work, clauses, and milestones scheduled by the client below. If you agree, confirm to proceed to the escrow funding step. If changes are needed, click "Request Changes" to specify reasons.
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
                  ) : (
                    <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex items-center gap-3">
                      <Clock size={20} className="shrink-0 animate-pulse" />
                      <div className="text-sm font-semibold">
                        Waiting for the freelancer to review and confirm the contract terms & milestones schedule.
                      </div>
                    </div>
                  )}
                  {renderViewOnlyTerms()}
                  {renderViewOnlyMilestones()}
                </>
              )}

              {contract.status === ContractStatus.PendingEscrow && (
                <>
                  {userRole === 'client' ? (
                    <div className="glass-card p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
                        <Lock size={20} className="text-primary" />
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">Secure Contract Escrow</h2>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Escrow funding secures the payment for milestones before signing the contract. We require funding <strong>80% of the total budget</strong> to proceed.
                      </p>

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
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Required Escrow (80%)</span>
                          <span className="text-2xl font-bold text-primary mt-1.5 block">
                            {formatContractAmount(contract.totalBudget * 0.8)}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1">
                            = {new Intl.NumberFormat('vi-VN').format(contract.totalBudget * 0.8 * 1000)} VND
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
                              = {new Intl.NumberFormat('vi-VN').format(walletBalance * 1000)} VND
                            </span>
                          )}
                        </div>
                        
                        {walletBalance !== null && walletBalance < (contract.totalBudget * 0.8) && (
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-destructive block mb-1">
                              Short of {(contract.totalBudget * 0.8) - walletBalance} Tokens
                            </span>
                          </div>
                        )}
                      </div>

                      {walletBalance !== null && walletBalance < (contract.totalBudget * 0.8) ? (
                        <div className="space-y-4">
                          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-2xl text-xs font-medium">
                            You do not have enough tokens to fund this contract escrow. Please top up your wallet first.
                          </div>
                          <button
                            onClick={() => navigate('/wallet/deposit')}
                            className="btn-primary-custom w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                          >
                            <DollarSign size={17} />
                            Top Up Wallet (Add Tokens)
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
                  ) : (
                    <div className="bg-primary/10 text-primary border border-primary/20 p-6 rounded-3xl flex items-center gap-3">
                      <Clock size={20} className="shrink-0 animate-pulse" />
                      <div className="text-sm font-semibold">
                        Waiting for the client to fund the secure contract escrow deposit (80% of budget).
                      </div>
                    </div>
                  )}
                  {renderViewOnlyTerms()}
                  {renderViewOnlyMilestones()}
                </>
              )}

              {contract.status === ContractStatus.PendingSignature && (
                <>
                  <div className="glass-card p-8 md:p-10 space-y-6 text-center">
                    <div className="w-16 h-16 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center mx-auto">
                      <FileCheck size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight font-extrabold font-zentry">E-Sign Contract Document</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Escrow funding is secured. Both client and freelancer must digitally sign the contract to activate the workroom.
                    </p>

                    <button
                      onClick={() => navigate(`/contracts/${contractId}/sign`)}
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

              {contract.status >= ContractStatus.Active && (
                <>
                  {/* Contract Info section */}
                  <section className="glass-card p-8 md:p-10 relative overflow-hidden">
                    <div className="flex items-center gap-2.5 border-b border-border/50 pb-4 mb-6">
                      <FileText size={20} className="text-primary" />
                      <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">Contract Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* ID box */}
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

                  {/* Contract Details / Terms & Clauses */}
                  {renderViewOnlyTerms()}

                  {/* E-Signature & Contract Document Section */}
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

                  {/* Milestones Accordions Section */}
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
                        {milestones.map((milestone, index) => {
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
                              {/* Header */}
                              <div
                                onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                                className="flex items-center justify-between p-5 cursor-pointer gap-4 select-none hover:bg-secondary/15 transition-colors"
                              >
                                <div className="flex items-center gap-3.5 min-width-0 flex-1">
                                  <div className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center shrink-0 border border-border/40 text-primary">
                                    {milestone.status === MilestoneStatus.Paid ? (
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
                                    ${milestone.status === MilestoneStatus.Paid ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
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

                              {/* Collapsible Panel */}
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
                  {(userRole === 'admin' || userRole === 'client') && (
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
                                    
                                    {/* Node Marker */}
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
                                      {entry.metadata && (
                                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
                                          {Object.entries(entry.metadata).map(([key, value]) => (
                                            <span key={key} className="px-2.5 py-1 bg-card border border-border/40 rounded-lg text-[10px] font-semibold text-muted-foreground">
                                              <strong className="text-foreground uppercase mr-1">{key}:</strong> {String(value)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
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
                  )}

                  {/* Security disclaimer (Admin only) */}
                  {userRole === 'admin' && (
                    <section className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/15">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-tight">Privileged Administrator Mode</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                          You are accessing this contract portal with write privilege overrides. All actions, views, and updates are logged in the secure database audit log.
                        </p>
                      </div>
                    </section>
                  )}
                </>
              )}
              </div>
            </motion.div>

            {/* Sidebar Column (col-span-4) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="col-span-12 lg:col-span-4 flex flex-col gap-4 lg:h-full min-h-0 lg:overflow-y-auto pb-6 lg:pb-0 shrink-0"
            >
              {/* Contract Budget & Timeline Summary Panel */}
              <div className="glass-card p-5 flex flex-col gap-4 text-left">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest border-b border-border/20 pb-2 font-zentry">
                  Contract Summary
                </h3>

                <div className="flex flex-col gap-3">
                  {/* Total Budget */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-blue-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Total Budget</span>
                      <span className="text-base font-black text-foreground mt-0.5 block">{formatContractAmount(contract.totalBudget)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <DollarSign size={15} />
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-purple-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Start Date</span>
                      <span className="text-sm font-black text-foreground mt-0.5 block">{formatContractDate(contract.startDate)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <Calendar size={15} />
                    </div>
                  </div>

                  {/* End Date */}
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

                  {/* Milestones Tracker Status */}
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
                  {userRole === 'freelancer' && contract.status === ContractStatus.Active && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSignContract} 
                      className="btn-primary-custom w-full py-3 rounded-xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <FileCheck size={18} />
                      Sign Contract Document
                    </motion.button>
                  )}
                  
                  {userRole === 'client' && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/contracts/${contractId}/milestones`)} 
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm cursor-pointer shadow flex items-center justify-center gap-2 border-none"
                    >
                      <ListChecks size={18} />
                      Manage Milestones
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

                  {(userRole === 'client' || userRole === 'freelancer') && contract.status === ContractStatus.Completed && (
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

                  {(userRole === 'client' || userRole === 'freelancer') && contract.status === ContractStatus.Active && (
                    <motion.button 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/contracts/${contractId}/disputes/create`)} 
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
                  {/* Client badge */}
                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Client</span>
                    {contract.clientProfile ? (
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
                          {contract.clientProfile.verificationStatus === 'Verified' && (
                            <div className="flex items-center gap-1 mt-1 text-emerald-500 text-[10px] font-bold">
                              <Shield size={11} />
                              <span>Verified Profile</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pl-2">Profile details not loaded.</p>
                    )}
                  </div>

                  {/* Freelancer badge */}
                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2.5">Freelancer</span>
                    {contract.freelancerProfile ? (
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
                          {contract.freelancerProfile.verificationStatus === 'Verified' && (
                            <div className="flex items-center gap-1 mt-1 text-emerald-500 text-[10px] font-bold">
                              <Shield size={11} />
                              <span>Verified Profile</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pl-2">Profile details not loaded.</p>
                    )}
                  </div>
                </div>
              </div>

            </motion.div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
