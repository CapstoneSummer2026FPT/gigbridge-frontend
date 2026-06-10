import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Plus, Edit, Trash2, AlertCircle, CheckCircle2, Clock, DollarSign,
  Calendar, ChevronDown, Save, X, Eye, ArrowLeft, Layers, ShieldAlert,
  TrendingUp, ChevronRight
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
  }, [contractId]);

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

  return (
    <AppLayout>
      <div className="manage-milestones-wrapper max-w-[1400px] mx-auto relative px-4 md:px-8 py-10">
        
        {/* Glow decorative background elements */}
        <div className="absolute top-0 right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-[20%] left-[5%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-emerald-500/5 to-amber-500/5 blur-3xl -z-10 pointer-events-none" />

        {/* Header with back button */}
        <div className="manage-milestones-header flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="back-button shrink-0"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="header-content text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-500 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              <Layers size={12} />
              Milestones Planner
            </div>
            <h1 className="page-title text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">
              Manage Milestones
            </h1>
            {contract && (
              <p className="page-subtitle text-sm text-muted-foreground font-semibold mt-1">
                Contract Title: <span className="text-foreground">{contract.title}</span>
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="success-message bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} />
              <p className="font-semibold text-sm">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="p-1 text-emerald-500/60 hover:text-emerald-500 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="error-message bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="font-semibold text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 text-destructive/60 hover:text-destructive cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        {contract && (
          <>
            {/* Budget Overview KPI Summary Cards */}
            <div className="budget-overview grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="budget-stat group bg-card hover:bg-card/90 border border-border/50 hover:border-blue-500/30 rounded-2xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="stat-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Contract Budget</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/15 flex items-center justify-center shrink-0">
                    <DollarSign size={16} />
                  </div>
                </div>
                <span className="stat-value text-2xl font-black text-foreground mt-3">{formatContractAmount(contract.totalBudget)}</span>
              </div>

              <div className="budget-stat group bg-card hover:bg-card/90 border border-border/50 hover:border-purple-500/30 rounded-2xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="stat-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Allocated Budget</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/15 flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                </div>
                <span className="stat-value text-2xl font-black text-foreground mt-3">{formatContractAmount(totalMilestoneAmount)}</span>
              </div>

              <div className="budget-stat group bg-card hover:bg-card/90 border border-border/50 hover:border-emerald-500/30 rounded-2xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="stat-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Remaining Budget</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 flex items-center justify-center shrink-0">
                    <ShieldAlert size={16} />
                  </div>
                </div>
                <span className={`stat-value text-2xl font-black mt-3 ${remainingBudget === 0 ? 'text-amber-500' : 'text-foreground'}`}>
                  {formatContractAmount(remainingBudget)}
                </span>
              </div>

              <div className="budget-stat group bg-card hover:bg-card/90 border border-border/50 hover:border-amber-500/30 rounded-2xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="stat-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Milestones Completion</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/15 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <span className="stat-value text-2xl font-black text-foreground mt-3">
                  {completedMilestones} <span className="text-sm font-semibold text-muted-foreground">/ {milestones.length} paid</span>
                </span>
              </div>
            </div>

            {/* Create/Edit Form Overlay */}
            {showCreateForm && (
              <div className="milestone-form-container bg-card border border-border/60 rounded-2xl p-6 mb-8 shadow-md relative">
                <div className="form-header flex justify-between items-center pb-3 border-b border-border/40 mb-5">
                  <h3 className="form-title text-base font-bold text-foreground">
                    {editingId ? '✏️ Edit Milestone Details' : '➕ Create New Milestone'}
                  </h3>
                  <button
                    onClick={handleCancelForm}
                    className="form-close-btn p-1.5 bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-foreground/20 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmitForm} className="milestone-form flex flex-col gap-4">
                  <div className="form-group flex flex-col gap-1.5 text-left">
                    <label htmlFor="title" className="form-label text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Milestone Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter milestone title (e.g. Prototype Design draft)"
                      className="form-input w-full px-4 py-2.5 bg-secondary/30 focus:bg-card border border-border/50 focus:border-blue-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-foreground transition-all duration-200"
                      maxLength={255}
                    />
                    <div className="form-hint text-[10px] text-muted-foreground mt-1">
                      {formData.title.length}/255 characters (BR-54)
                    </div>
                  </div>

                  <div className="form-row grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group flex flex-col gap-1.5 text-left">
                      <label htmlFor="amount" className="form-label text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Amount (VND) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="form-input w-full px-4 py-2.5 bg-secondary/30 focus:bg-card border border-border/50 focus:border-blue-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-foreground transition-all duration-200"
                        min="0"
                      />
                      <div className="form-hint text-[10px] text-muted-foreground mt-1">
                        Max Allowed: {formatContractAmount(remainingBudget + (editingId ? milestones.find(m => m.id === editingId)?.amount || 0 : 0))}
                      </div>
                    </div>

                    <div className="form-group flex flex-col gap-1.5 text-left">
                      <label htmlFor="due_date" className="form-label text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="form-input w-full px-4 py-2.5 bg-secondary/30 focus:bg-card border border-border/50 focus:border-blue-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold text-foreground transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="form-actions flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-5 py-2.5 bg-secondary/60 hover:bg-secondary border border-border/50 text-foreground rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-small"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          {editingId ? 'Update' : 'Create'} Milestone
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Milestones List container with timeline track line */}
            <div className="milestones-section text-left">
              <div className="milestones-header flex justify-between items-center mb-6">
                <h2 className="milestones-title text-xl font-bold text-foreground">
                  Milestones Timeline ({milestones.length})
                </h2>
                <button
                  onClick={handleCreateClick}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                  disabled={showCreateForm}
                >
                  <Plus size={14} />
                  New Milestone
                </button>
              </div>

              {milestones.length === 0 ? (
                <div className="empty-state py-16 px-6 bg-card/30 border border-border/40 rounded-[2.5rem] border-dashed text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center mx-auto mb-4 border border-border/40">
                    <Clock size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No milestones planned</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                    Define structured payments & delivery items to track project achievements.
                  </p>
                </div>
              ) : (
                <div className="milestones-list relative flex flex-col gap-4">
                  {milestones.map((milestone, index) => {
                    const isExpanded = expandedMilestoneId === milestone.id;
                    const isCompleted = milestone.status === MilestoneStatus.Approved || milestone.status === MilestoneStatus.Paid;

                    return (
                      <div
                        key={milestone.id}
                        className={`milestone-card bg-card hover:bg-card/95 border border-border/55 hover:border-blue-500/20 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative flex flex-col ${isExpanded ? 'expanded' : ''}`}
                      >
                        {/* Timeline Status Indicator Line (on the left boundary) */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1.5" 
                          style={{ 
                            backgroundColor: isCompleted ? '#22C55E' : 
                              (milestone.status === MilestoneStatus.InProgress ? '#0077FF' : '#9F4BFF') 
                          }}
                        />

                        {/* Card Header Content */}
                        <div className="p-5 pl-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="milestone-info-primary flex items-center gap-4 min-w-0 flex-1">
                            <div className="milestone-number w-10 h-10 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center text-sm font-black text-foreground shrink-0">
                              #{index + 1}
                            </div>
                            <div className="min-w-0">
                              <h3 className="milestone-title text-base font-bold text-foreground truncate">{milestone.title}</h3>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`milestone-status-badge status-${milestone.status}`}>
                                  {milestone.status === MilestoneStatus.Pending || milestone.status === MilestoneStatus.NotStarted ? (
                                    <>
                                      <Clock size={12} className="text-amber-500 animate-pulse" />
                                      {getMilestoneStatusLabel(milestone.status)}
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={12} className="text-emerald-500" />
                                      {getMilestoneStatusLabel(milestone.status)}
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                            <div className="milestone-amount flex items-center gap-1 font-black text-foreground text-sm">
                              <DollarSign size={14} className="text-muted-foreground" />
                              {formatContractAmount(milestone.amount)}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMilestoneId(
                                  expandedMilestoneId === milestone.id ? null : milestone.id
                                )
                              }
                              className={`expand-btn p-2 bg-secondary/50 border border-border/50 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer ${isExpanded ? 'expanded' : ''}`}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Card Body - Collapsed (Due Date display only) */}
                        <div className="px-5 pl-7 pb-4 pt-0 border-t border-border/20 mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-semibold milestone-card-body-collapsed">
                          <Calendar size={13} />
                          <span>Due Date: {formatContractDate(milestone.due_date)}</span>
                        </div>

                        {/* Card Body - Expanded Details & Workflows */}
                        {isExpanded && (
                          <div className="px-5 pl-7 pb-5 pt-4 border-t border-border/40 bg-secondary/10 milestone-card-body-expanded flex flex-col gap-4">
                            <div className="milestone-details-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="detail-item flex flex-col">
                                <span className="detail-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Allocation Amount</span>
                                <span className="detail-value text-sm font-bold text-foreground mt-0.5">{formatContractAmount(milestone.amount)}</span>
                              </div>
                              <div className="detail-item flex flex-col">
                                <span className="detail-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Deadline</span>
                                <span className="detail-value text-sm font-semibold text-foreground mt-0.5">{formatContractDate(milestone.due_date)}</span>
                              </div>
                              <div className="detail-item flex flex-col">
                                <span className="detail-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Workflow Phase</span>
                                <span className="detail-value text-sm font-semibold text-foreground mt-0.5">
                                  {getMilestoneStatusLabel(milestone.status)}
                                </span>
                              </div>
                              {milestone.paid_at && (
                                <div className="detail-item flex flex-col">
                                  <span className="detail-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Paid Timestamp</span>
                                  <span className="detail-value text-sm font-semibold text-emerald-500 mt-0.5">{formatContractDate(milestone.paid_at)}</span>
                                </div>
                              )}
                            </div>

                            {/* Status Workflow Controls */}
                            {milestone.status !== MilestoneStatus.Paid && (
                              <div className="status-workflow p-4 bg-card border border-border/40 rounded-xl text-left flex flex-col gap-2.5">
                                <label className="workflow-label text-[10px] font-black text-muted-foreground uppercase tracking-wider">Update Phase Status:</label>
                                <div className="workflow-buttons flex flex-wrap gap-2">
                                  {(milestone.status === MilestoneStatus.NotStarted || milestone.status === MilestoneStatus.Pending) && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(milestone.id, MilestoneStatus.InProgress)}
                                      className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-500 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Clock size={12} />
                                      Start Work
                                    </button>
                                  )}
                                  {milestone.status === MilestoneStatus.InProgress && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(milestone.id, MilestoneStatus.SubmittedForReview)}
                                      className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-500 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 size={12} />
                                      Submit for Review
                                    </button>
                                  )}
                                  {milestone.status === MilestoneStatus.SubmittedForReview && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(milestone.id, MilestoneStatus.Approved)}
                                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 size={12} />
                                      Approve
                                    </button>
                                  )}
                                  {milestone.status === MilestoneStatus.Approved && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(milestone.id, MilestoneStatus.Paid)}
                                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 size={12} />
                                      Mark as Paid
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Actions panel */}
                            <div className="milestone-actions flex gap-2 border-t border-border/20 pt-4 mt-1">
                              <button
                                type="button"
                                onClick={() => handleEditClick(milestone)}
                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                                disabled={!canEditMilestone(milestone.status)}
                              >
                                <Edit size={13} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMilestone(milestone.id)}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                                disabled={!canEditMilestone(milestone.status)}
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions button */}
            <div className="page-actions mt-8 flex justify-start">
              <button
                onClick={() => navigate(`/contracts/${contractId}`)}
                className="px-4 py-2.5 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <Eye size={14} />
                View Contract Details
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};
