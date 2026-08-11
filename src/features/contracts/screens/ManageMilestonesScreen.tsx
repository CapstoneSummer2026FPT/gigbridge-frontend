import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  Plus, Edit, Trash2, AlertCircle, CheckCircle2, Clock,
  Calendar, ChevronDown, Save, X, Eye, ArrowLeft, Layers, ShieldAlert,
  TrendingUp, Send, Sparkles
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import { MilestoneStatus, ContractStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import { useTranslation } from '../../../hooks/useTranslation';
import { canEditMilestone, getMilestoneStatusLabel, formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import { toast } from 'sonner';
import '../styles/manage-milestones-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { EarlyWithdrawalDialog } from '../../../shared/components/EarlyWithdrawalDialog';
import { getEarlyWithdrawalEligibility } from '../../../shared/utils/earlyWithdrawal';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';

interface MilestoneFormData {
  title: string;
  amount: number;
  due_date: string;
  description?: string;
  deliverables?: string;
  acceptanceCriteria?: string;
}

const createClientMilestoneId = () => `new:${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now()}`;
const isClientMilestoneId = (value: string) => value.startsWith('new:');

export default function ManageMilestonesScreen() {
  const { t } = useTranslation();
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useApp();

  const mode = new URLSearchParams(location.search).get('mode');

  // State
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: '',
    amount: 0,
    due_date: '',
    description: '',
    deliverables: '',
    acceptanceCriteria: '',
  });
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawingMilestoneId, setWithdrawingMilestoneId] = useState<string | null>(null);
  const [withdrawDialogMilestone, setWithdrawDialogMilestone] = useState<Milestone | null>(null);
  const [withdrawalError, setWithdrawalError] = useState<{ milestoneId: string; message: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const withdrawalRequestInFlightRef = useRef(false);

  // GSAP entrance animation
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.ms-gsap-header', y: 20, duration: 0.55 },
      { selector: '.ms-gsap-main', y: 24, duration: 0.5 },
      { selector: '.ms-gsap-sidebar', y: 24, duration: 0.5, stagger: 0.1 },
    ],
  });
  const isClient = role === UserRole.Client;
  const isFreelancer = role === UserRole.Freelancer;
  const canEditMilestones = Boolean(isClient && contract && (
      contract.status === ContractStatus.PendingFreelancerSelection ||
      contract.status === ContractStatus.InNegotiation ||
      contract.status === ContractStatus.PendingContractDetails
  ));
  const shouldEnforceBudgetTotal = mode === 'contract-edit' || mode === 'jobpost-setup';
  const isMilestoneCompleteForReview = (milestone: Milestone) =>
    milestone.status === MilestoneStatus.Approved || milestone.status === MilestoneStatus.Completed;
  const getMilestoneDisplayLabel = (milestone: Milestone) => {
    const releasedAmount = Number(milestone.releasedAmount ?? 0);
    if (milestone.amount > 0 && releasedAmount >= milestone.amount) return t('workspace.releasedInFull');

    const eligibility = getEarlyWithdrawalEligibility(milestones, milestone, contract?.status, isFreelancer);
    if (eligibility.isApproved && eligibility.isAtCap) return t('earlyWithdrawal.maximumReached');
    return getMilestoneStatusLabel(milestone.status);
  };

  // Load contract and milestones
  const loadData = async () => {
    if (!contractId) {
      setError('No contract ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const contractResponse = await contractGetAPI.getContractById(contractId);

      if (!contractResponse.success || !contractResponse.data) {
        throw new Error(contractResponse.message || 'Failed to load contract');
      }

      setContract(contractResponse.data);

      // Fetch milestones
      const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
      if (milestonesResponse.success && milestonesResponse.data) {
        const list = milestonesResponse.data;
        setMilestones(list);
        if (list.length > 0) {
          setExpandedMilestoneId(prev => prev || list[0].id);
        }
      } else {
        setMilestones([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [contractId]);

  const openWithdrawDialog = (milestone: Milestone) => {
    setWithdrawalError(null);
    setWithdrawDialogMilestone(milestone);
  };

  const closeWithdrawDialog = () => {
    if (withdrawingMilestoneId) return;
    setWithdrawDialogMilestone(null);
  };

  const handleWithdrawMilestone = async () => {
    if (!contractId || !withdrawDialogMilestone || withdrawingMilestoneId || withdrawalRequestInFlightRef.current) return;

    const milestoneId = withdrawDialogMilestone.id;
    withdrawalRequestInFlightRef.current = true;
    setWithdrawingMilestoneId(milestoneId);
    setWithdrawalError(null);
    try {
      const response = await contractPostAPI.withdrawMilestone(contractId, milestoneId);

      if (!response.success) {
        const message = response.message || t('workspace.failedWithdrawFundsError');
        setWithdrawalError({ milestoneId, message });
        if (response.statusCode === 409) {
          setWithdrawDialogMilestone(null);
          await loadData();
        }
        return;
      }

      setWithdrawDialogMilestone(null);
      toast.success(response.message || t('earlyWithdrawal.success'));
      await loadData();
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    } catch {
      setWithdrawalError({ milestoneId, message: t('workspace.failedWithdrawFundsError') });
    } finally {
      withdrawalRequestInFlightRef.current = false;
      setWithdrawingMilestoneId(null);
    }
  };

  // Calculate remaining budget
  const calculateRemainingBudget = () => {
    if (!contract) return 0;
    const usedBudget = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    return contract.totalBudget - usedBudget;
  };

  const getBudgetExceededMessage = () => {
    const totalBudget = contract?.totalBudget || 0;
    const allocatedBudget = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    const exceededAmount = allocatedBudget - totalBudget;

    return `Allocated Budget exceeds Total Budget by ${formatContractAmount(exceededAmount)}.`;
  };

  const validateAllocatedBudget = () => {
    if (!contract) return true;

    const allocatedBudget = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    if (allocatedBudget <= contract.totalBudget) {
      return true;
    }

    const message = getBudgetExceededMessage();
    setError(message);
    toast.error(message);
    return false;
  };

  // Validate form
  const validateForm = (data: MilestoneFormData): string | null => {
    if (!data.title.trim() || data.title.trim().length > 255) {
      return 'Milestone title must be 1-255 characters (BR-54)';
    }

    if (data.amount <= 0) {
      return 'Milestone amount must be greater than 0';
    }

    if (shouldEnforceBudgetTotal) {
      const budgetUsedByOtherMilestones = milestones
        .filter(m => m.id !== editingId)
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const maxAllowed = (contract?.totalBudget || 0) - budgetUsedByOtherMilestones;
      if (data.amount > maxAllowed) {
        return `Milestone amount exceeds remaining budget of ${formatContractAmount(maxAllowed)}`;
      }
    }

    if (!data.due_date) {
      return 'Due date is required';
    }

    const dueDate = new Date(data.due_date);
    const today = new Date();
    if (dueDate <= today) {
      return 'Milestone deadline must be a future date';
    }

    return null;
  };

  const handleCreateClick = () => {
    if (!canEditMilestones) {
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    setEditingId(null);
    setFormData({
      title: '',
      amount: 0,
      due_date: '',
      description: '',
      deliverables: '',
      acceptanceCriteria: '',
    });
    setShowCreateForm(true);
  };

  const handleEditClick = (milestone: Milestone) => {
    if (!canEditMilestones) {
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    setEditingId(milestone.id);
    setFormData({
      title: milestone.title,
      amount: milestone.amount,
      due_date: milestone.due_date,
      description: milestone.description ?? '',
      deliverables: milestone.deliverables ?? '',
      acceptanceCriteria: milestone.acceptanceCriteria ?? '',
    });
    setShowCreateForm(true);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      amount: 0,
      due_date: '',
      description: '',
      deliverables: '',
      acceptanceCriteria: '',
    });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEditMilestones) {
      setError('Milestones are locked for this contract stage.');
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    if (editingId) {
      // Update local state
      setMilestones(prev =>
        prev.map(m =>
          m.id === editingId
            ? {
                ...m,
                title: formData.title.trim(),
                amount: formData.amount,
                due_date: formData.due_date,
                description: formData.description?.trim() || null,
                deliverables: formData.deliverables?.trim() || null,
                acceptanceCriteria: formData.acceptanceCriteria?.trim() || null,
              }
            : m
        )
      );
      setSuccessMessage('Milestone updated locally. Click Save to persist.');
    } else {
      // Add local state
      const nextMilestone: Milestone = {
        id: createClientMilestoneId(),
        contract_id: contractId!,
        title: formData.title.trim(),
        amount: formData.amount,
        due_date: formData.due_date,
        description: formData.description?.trim() || null,
        deliverables: formData.deliverables?.trim() || null,
        acceptanceCriteria: formData.acceptanceCriteria?.trim() || null,
        status: MilestoneStatus.Pending,
        paid_at: null,
        workItems: [],
      };

      setMilestones(prev => [...prev, nextMilestone]);
      setSuccessMessage('Milestone added locally. Click Save to persist.');
    }

    handleCancelForm();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    if (!canEditMilestones) {
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this milestone locally?')) {
      return;
    }

    setError(null);
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
    setSuccessMessage('Milestone deleted locally. Click Save to persist.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Shared helper: builds the milestone payload including existing workItems so
  // the backend validator doesn't reject milestones that already have work items.
  const buildMilestonesPayload = () => ({
    milestones: milestones.map(m => ({
      milestoneId: isClientMilestoneId(m.id) ? null : m.id,
      title: m.title,
      amount: m.amount,
      dueDate: m.due_date,
      sortOrder: null,
      description: m.description ?? null,
      estimatedDuration: m.estimatedDuration ?? null,
      deliverables: m.deliverables ?? null,
      acceptanceCriteria: m.acceptanceCriteria ?? null,
      workItems: (m.workItems ?? []).map((wi, idx) => ({
        workItemId: wi.workItemId ?? null,
        title: wi.title,
        description: wi.description ?? null,
        deliverables: wi.deliverables ?? null,
        estimatedDuration: wi.estimatedDuration ?? null,
        orderIndex: wi.orderIndex ?? idx,
      })),
    })),
  });

  const handleSaveDraft = async () => {
    if (!canEditMilestones) {
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    if (!validateAllocatedBudget()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await contractPutAPI.updateDetails(contractId!, buildMilestonesPayload());
      if (!response.success) {
        throw new Error(response.message || 'Failed to save milestones draft.');
      }

      toast.success('Milestones draft saved successfully.');
      setSuccessMessage('Milestones saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reload to get real Guids for newly created milestones
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
      toast.error(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!canEditMilestones) {
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    if (milestones.length === 0) {
      setError('At least one milestone is required.');
      toast.error('At least one milestone is required.');
      return;
    }

    if (!validateAllocatedBudget()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Bulk save milestones (with workItems so validator doesn't reject)
      const saveResponse = await contractPutAPI.updateDetails(contractId!, buildMilestonesPayload());
      if (!saveResponse.success) {
        throw new Error(saveResponse.message || 'Failed to save milestones.');
      }

      // 2. Call complete setup
      const completeResponse = await contractPostAPI.completeJobPostSetup(contractId!);
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || 'Failed to complete job setup and publish.');
      }

      toast.success('Milestones setup complete! Job post published successfully.');
      navigate('/jobs/my-jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
      toast.error(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDetails = async () => {
    if (!canEditMilestones) {
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    const remaining = calculateRemainingBudget();
    if (remaining < 0) {
      const message = getBudgetExceededMessage();
      setError(message);
      toast.error(message);
      return;
    }

    if (remaining !== 0) {
      setError('Allocated milestones sum must exactly match the total contract budget.');
      toast.error('Allocated milestones sum must exactly match the total contract budget.');
      return;
    }
    if (milestones.length === 0) {
      setError('At least one milestone is required.');
      toast.error('At least one milestone is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Bulk save milestones (with workItems so validator doesn't reject)
      const saveResponse = await contractPutAPI.updateDetails(contractId!, buildMilestonesPayload());
      if (!saveResponse.success) {
        throw new Error(saveResponse.message || 'Failed to save milestones.');
      }

      // 2. Submit contract details for review
      const submitResponse = await contractPostAPI.submitDetails(contractId!);
      if (!submitResponse.success) {
        throw new Error(submitResponse.message || 'Failed to submit contract details.');
      }

      toast.success('Milestones submitted successfully for freelancer review.');
      navigate('/jobs/my-jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit details');
      toast.error(err instanceof Error ? err.message : 'Failed to submit details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout fullWidth>
        <LemniscateBloomLoader label={t('contracts.loadingMilestones')} />
      </AppLayout>
    );
  }
  const remainingBudget = calculateRemainingBudget();
  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const isBudgetExceeded = remainingBudget < 0;
  const completedMilestones = milestones.filter(isMilestoneCompleteForReview).length;

  const getNodeGlowClass = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.Approved:
      case MilestoneStatus.Completed:
        return 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)] text-emerald-500';
      case MilestoneStatus.Submitted:
        return 'bg-purple-500/10 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.25)] text-purple-500';
      case MilestoneStatus.InProgress:
        return 'bg-blue-500/10 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.25)] text-blue-500 animate-pulse';
      case MilestoneStatus.Pending:
      default:
        return 'bg-secondary border-border/80 dark:border-border-strong/60 shadow-sm text-text-muted';
    }
  };

  const getNodeIcon = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.Approved:
      case MilestoneStatus.Completed:
        return <CheckCircle2 size={10} strokeWidth={2.5} className="text-emerald-500" />;
      case MilestoneStatus.Submitted:
        return <Layers size={10} className="text-purple-500" />;
      case MilestoneStatus.InProgress:
        return <Clock size={10} className="text-blue-500" />;
      case MilestoneStatus.Pending:
      default:
        return <div className="w-1.5 h-1.5 rounded-full bg-text-muted/60" />;
    }
  };

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="bg-background min-h-[calc(100vh-4rem)] flex flex-col text-left font-sans text-text-primary">
        
        {/* Top Header Bar */}
        <header className="ms-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="back-button shrink-0 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer shadow-xs"
                title="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <div className="mb-0.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-brand">
                  <Sparkles size={13} />
                  {t('contracts.milestonesManagement', { defaultValue: 'Milestones Management' })}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-text-primary flex flex-wrap items-center gap-2.5 truncate">
                  <span className="truncate max-w-[200px] md:max-w-xl">{contract?.title}</span>
                  <span className="text-brand italic font-light">Milestones</span>
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="mx-auto max-w-[1600px] w-full space-y-6 px-4 py-6 lg:px-8 flex-1">

          {/* Messages */}
          {(successMessage || error) && (
            <div className="mb-4 shrink-0">
              {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl p-3 flex items-center justify-between shadow-sm relative z-20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <p className="font-semibold text-xs">{successMessage}</p>
                  </div>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="p-1 text-emerald-500/60 hover:text-emerald-500 cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 flex items-center justify-between shadow-sm relative z-20">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <p className="font-semibold text-xs">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="p-1 text-destructive/60 hover:text-destructive cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Main Layout Grid */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
            
            {/* Left Column: Milestones List & Form (scrollable) */}
            <div className="ms-gsap-main col-span-12 lg:col-span-8 flex flex-col lg:h-full min-h-0 lg:overflow-hidden">
              
              {/* Create/Edit Form panel */}
              {isClient && showCreateForm && (
                <div className="mb-5 shrink-0">
                  <div className="glass-card p-5 relative">
                    <div className="form-header flex justify-between items-center pb-2 border-b border-border/20 mb-4">
                      <h3 className="form-title text-xs font-bold text-foreground font-zentry uppercase tracking-wider flex items-center gap-1.5">
                        {editingId ? t('contracts.editMilestoneDetails') : t('contracts.createNewMilestone')}
                      </h3>
                      <button
                        onClick={handleCancelForm}
                        className="p-1.5 bg-secondary/55 hover:bg-secondary border border-border/50 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitForm} className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1 text-left">
                        <label htmlFor="title" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {t('contracts.milestoneTitle')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="title"
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder={t('contracts.milestoneTitlePlaceholder')}
                          className="form-input-custom text-xs py-2 px-3"
                          maxLength={255}
                        />
                        <div className="text-[9px] text-muted-foreground mt-0.5 font-semibold text-right">
                          {formData.title.length}/255 {t('contracts.characters')}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 text-left">
                          <label htmlFor="amount" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {t('contracts.amountGigcoin')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="amount"
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="form-input-custom text-xs py-2 px-3"
                            min="0"
                          />
                        </div>

                        <div className="flex flex-col gap-1 text-left">
                          <label htmlFor="due_date" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {t('contracts.dueDate')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="due_date"
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="form-input-custom text-xs py-2 px-3"
                          />
                        </div>
                      </div>

                      {/* Deliverables */}
                      <div className="flex flex-col gap-1 text-left">
                        <label htmlFor="deliverables" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Deliverables
                        </label>
                        <textarea
                          id="deliverables"
                          value={formData.deliverables ?? ''}
                          onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                          placeholder="List the expected outputs or deliverables for this milestone…"
                          className="form-input-custom text-xs py-2 px-3 resize-none"
                          rows={3}
                        />
                      </div>

                      {/* Acceptance Criteria */}
                      <div className="flex flex-col gap-1 text-left">
                        <label htmlFor="acceptanceCriteria" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Acceptance Criteria
                        </label>
                        <textarea
                          id="acceptanceCriteria"
                          value={formData.acceptanceCriteria ?? ''}
                          onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                          placeholder="Define what 'done' looks like — conditions the client will verify before approving…"
                          className="form-input-custom text-xs py-2 px-3 resize-none"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleCancelForm}
                          className="px-4 py-2 bg-secondary/60 hover:bg-secondary border border-border/50 text-foreground rounded-lg text-[10px] font-bold cursor-pointer"
                          disabled={isSubmitting}
                        >
                          {t('contracts.cancel')}
                        </button>
                        <button
                          type="submit"
                          className="btn-primary-custom px-4 py-2 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="spinner-small"></span>
                              {t('contracts.saving')}
                            </>
                          ) : (
                            <>
                              <Save size={12} />
                              {editingId ? t('contracts.update') : t('contracts.create')}
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Milestones list container with timeline track line */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden text-left">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h2 className="text-sm font-bold text-foreground font-zentry uppercase tracking-wider">
                    {t('contracts.milestonesTimeline', { count: milestones.length })}
                  </h2>
                  {isClient && (
                    <button
                      onClick={handleCreateClick}
                      className="btn-primary-custom px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      disabled={showCreateForm || !canEditMilestones}
                    >
                      <Plus size={13} />
                      {t('contracts.newMilestone')}
                    </button>
                  )}
                </div>

                {/* Vertical timeline spine line */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                  {milestones.length === 0 ? (
                    <div className="empty-state py-12 px-6 glass-card border-dashed text-center">
                      <div className="w-12 h-12 rounded-full bg-secondary/50 text-muted-foreground flex items-center justify-center mx-auto mb-3 border border-border/40">
                        <Clock size={20} />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{t('contracts.noMilestonesPlanned')}</h3>
                      <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
                        {t('contracts.noMilestonesPlannedDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-border/30 dark:border-border-strong/30 ml-3 pl-6 space-y-5 py-2">
                      {milestones.map((milestone, index) => {
                        const isExpanded = expandedMilestoneId === milestone.id;
                        const isCompleted = isMilestoneCompleteForReview(milestone);
                        const withdrawalEligibility = getEarlyWithdrawalEligibility(
                          milestones,
                          milestone,
                          contract?.status,
                          isFreelancer,
                        );
                        const isReleasedInFull = milestone.amount > 0 && Number(milestone.releasedAmount ?? 0) >= milestone.amount;

                        return (
                          <div key={milestone.id} className="relative">
                            
                            {/* Centered Timeline Dot */}
                            <div className={`absolute -left-[34px] top-6 w-5 h-5 rounded-full border-2 border-background dark:border-background flex items-center justify-center z-10 transition-all duration-300 ${getNodeGlowClass(milestone.status)}`}>
                              {getNodeIcon(milestone.status)}
                            </div>

                            {/* Milestone card wrapper */}
                            <div className={`milestone-card glass-card flex flex-col ${isExpanded ? 'expanded' : ''}`}>
                              {/* Glowing Left Indicator track line */}
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-1" 
                                style={{ 
                                  backgroundColor: isCompleted ? '#10B981' : 
                                    (milestone.status === MilestoneStatus.InProgress ? '#3B82F6' : '#A855F7') 
                                }}
                              />

                              {/* Card Header Content */}
                              <div className="p-4 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                  <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center text-xs font-black text-foreground shrink-0">
                                    #{index + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-foreground truncate">{milestone.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`milestone-status-badge status-${milestone.status}`}>
                                        {milestone.status === MilestoneStatus.Pending ? (
                                          <>
                                            <Clock size={10} className="text-amber-500 animate-pulse" />
                                            {getMilestoneDisplayLabel(milestone)}
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle2 size={10} className="text-emerald-500" />
                                            {getMilestoneDisplayLabel(milestone)}
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
 
                                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                                  <div className="flex items-center gap-0.5 font-black text-foreground text-xs">
                                    <GigCoinLogo size={12} />
                                    {formatContractAmount(milestone.amount)}
                                  </div>
 
                                  <button
                                    type="button"
                                    aria-label={t('contracts.toggleMilestoneDetails', { title: milestone.title })}
                                    onClick={() =>
                                      setExpandedMilestoneId(
                                        expandedMilestoneId === milestone.id ? null : milestone.id
                                      )
                                    }
                                    className={`p-1.5 bg-secondary/50 border border-border/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer ${isExpanded ? 'rotate-180' : ''}`}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                              </div>                              {/* Card Body - Collapsed / Preview info */}
                              <div className="px-4 pl-6 pb-3 pt-0 border-t border-border/10 mt-0.5 flex flex-col gap-2 text-[11px] text-text-muted font-semibold">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-text-muted">
                                    <Calendar size={12} className="text-brand" />
                                    <span>{t('contracts.dueDate')}: <strong className="text-text-primary">{formatContractDate(milestone.due_date)}</strong></span>
                                  </div>

                                  {milestone.workItems && milestone.workItems.length > 0 && (
                                    <span className="px-2 py-0.5 bg-brand/10 text-brand border border-brand/20 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                      <Layers size={10} />
                                      {milestone.workItems.length} Work Item(s)
                                    </span>
                                  )}
                                </div>

                                {milestone.description && (
                                  <p className="text-xs text-text-secondary font-medium line-clamp-2 bg-surface-muted/30 p-2.5 rounded-xl border border-border/50">
                                    {milestone.description}
                                  </p>
                                )}
                              </div>

                              {/* Card Body - Expanded Details & Workflows */}
                              {isExpanded && (
                                <div className="px-4 pl-6 pb-4 pt-3 border-t border-border/30 bg-surface-muted/20 flex flex-col gap-3 text-xs">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">{t('contracts.amount')}</span>
                                      <span className="font-extrabold text-brand text-sm mt-0.5">{formatContractAmount(milestone.amount)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">{t('contracts.deadline')}</span>
                                      <span className="font-semibold text-text-primary mt-0.5">{formatContractDate(milestone.due_date)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">{t('contracts.status')}</span>
                                      <span className="font-semibold text-text-primary mt-0.5">
                                        {getMilestoneDisplayLabel(milestone)}
                                      </span>
                                    </div>
                                    {milestone.paid_at && (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">{t('contracts.paidAt')}</span>
                                        <span className="font-semibold text-emerald-500 mt-0.5">{formatContractDate(milestone.paid_at)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Deliverables / Acceptance Criteria if present */}
                                  {milestone.deliverables && (
                                    <div className="p-3 bg-background rounded-xl border border-border space-y-1 text-left">
                                      <span className="text-[9px] font-black text-brand uppercase tracking-wider block">Deliverables</span>
                                      <p className="text-xs text-text-secondary font-medium leading-relaxed">{milestone.deliverables}</p>
                                    </div>
                                  )}

                                  {milestone.acceptanceCriteria && (
                                    <div className="p-3 bg-background rounded-xl border border-border space-y-1 text-left">
                                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider block">Acceptance Criteria</span>
                                      <p className="text-xs text-text-secondary font-medium leading-relaxed">{milestone.acceptanceCriteria}</p>
                                    </div>
                                  )}

                                  {/* Work Items WBS List */}
                                  {milestone.workItems && milestone.workItems.length > 0 && (
                                    <div className="p-3 bg-background rounded-xl border border-border space-y-2 text-left">
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">
                                        Work Breakdown Structure ({milestone.workItems.length})
                                      </span>
                                      <div className="space-y-1.5">
                                        {milestone.workItems.map((item, idx) => (
                                          <div key={item.workItemId || idx} className="flex items-center justify-between p-2 rounded-lg bg-surface-muted/40 text-xs font-semibold">
                                            <span className="text-text-primary truncate">{item.title}</span>
                                            {item.estimatedDuration && (
                                              <span className="text-[10px] text-text-muted shrink-0">{item.estimatedDuration}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Status Workflow Controls */}
                                  {contract && contract.status === ContractStatus.Active && (
                                    <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl text-left flex flex-col gap-2">
                                      <span className="text-[9px] font-black text-brand uppercase tracking-wider">{t('contracts.workflow')}</span>
                                      <div className="flex flex-wrap gap-2">
                                        {isFreelancer && milestone.status === MilestoneStatus.InProgress && (
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/contracts/${contractId}/deliverables/${milestone.id}`)}
                                            className="px-3 py-2 bg-brand text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-brand-hover"
                                          >
                                            <CheckCircle2 size={13} />
                                            {t('contracts.submitDeliverables')}
                                          </button>
                                        )}
                                        {isClient && milestone.status === MilestoneStatus.Submitted && (
                                          <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => navigate(`/contracts/${contractId}/milestones/${milestone.id}/approve`)}
                                            className="px-3 py-2 bg-brand text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs hover:bg-brand-hover"
                                          >
                                            <Eye size={13} />
                                            {t('contracts.reviewSubmittedWork')}
                                          </button>
                                        )}
                                        {isFreelancer && withdrawalEligibility.isApproved && !isReleasedInFull && (
                                          withdrawalEligibility.isAtCap ? (
                                            <span className="px-3 py-2 text-xs font-black text-emerald-600">
                                              {t('earlyWithdrawal.maximumReached')}
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={Boolean(withdrawingMilestoneId) || !withdrawalEligibility.meetsApprovalThreshold}
                                              onClick={() => openWithdrawDialog(milestone)}
                                              title={withdrawalEligibility.meetsApprovalThreshold
                                                ? t('earlyWithdrawal.actionTooltip')
                                                : t('earlyWithdrawal.thresholdTooltip', {
                                                    approved: withdrawalEligibility.approvedMilestones,
                                                    required: withdrawalEligibility.requiredApprovedMilestones,
                                                  })}
                                              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              <GigCoinLogo size={12} />
                                              {t('earlyWithdrawal.action')} ({formatContractAmount(withdrawalEligibility.availableAmount)})
                                            </button>
                                          )
                                        )}
                                      </div>
                                      {isFreelancer && withdrawalEligibility.isApproved && !withdrawalEligibility.isAtCap && !withdrawalEligibility.meetsApprovalThreshold && (
                                        <p className="text-[10px] font-semibold text-amber-600">
                                          {t('earlyWithdrawal.thresholdWarning', {
                                            approved: withdrawalEligibility.approvedMilestones,
                                            required: withdrawalEligibility.requiredApprovedMilestones,
                                          })}
                                        </p>
                                      )}
                                      {withdrawalError?.milestoneId === milestone.id && (
                                        <p className="text-[10px] font-semibold text-red-500" role="alert">
                                          {withdrawalError.message}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Actions panel for Edit/Delete */}
                                  {isClient && (
                                    <div className="flex gap-2 border-t border-border pt-3 mt-1 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(milestone)}
                                        className="px-3 py-1.5 bg-surface-muted hover:bg-brand/10 border border-border hover:border-brand/40 text-text-primary hover:text-brand rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs transition"
                                        disabled={!canEditMilestones || !canEditMilestone(milestone.status)}
                                      >
                                        <Edit size={12} />
                                        {t('common.edit')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMilestone(milestone.id)}
                                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs transition"
                                        disabled={!canEditMilestones || !canEditMilestone(milestone.status)}
                                      >
                                        <Trash2 size={12} />
                                        {t('common.delete')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Stacked KPI Overview Summary Panel */}
            <div className="ms-gsap-sidebar col-span-12 lg:col-span-4 flex flex-col gap-4 lg:h-full min-h-0 lg:overflow-y-auto pb-6 lg:pb-0 shrink-0">
              
              {/* Stacked KPI list in side panel */}
              <div className="glass-card p-5 flex flex-col gap-4 text-left">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest border-b border-border/20 pb-2">
                  {t('contracts.budgetSummary')}
                </h3>

                <div className="flex flex-col gap-3">
                  {/* Allocation Progress Bar */}
                  <div className="space-y-1.5 pb-2 border-b border-border">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                      <span className="text-text-muted">Allocation Progress</span>
                      <span className={isBudgetExceeded ? 'text-rose-500 font-extrabold' : 'text-brand font-extrabold'}>
                        {contract?.totalBudget && contract.totalBudget > 0
                          ? Math.min(100, Math.round((totalMilestoneAmount / contract.totalBudget) * 100))
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-muted border border-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isBudgetExceeded
                            ? 'bg-rose-500'
                            : (totalMilestoneAmount === (contract?.totalBudget || 0) && (contract?.totalBudget || 0) > 0)
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-brand to-indigo-500'
                        }`}
                        style={{
                          width: `${contract?.totalBudget && contract.totalBudget > 0
                            ? Math.min(100, Math.round((totalMilestoneAmount / contract.totalBudget) * 100))
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Total Budget */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-blue-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.totalBudget')}</span>
                      <span className="text-lg font-black text-foreground mt-0.5 block">{formatContractAmount(contract?.totalBudget || 0)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <GigCoinLogo size={15} />
                    </div>
                  </div>

                  {/* Allocated Budget */}
                  <div className={`flex items-center justify-between p-3 bg-secondary/30 rounded-xl border transition-all ${isBudgetExceeded ? 'border-red-500/50 hover:border-red-500/70' : 'border-border/20 hover:border-purple-500/20'}`}>
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.allocatedBudget')}</span>
                      <span className={`text-lg font-black mt-0.5 block ${isBudgetExceeded ? 'text-red-500' : 'text-foreground'}`}>{formatContractAmount(totalMilestoneAmount)}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBudgetExceeded ? 'bg-red-500/10 text-red-500' : 'bg-purple-500/10 text-purple-500'}`}>
                      {isBudgetExceeded ? <AlertCircle size={15} /> : <Layers size={15} />}
                    </div>
                  </div>

                  {/* Remaining Budget */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-emerald-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.remainingBudget')}</span>
                      <span className={`text-lg font-black mt-0.5 block ${isBudgetExceeded ? 'text-red-500' : remainingBudget === 0 ? 'text-amber-500' : 'text-foreground'}`}>
                        {formatContractAmount(remainingBudget)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <ShieldAlert size={15} />
                    </div>
                  </div>

                  {isBudgetExceeded && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Allocated Budget cannot exceed Total Budget.</span>
                    </div>
                  )}

                  {/* Milestone Completion */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-amber-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">{t('contracts.milestonesCompletion')}</span>
                      <span className="text-lg font-black text-foreground mt-0.5 block">
                        {completedMilestones} <span className="text-[10px] font-semibold text-muted-foreground">/ {milestones.length} {t('contracts.approvedMilestonesCount')}</span>
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <TrendingUp size={15} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Navigation Actions */}
              <div className="glass-card p-5 flex flex-col gap-2 text-left">
                {isClient && (
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || milestones.length === 0 || !canEditMilestones || isBudgetExceeded}
                    className="w-full py-2.5 bg-secondary/40 hover:bg-secondary/60 border border-border/50 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save size={13} />
                    {t('contracts.saveDraft')}
                  </button>
                )}

                {isClient && mode === 'jobpost-setup' && (
                  <button
                    onClick={handleCompleteSetup}
                    disabled={isSubmitting || milestones.length === 0 || !canEditMilestones || isBudgetExceeded}
                    className="w-full py-2.5 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white border-none rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} />
                    {t('contracts.completeSetup')}
                  </button>
                )}

                {isClient && mode === 'contract-edit' && (
                  <button
                    onClick={handleSubmitDetails}
                    disabled={isSubmitting || milestones.length === 0 || remainingBudget !== 0 || isBudgetExceeded}
                    className="w-full py-2.5 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white border-none rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send size={13} />
                    {t('contracts.submitToFreelancer')}
                  </button>
                )}

                <button
                  onClick={() => navigate(`/contracts/${contractId}`)}
                  className="w-full py-2.5 bg-secondary/40 hover:bg-secondary/60 border border-border/50 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Eye size={13} />
                  {t('contracts.viewContractDetails')}
                </button>
              </div>

            </div>
          </div>

        </main>
      </div>
        <EarlyWithdrawalDialog
          open={Boolean(withdrawDialogMilestone)}
          milestoneTitle={withdrawDialogMilestone?.title || ''}
          availableAmount={withdrawDialogMilestone
            ? getEarlyWithdrawalEligibility(milestones, withdrawDialogMilestone, contract?.status, isFreelancer).availableAmount
            : 0}
          submitting={Boolean(withdrawDialogMilestone && withdrawingMilestoneId === withdrawDialogMilestone.id)}
          error={withdrawDialogMilestone && withdrawalError?.milestoneId === withdrawDialogMilestone.id
            ? withdrawalError.message
            : null}
          onConfirm={handleWithdrawMilestone}
          onCancel={closeWithdrawDialog}
        />
      </AppLayout>
  );
}
