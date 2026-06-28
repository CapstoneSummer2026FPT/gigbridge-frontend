import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  Plus, Edit, Trash2, AlertCircle, CheckCircle2, Clock, DollarSign,
  Calendar, ChevronDown, Save, X, Eye, ArrowLeft, Layers, ShieldAlert,
  TrendingUp, Send
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import { MilestoneStatus, ContractStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import { canEditMilestone, getMilestoneStatusLabel, formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import { toast } from 'sonner';
import '../styles/manage-milestones-screen.css';

interface MilestoneFormData {
  title: string;
  amount: number;
  due_date: string;
  description?: string;
}

export default function ManageMilestonesScreen() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useApp();

  const stateContract = location.state?.contractForm;
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
  });
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canEditMilestones = contract
    ? contract.status === ContractStatus.PendingFreelancerSelection ||
      contract.status === ContractStatus.InNegotiation ||
      contract.status === ContractStatus.PendingContractDetails
    : false;
  const shouldEnforceBudgetTotal = mode === 'contract-edit';
  const isClient = role === UserRole.Client;
  const isFreelancer = role === UserRole.Freelancer;
  const baselineReleasePercentage = 0.8;
  const getBaselineReleaseCap = (milestone: Milestone) => Number((milestone.amount * baselineReleasePercentage).toFixed(2));
  const isMilestoneReleasedToCap = (milestone: Milestone) => (milestone.releasedAmount ?? 0) >= getBaselineReleaseCap(milestone);
  const isMilestoneCompleteForReview = (milestone: Milestone) =>
    milestone.status === MilestoneStatus.PaymentConfirmed || isMilestoneReleasedToCap(milestone);
  const getMilestoneDisplayLabel = (milestone: Milestone) =>
    isMilestoneReleasedToCap(milestone) ? 'Paid' : getMilestoneStatusLabel(milestone.status);

  // Load contract and milestones
  const loadData = async () => {
    if (!contractId) {
      setError('No contract ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // If contract details are passed via state, prioritize them
      if (stateContract && stateContract.contractsId === contractId) {
        setContract(stateContract);
        setMilestones([]); // Newly created contract has no milestones initially
        setLoading(false);
        return;
      }

      const contractResponse = await contractGetAPI.getContractById(contractId);

      if (!contractResponse.success || !contractResponse.data) {
        throw new Error(contractResponse.message || 'Failed to load contract');
      }

      setContract(contractResponse.data);

      // Fetch milestones
      const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
      if (milestonesResponse.success && milestonesResponse.data) {
        setMilestones(milestonesResponse.data);
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
  }, [contractId, stateContract]);

  // Calculate remaining budget
  const calculateRemainingBudget = () => {
    if (!contract) return 0;
    const usedBudget = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    return Math.max(0, contract.totalBudget - usedBudget);
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
      description: '',
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
            ? { ...m, title: formData.title.trim(), amount: formData.amount, due_date: formData.due_date }
            : m
        )
      );
      setSuccessMessage('Milestone updated locally. Click Save to persist.');
    } else {
      // Add local state
      const nextMilestone: Milestone = {
        id: `milestone_mock_${Date.now()}`,
        contract_id: contractId!,
        title: formData.title.trim(),
        amount: formData.amount,
        due_date: formData.due_date,
        status: MilestoneStatus.Pending,
        paid_at: null,
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

  const handleSaveDraft = async () => {
    if (!canEditMilestones) {
      toast.info('Milestones are locked for this contract stage.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        milestones: milestones.map(m => ({
          milestoneId: m.id.startsWith('milestone_mock_') ? null : m.id,
          title: m.title,
          amount: m.amount,
          dueDate: m.due_date,
          sortOrder: null,
        })),
      };

      const response = await contractPutAPI.updateDetails(contractId!, payload);
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
    if (milestones.length === 0) {
      setError('At least one milestone is required.');
      toast.error('At least one milestone is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Bulk save milestones
      const payload = {
        milestones: milestones.map(m => ({
          milestoneId: m.id.startsWith('milestone_mock_') ? null : m.id,
          title: m.title,
          amount: m.amount,
          dueDate: m.due_date,
          sortOrder: null,
        })),
      };

      const saveResponse = await contractPutAPI.updateDetails(contractId!, payload);
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
    const remaining = calculateRemainingBudget();
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

      // 1. Bulk save milestones
      const payload = {
        milestones: milestones.map(m => ({
          milestoneId: m.id.startsWith('milestone_mock_') ? null : m.id,
          title: m.title,
          amount: m.amount,
          dueDate: m.due_date,
          sortOrder: null,
        })),
      };

      const saveResponse = await contractPutAPI.updateDetails(contractId!, payload);
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

  const handleMilestoneWorkflowAction = async (
    milestoneId: string,
    action: 'start' | 'approve' | 'request-revision' | 'withdraw'
  ) => {
    if (!contractId) return;

    try {
      setError(null);
      setIsSubmitting(true);

      const response = action === 'start'
        ? await contractPostAPI.startMilestone(contractId, milestoneId)
        : action === 'approve'
          ? await contractPostAPI.approveMilestone(contractId, milestoneId)
          : action === 'request-revision'
            ? await contractPostAPI.requestMilestoneRevision(contractId, milestoneId)
            : await contractPostAPI.withdrawMilestone(contractId, milestoneId);

      if (!response.success) {
        throw new Error(response.message || 'Milestone action failed.');
      }

      const message = action === 'start'
        ? 'Milestone started.'
        : action === 'approve'
          ? 'Milestone approved.'
          : action === 'request-revision'
            ? 'Revision requested.'
            : 'Milestone payout released.';

      toast.success(message);
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update milestone workflow');
      toast.error(err instanceof Error ? err.message : 'Failed to update milestone workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="manage-milestones-wrapper">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading milestones...</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  const remainingBudget = calculateRemainingBudget();
  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const completedMilestones = milestones.filter(isMilestoneCompleteForReview).length;

  const getNodeGlowClass = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.PaymentConfirmed:
        return 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] text-white';
      case MilestoneStatus.Approved:
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
      case MilestoneStatus.PaymentConfirmed:
        return <CheckCircle2 size={10} strokeWidth={3} className="text-white" />;
      case MilestoneStatus.Approved:
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
    <AppLayout excludeMeshGradient>
      <div className="bg-background h-auto lg:h-[calc(100vh-7.5rem)] flex flex-col relative w-full lg:overflow-hidden text-left font-sans">
        
        {/* Structural Typography & Ambient Orbs in Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <div className="client-dash-glow-orb orb-purple absolute" />
          <div className="client-dash-glow-orb orb-cyan absolute" />
          <div className="client-dash-glow-orb orb-blue absolute" />

          <div className="absolute -top-10 -left-10 text-[20vw] font-black text-primary/[0.008] dark:text-primary/[0.004] avant-garde-heading uppercase leading-none">
            MILESTONES
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-4 md:px-8 py-6 lg:overflow-hidden min-h-0">
          
          {/* Shrunken, Compact Header Top-Bar */}
          <header className="flex items-center justify-between border-b border-border/30 pb-4 mb-5 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="back-button shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                title="Go back"
              >
                <ArrowLeft size={15} />
              </button>
              {contract && (
                <h1 className="text-sm font-semibold text-text-secondary flex items-center">
                  <span className="font-bold text-primary truncate max-w-md md:max-w-xl">{contract.title}</span>
                  <span className="mx-2 text-text-subtle">/</span>
                  <span className="text-text-primary font-black uppercase tracking-wider text-xs">Milestones</span>
                </h1>
              )}
            </div>
          </header>

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
            <div className="col-span-12 lg:col-span-8 flex flex-col lg:h-full min-h-0 lg:overflow-hidden">
              
              {/* Create/Edit Form panel */}
              {showCreateForm && (
                <div className="mb-5 shrink-0">
                  <div className="glass-card p-5 relative">
                    <div className="form-header flex justify-between items-center pb-2 border-b border-border/20 mb-4">
                      <h3 className="form-title text-xs font-bold text-foreground font-zentry uppercase tracking-wider flex items-center gap-1.5">
                        {editingId ? '✏️ Edit Milestone Details' : '➕ Create New Milestone'}
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
                          Milestone Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="title"
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Prototype Design draft"
                          className="form-input-custom text-xs py-2 px-3"
                          maxLength={255}
                        />
                        <div className="text-[9px] text-muted-foreground mt-0.5 font-semibold text-right">
                          {formData.title.length}/255 characters
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 text-left">
                          <label htmlFor="amount" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Amount (USD) <span className="text-red-500">*</span>
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
                            Due Date <span className="text-red-500">*</span>
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

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleCancelForm}
                          className="px-4 py-2 bg-secondary/60 hover:bg-secondary border border-border/50 text-foreground rounded-lg text-[10px] font-bold cursor-pointer"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary-custom px-4 py-2 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="spinner-small"></span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={12} />
                              {editingId ? 'Update' : 'Create'}
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
                    Milestones Timeline ({milestones.length})
                  </h2>
                  <button
                    onClick={handleCreateClick}
                    className="btn-primary-custom px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    disabled={showCreateForm || !canEditMilestones}
                  >
                    <Plus size={13} />
                    New Milestone
                  </button>
                </div>

                {/* Vertical timeline spine line */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                  {milestones.length === 0 ? (
                    <div className="empty-state py-12 px-6 glass-card border-dashed text-center">
                      <div className="w-12 h-12 rounded-full bg-secondary/50 text-muted-foreground flex items-center justify-center mx-auto mb-3 border border-border/40">
                        <Clock size={20} />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">No milestones planned</h3>
                      <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
                        Define structured payments & delivery items to track project achievements.
                      </p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-border/30 dark:border-border-strong/30 ml-3 pl-6 space-y-5 py-2">
                      {milestones.map((milestone, index) => {
                        const isExpanded = expandedMilestoneId === milestone.id;
                        const isCompleted = isMilestoneCompleteForReview(milestone);

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
                                    <DollarSign size={12} className="text-muted-foreground" />
                                    {formatContractAmount(milestone.amount)}
                                  </div>
 
                                  <button
                                    type="button"
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
                              </div>
 
                              {/* Card Body - Collapsed (Due Date display only) */}
                              <div className="px-4 pl-6 pb-3 pt-0 border-t border-border/10 mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                                <Calendar size={12} />
                                <span>Due Date: {formatContractDate(milestone.due_date)}</span>
                              </div>
 
                              {/* Card Body - Expanded Details & Workflows */}
                              {isExpanded && (
                                <div className="px-4 pl-6 pb-4 pt-3 border-t border-border/30 bg-secondary/5 flex flex-col gap-3 text-xs">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Amount</span>
                                      <span className="font-bold text-foreground mt-0.5">{formatContractAmount(milestone.amount)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Deadline</span>
                                      <span className="font-semibold text-foreground mt-0.5">{formatContractDate(milestone.due_date)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Status</span>
                                      <span className="font-semibold text-foreground mt-0.5">
                                        {getMilestoneDisplayLabel(milestone)}
                                      </span>
                                    </div>
                                    {milestone.paid_at && (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Paid At</span>
                                        <span className="font-semibold text-emerald-500 mt-0.5">{formatContractDate(milestone.paid_at)}</span>
                                      </div>
                                    )}
                                  </div>
 
                                  {/* Status Workflow Controls */}
                                  {contract && contract.status === ContractStatus.Active && !isMilestoneReleasedToCap(milestone) && (
                                    <div className="p-3 bg-secondary/10 border border-border/20 rounded-lg text-left flex flex-col gap-2">
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Workflow:</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {isClient && milestone.status === MilestoneStatus.Pending && (
                                          <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => handleMilestoneWorkflowAction(milestone.id, 'start')}
                                            className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                          >
                                            <Clock size={10} />
                                            Start Work
                                          </button>
                                        )}
                                        {isFreelancer && milestone.status === MilestoneStatus.InProgress && (
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/contracts/${contractId}/deliverables/${milestone.id}`)}
                                            className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <CheckCircle2 size={10} />
                                            Submit Deliverables
                                          </button>
                                        )}
                                        {isClient && milestone.status === MilestoneStatus.Submitted && (
                                          <>
                                            <button
                                              type="button"
                                              disabled={isSubmitting}
                                              onClick={() => handleMilestoneWorkflowAction(milestone.id, 'approve')}
                                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                            >
                                              <CheckCircle2 size={10} />
                                              Approve
                                            </button>
                                            <button
                                              type="button"
                                              disabled={isSubmitting}
                                              onClick={() => handleMilestoneWorkflowAction(milestone.id, 'request-revision')}
                                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                            >
                                              <X size={10} />
                                              Request Revision
                                            </button>
                                          </>
                                        )}
                                        {isFreelancer && milestone.status === MilestoneStatus.Approved && (
                                          <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => handleMilestoneWorkflowAction(milestone.id, 'withdraw')}
                                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                          >
                                            <DollarSign size={10} />
                                            Withdraw
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {/* Actions panel */}
                                  <div className="flex gap-2 border-t border-border/10 pt-3 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditClick(milestone)}
                                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                      disabled={!canEditMilestones || !canEditMilestone(milestone.status)}
                                    >
                                      <Edit size={11} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMilestone(milestone.id)}
                                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                      disabled={!canEditMilestones || !canEditMilestone(milestone.status)}
                                    >
                                      <Trash2 size={11} />
                                      Delete
                                    </button>
                                  </div>
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
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 lg:h-full min-h-0 lg:overflow-y-auto pb-6 lg:pb-0 shrink-0">
              
              {/* Stacked KPI list in side panel */}
              <div className="glass-card p-5 flex flex-col gap-4 text-left">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest border-b border-border/20 pb-2">
                  Budget Summary
                </h3>

                <div className="flex flex-col gap-3">
                  {/* Total Budget */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-blue-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Total Budget</span>
                      <span className="text-lg font-black text-foreground mt-0.5 block">{formatContractAmount(contract?.totalBudget || 0)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <DollarSign size={15} />
                    </div>
                  </div>

                  {/* Allocated Budget */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-purple-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Allocated Budget</span>
                      <span className="text-lg font-black text-foreground mt-0.5 block">{formatContractAmount(totalMilestoneAmount)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                      <Layers size={15} />
                    </div>
                  </div>

                  {/* Remaining Budget */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-emerald-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Remaining Budget</span>
                      <span className={`text-lg font-black mt-0.5 block ${remainingBudget === 0 ? 'text-amber-500' : 'text-foreground'}`}>
                        {formatContractAmount(remainingBudget)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <ShieldAlert size={15} />
                    </div>
                  </div>

                  {/* Milestone Completion */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/20 hover:border-amber-500/20 transition-all">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Milestones Completion</span>
                      <span className="text-lg font-black text-foreground mt-0.5 block">
                        {completedMilestones} <span className="text-[10px] font-semibold text-muted-foreground">/ {milestones.length} paid</span>
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
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || milestones.length === 0 || !canEditMilestones}
                  className="w-full py-2.5 bg-secondary/40 hover:bg-secondary/60 border border-border/50 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={13} />
                  Save Draft Milestones
                </button>

                {mode === 'jobpost-setup' && (
                  <button
                    onClick={handleCompleteSetup}
                    disabled={isSubmitting || milestones.length === 0 || !canEditMilestones}
                    className="w-full py-2.5 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white border-none rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} />
                    Complete Draft Setup & Publish
                  </button>
                )}

                {mode === 'contract-edit' && (
                  <button
                    onClick={handleSubmitDetails}
                    disabled={isSubmitting || milestones.length === 0 || remainingBudget !== 0}
                    className="w-full py-2.5 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white border-none rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send size={13} />
                    Submit to Freelancer
                  </button>
                )}

                <button
                  onClick={() => navigate(`/contracts/${contractId}`)}
                  className="w-full py-2.5 bg-secondary/40 hover:bg-secondary/60 border border-border/50 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Eye size={13} />
                  View Contract Details
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
