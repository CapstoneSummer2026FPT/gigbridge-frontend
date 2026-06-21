import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  Plus, Edit, Trash2, AlertCircle, CheckCircle2, Clock, DollarSign,
  Calendar, ChevronDown, Save, X, Eye, ArrowLeft, Layers, ShieldAlert,
  TrendingUp
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import { canEditMilestone, getMilestoneStatusLabel, formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
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

  const stateContract = location.state?.contractForm;

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

  // Load contract and milestones
  useEffect(() => {
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
        const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
        const loadedContract = contractResponse.success && contractResponse.data ? contractResponse.data : mockContract;

        if (!loadedContract) {
          throw new Error('Failed to load contract');
        }

        setContract(loadedContract);

        // Fetch milestones
        const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
        if (milestonesResponse.success && milestonesResponse.data) {
          setMilestones(milestonesResponse.data);
        } else if (mockContract?.milestones) {
          setMilestones(mockContract.milestones);
        }
      } catch (err) {
        const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
        if (mockContract) {
          setContract(mockContract);
          setMilestones(mockContract.milestones);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

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
      return 'MSG41: Milestone amount must be greater than 0 and within the remaining budget';
    }

    const budgetUsedByOtherMilestones = milestones
      .filter(m => m.id !== editingId)
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const maxAllowed = (contract?.totalBudget || 0) - budgetUsedByOtherMilestones;
    if (data.amount > maxAllowed) {
      return `MSG41: Milestone amount exceeds remaining budget of ${formatContractAmount(maxAllowed)} (BR-53)`;
    }

    if (!data.due_date) {
      return 'Due date is required';
    }

    const dueDate = new Date(data.due_date);
    const today = new Date();
    if (dueDate <= today) {
      return 'MSG38: Deadline must be a future date';
    }

    return null;
  };

  const handleCreateClick = () => {
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

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      let operationSucceeded = false;

      if (editingId) {
        // Update existing milestone
        const response = await contractPutAPI.updateMilestone(editingId, {
          id: editingId,
          contract_id: contractId!,
          title: formData.title,
          amount: formData.amount,
          due_date: formData.due_date,
          status: milestones.find(m => m.id === editingId)?.status || MilestoneStatus.Pending,
          paid_at: milestones.find(m => m.id === editingId)?.paid_at || null,
        });

        if (response.success) {
          setMilestones(prev =>
            prev.map(m =>
              m.id === editingId ? response.data! : m
            )
          );
          setSuccessMessage('Milestone updated successfully');
          operationSucceeded = true;
        } else {
          setMilestones(prev =>
            prev.map(m =>
              m.id === editingId
                ? { ...m, title: formData.title.trim(), amount: formData.amount, due_date: formData.due_date }
                : m
            )
          );
          setSuccessMessage('Milestone updated in mock data');
          operationSucceeded = true;
        }
      } else {
        const nextMilestone: Milestone = {
          id: `milestone_mock_${Date.now()}`,
          contract_id: contractId!,
          title: formData.title.trim(),
          amount: formData.amount,
          due_date: formData.due_date,
          status: MilestoneStatus.NotStarted,
          paid_at: null,
        };

        setMilestones(prev => [...prev, nextMilestone]);
        setSuccessMessage('Milestone created successfully');
        operationSucceeded = true;
      }

      if (operationSucceeded) {
        handleCancelForm();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) {
      return;
    }

    try {
      setError(null);
      setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      setSuccessMessage('Milestone deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete milestone');
    }
  };

  const handleStatusChange = async (milestoneId: string, newStatus: number) => {
    try {
      setError(null);
      const response = await contractPutAPI.updateMilestoneStatus(milestoneId, newStatus);

      if (response.success) {
        setMilestones(prev =>
          prev.map(m =>
            m.id === milestoneId ? response.data! : m
          )
        );
        setSuccessMessage('Milestone status updated');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setMilestones(prev =>
          prev.map(m =>
            m.id === milestoneId ? { ...m, status: newStatus as MilestoneStatus } : m
          )
        );
        setSuccessMessage('Milestone status updated in mock data');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setMilestones(prev =>
        prev.map(m =>
          m.id === milestoneId ? { ...m, status: newStatus as MilestoneStatus } : m
        )
      );
      setSuccessMessage('Milestone status updated in mock data');
      setTimeout(() => setSuccessMessage(null), 3000);
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
  const completedMilestones = milestones.filter(m => m.status === MilestoneStatus.Approved || m.status === MilestoneStatus.Paid).length;

  const getNodeGlowClass = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.Paid:
        return 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] text-white';
      case MilestoneStatus.Approved:
        return 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)] text-emerald-500';
      case MilestoneStatus.SubmittedForReview:
        return 'bg-purple-500/10 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.25)] text-purple-500';
      case MilestoneStatus.InProgress:
        return 'bg-blue-500/10 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.25)] text-blue-500 animate-pulse';
      case MilestoneStatus.RevisionRequired:
        return 'bg-red-500/10 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.25)] text-red-500 animate-bounce';
      case MilestoneStatus.Pending:
      case MilestoneStatus.NotStarted:
      default:
        return 'bg-secondary border-border/80 dark:border-border-strong/60 shadow-sm text-text-muted';
    }
  };

  const getNodeIcon = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.Paid:
        return <CheckCircle2 size={10} strokeWidth={3} className="text-white" />;
      case MilestoneStatus.Approved:
        return <CheckCircle2 size={10} strokeWidth={2.5} className="text-emerald-500" />;
      case MilestoneStatus.SubmittedForReview:
        return <Layers size={10} className="text-purple-500" />;
      case MilestoneStatus.InProgress:
        return <Clock size={10} className="text-blue-500" />;
      case MilestoneStatus.RevisionRequired:
        return <AlertCircle size={10} className="text-red-500" />;
      case MilestoneStatus.Pending:
      case MilestoneStatus.NotStarted:
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
                    disabled={showCreateForm}
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
                        const isCompleted = milestone.status === MilestoneStatus.Approved || milestone.status === MilestoneStatus.Paid;

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
                                        {milestone.status === MilestoneStatus.Pending || milestone.status === MilestoneStatus.NotStarted ? (
                                          <>
                                            <Clock size={10} className="text-amber-500 animate-pulse" />
                                            {getMilestoneStatusLabel(milestone.status)}
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle2 size={10} className="text-emerald-500" />
                                            {getMilestoneStatusLabel(milestone.status)}
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
                                        {getMilestoneStatusLabel(milestone.status)}
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
                                  {milestone.status !== MilestoneStatus.Paid && (
                                    <div className="p-3 bg-secondary/10 border border-border/20 rounded-lg text-left flex flex-col gap-2">
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Update Status:</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(milestone.status === MilestoneStatus.NotStarted || milestone.status === MilestoneStatus.Pending) && (
                                          <button
                                            type="button"
                                            onClick={() => handleStatusChange(milestone.id, MilestoneStatus.InProgress)}
                                            className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <Clock size={10} />
                                            Start Work
                                          </button>
                                        )}
                                        {milestone.status === MilestoneStatus.InProgress && (
                                          <button
                                            type="button"
                                            onClick={() => handleStatusChange(milestone.id, MilestoneStatus.SubmittedForReview)}
                                            className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <CheckCircle2 size={10} />
                                            Submit Review
                                          </button>
                                        )}
                                        {milestone.status === MilestoneStatus.SubmittedForReview && (
                                          <button
                                            type="button"
                                            onClick={() => handleStatusChange(milestone.id, MilestoneStatus.Approved)}
                                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <CheckCircle2 size={10} />
                                            Approve
                                          </button>
                                        )}
                                        {milestone.status === MilestoneStatus.Approved && (
                                          <button
                                            type="button"
                                            onClick={() => handleStatusChange(milestone.id, MilestoneStatus.Paid)}
                                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <CheckCircle2 size={10} />
                                            Mark Paid
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
                                      disabled={!canEditMilestone(milestone.status)}
                                    >
                                      <Edit size={11} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMilestone(milestone.id)}
                                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                      disabled={!canEditMilestone(milestone.status)}
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
                        {completedMilestones} <span className="text-[10px] font-semibold text-muted-foreground">/ {milestones.length} approved</span>
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
